import hmac
import logging
import os
import uuid
from datetime import timedelta
from decimal import ROUND_CEILING
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle

from django.db import transaction
from django.db.models import Prefetch
from django.http import HttpResponse
from django.utils import timezone

from .models import Order, OrderItem, Payment
from apps.core.invoice import generate_order_invoice_pdf
from .serializers import (
    OrderCreateSerializer,
    OrderListSerializer,
    OrderStatusUpdateSerializer,
    PaymentSerializer
)
from .services.bamboo_pay import get_bamboo_service, BambooPayError
from .services.payment_finalizer import apply_bamboo_result

logger = logging.getLogger('bamboo_pay')


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des commandes
    
    Actions:
    - list: GET /api/orders/ - Historique des commandes
    - retrieve: GET /api/orders/{id}/ - Détail d'une commande
    - create: POST /api/orders/ - Créer une commande
    """
    
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    # Pas de PUT ni de DELETE : un client ne doit jamais pouvoir réécrire
    # ou supprimer une commande. Le PATCH (statut) est réservé aux admins.
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    
    def get_queryset(self):
        items_prefetch = Prefetch(
            'items',
            queryset=OrderItem.objects.select_related('book__category', 'book__author')
        )
        qs = Order.objects.select_related('user').prefetch_related(items_prefetch).order_by('-created_at')
        # Admin voit toutes les commandes, utilisateur voit les siennes
        if self.request.user.is_staff:
            return qs
        return qs.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        if self.action == 'partial_update':
            return OrderStatusUpdateSerializer
        return OrderListSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        
        response_serializer = OrderListSerializer(order, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    # Transitions d'etat autorisees pour les commandes
    VALID_TRANSITIONS = {
        'PENDING': ['PAID', 'CANCELLED'],
        'PAID': ['SHIPPED', 'CANCELLED'],
        'SHIPPED': [],  # Etat final
        'CANCELLED': [],  # Etat final
    }

    def partial_update(self, request, *args, **kwargs):
        """Mise à jour du statut (admin uniquement). Retourne la commande complète."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Seuls les administrateurs peuvent modifier le statut.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance = self.get_object()
        old_status = instance.status
        new_status = request.data.get('status')

        if new_status and new_status != old_status:
            allowed = self.VALID_TRANSITIONS.get(old_status, [])
            if new_status not in allowed:
                return Response(
                    {'error': f'Transition {old_status} -> {new_status} non autorisee. '
                              f'Transitions possibles : {", ".join(allowed) or "aucune (etat final)"}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        new_status = instance.status
        if old_status == 'PENDING' and new_status == 'CANCELLED':
            instance.release_coupon()
        if old_status != new_status:
            try:
                from apps.core.email import send_order_shipped, send_order_paid, send_order_cancelled, send_order_status_changed
                if new_status == 'SHIPPED':
                    send_order_shipped(instance)
                elif new_status == 'PAID':
                    send_order_paid(instance)
                elif new_status == 'CANCELLED':
                    send_order_cancelled(instance)
                else:
                    send_order_status_changed(instance, old_status, new_status)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"[EMAIL] Echec notification statut commande #{instance.id}: {e}", exc_info=True)
        response_serializer = OrderListSerializer(instance, context={'request': request})
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_order(self, request, pk=None):
        """
        Endpoint: POST /api/orders/{id}/cancel/
        Annuler une commande (uniquement si PENDING)
        """
        order = self.get_object()

        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=order.pk)
            if order.status != 'PENDING':
                return Response(
                    {'error': 'Seules les commandes en attente peuvent être annulées.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Un paiement Mobile Money en cours peut encore être validé par le client :
            # annuler maintenant risquerait de faire payer une commande annulée.
            active_cutoff = timezone.now() - timedelta(minutes=10)
            if order.payments.filter(status='PENDING', created_at__gte=active_cutoff).exists():
                return Response(
                    {'error': "Un paiement est en cours pour cette commande. "
                              "Patientez quelques minutes avant de l'annuler."},
                    status=status.HTTP_409_CONFLICT
                )
            order.payments.filter(status='PENDING').update(
                status='EXPIRED', finalized_at=timezone.now()
            )
            order.status = 'CANCELLED'
            order.save()
            order.release_coupon()

        try:
            from apps.core.email import send_order_cancelled, send_order_cancelled_admin
            send_order_cancelled(order)
            send_order_cancelled_admin(order)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"[EMAIL] Echec notification annulation commande #{order.id}: {e}", exc_info=True)

        serializer = OrderListSerializer(order, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='invoice')
    def download_invoice(self, request, pk=None):
        """
        GET /api/orders/{id}/invoice/
        Télécharge la facture PDF de la commande (authentifié, ses commandes uniquement).
        """
        order = self.get_object()
        pdf_buffer = generate_order_invoice_pdf(order)
        filename = f"facture-commande-{order.id:06d}.pdf"
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Consultation des paiements de l'utilisateur (lecture seule).

    Les paiements sont créés exclusivement par /api/payments/initiate/ et
    finalisés à partir de la réponse serveur de Bamboo Pay. Permettre au client
    de créer un paiement lui permettrait de se déclarer « payé ».

    Actions:
    - list: GET /api/payments/
    - retrieve: GET /api/payments/{id}/
    """

    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return Payment.objects.filter(order__user=self.request.user).select_related('order')


# =============================================
#  BAMBOO PAY — Paiement Mobile Money
# =============================================

class PaymentCheckStatusThrottle(UserRateThrottle):
    # Le polling client = 1 req/5s = 12/min exact.
    # La fenetre glissante DRF peut throttler a 12/min.
    # 20/min donne une marge confortable sans risquer d'abus.
    rate = '20/min'


class PaymentInitiateView(APIView):
    """POST /api/payments/initiate/ — Initie un paiement Bamboo Pay."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        operator = request.data.get('operator')  # moov_money | airtel_money
        phone = request.data.get('phone')

        # Validation
        if not all([order_id, operator, phone]):
            return Response(
                {'error': 'order_id, operator et phone sont requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if operator not in ('moov_money', 'airtel_money'):
            return Response(
                {'error': "operator doit etre 'moov_money' ou 'airtel_money'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validation du numero de telephone
        phone_digits = ''.join(c for c in phone if c.isdigit())
        if len(phone_digits) < 8 or len(phone_digits) > 9:
            return Response(
                {'error': 'Le numéro de téléphone doit comporter 8 ou 9 chiffres.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(phone_digits) == 8:
            phone_digits = '0' + phone_digits
        if not phone_digits[0] == '0':
            return Response(
                {'error': 'Le numéro de téléphone doit commencer par 0.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        phone = phone_digits

        # Verrou sur la commande : deux clics simultanés ne doivent pas
        # déclencher deux demandes de paiement (double push USSD).
        with transaction.atomic():
            try:
                order = Order.objects.select_for_update().get(id=order_id, user=request.user)
            except (Order.DoesNotExist, ValueError, TypeError):
                return Response(
                    {'error': 'Commande introuvable.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            return self._initiate_locked(request, order, operator, phone)

    def _initiate_locked(self, request, order, operator, phone):
        if order.status != 'PENDING':
            return Response(
                {'error': 'Cette commande ne peut plus etre payee.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si la commande est deja payee, refuser
        if order.payments.filter(status='SUCCESS').exists():
            return Response(
                {'error': 'Cette commande a déjà été payée.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si un paiement PENDING existe, verifier s'il est expire ou reutilisable
        current_payment = order.payments.filter(status='PENDING').order_by('-created_at').first()
        if current_payment:
            if current_payment.created_at < timezone.now() - timedelta(minutes=10):
                current_payment.status = 'EXPIRED'
                current_payment.finalized_at = timezone.now()
                current_payment.save()
                logger.info("payment.auto_expired_on_retry ref=%s", current_payment.transaction_id)
            else:
                # Reutiliser le paiement pending actif
                return Response({
                    'bamboo_ref': current_payment.transaction_id,
                    'status': 'PENDING',
                    'message': 'Paiement déjà initié. Vérifiez votre téléphone.',
                })

        # Montant entier en FCFA, arrondi au supérieur pour ne jamais sous-facturer
        amount = int(order.total_amount.to_integral_value(rounding=ROUND_CEILING))

        # Appeler Bamboo Pay
        try:
            service = get_bamboo_service()
            reference = f"TN-{order.id}-{uuid.uuid4().hex[:8]}"
            payer_name = request.user.get_full_name() or request.user.username

            result = service.initiate_instant_payment(
                phone=phone,
                amount=amount,
                payer_name=payer_name,
                reference=reference,
                operator=operator,
            )

            # Creer le Payment en DB
            bamboo_ref = result.get('reference_bp', reference)
            provider = Payment.BAMBOO_OPERATOR_MAP.get(operator, 'MOBICASH')

            Payment.objects.create(
                order=order,
                transaction_id=bamboo_ref,
                provider=provider,
                status='PENDING',
                amount=order.total_amount,
                phone_number=phone,
                bamboo_response={**result, 'reference': reference},
            )

            logger.info(
                "payment.created order=%d ref=%s provider=%s amount=%s",
                order.id, bamboo_ref, provider, order.total_amount
            )

            return Response({
                'bamboo_ref': bamboo_ref,
                'merchant_ref': reference,
                'status': 'PENDING',
                'message': 'Paiement initie. Validez sur votre telephone.',
            }, status=status.HTTP_202_ACCEPTED)

        except (BambooPayError, RuntimeError) as e:
            logger.error("payment.initiate_failed order=%d err=%s", order.id, str(e))
            return Response(
                {'error': 'Le service de paiement est temporairement indisponible. Veuillez réessayer dans quelques instants.'},
                status=status.HTTP_502_BAD_GATEWAY
            )


class PaymentCheckStatusView(APIView):
    """POST /api/payments/check-status/<bamboo_ref>/ — Verifie le statut."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [PaymentCheckStatusThrottle]

    def post(self, request, bamboo_ref):
        # Trouver le payment
        try:
            payment = Payment.objects.select_related('order').get(
                transaction_id=bamboo_ref,
                order__user=request.user
            )
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Paiement introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Auto-expiration : PENDING > 10 minutes
        EXPIRATION_DELAY = timedelta(minutes=10)
        if payment.status == 'PENDING' and \
           payment.created_at < timezone.now() - EXPIRATION_DELAY:
            Payment.objects.filter(pk=payment.pk, status='PENDING').update(
                status='EXPIRED', finalized_at=timezone.now()
            )
            payment.refresh_from_db()
            logger.info(
                "payment.auto_expired ref=%s age=%s",
                bamboo_ref, timezone.now() - payment.created_at
            )
            return Response({
                'bamboo_ref': payment.transaction_id,
                'status': 'EXPIRED',
                'finalized_at': payment.finalized_at,
                'message': 'Paiement expiré après 10 minutes sans confirmation.',
            })

        # Idempotence : si deja final, retourner sans re-appeler Bamboo
        if payment.is_final:
            return Response({
                'bamboo_ref': payment.transaction_id,
                'status': payment.status,
                'finalized_at': payment.finalized_at,
            })

        # Appeler Bamboo Pay check-status
        try:
            service = get_bamboo_service()
            result = service.check_status(bamboo_ref)

            # Handle transaction not found at Bamboo
            if result.get('code') == 404 or not result.get('transaction'):
                logger.error("bamboo.transaction_not_found ref=%s", bamboo_ref)
                return Response(
                    {'error': 'Transaction introuvable côté Bamboo Pay.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            payment = apply_bamboo_result(payment.pk, result, source='check_status')

            return Response({
                'bamboo_ref': payment.transaction_id,
                'status': payment.status,
                'finalized_at': payment.finalized_at,
            })

        except BambooPayError as e:
            logger.warning(
                "payment.check_temporary_error ref=%s err=%s — returning PENDING",
                bamboo_ref, str(e)
            )
            return Response({
                'bamboo_ref': bamboo_ref,
                'status': 'PENDING',
                'message': 'Verification temporairement indisponible, nouvelle tentative en cours.',
            })


def _webhook_token_is_valid(request):
    """
    Vérifie le jeton secret du webhook si BAMBOO_WEBHOOK_SECRET est défini.
    Le jeton est ajouté automatiquement à l'URL de callback envoyée à Bamboo.
    """
    secret = os.environ.get('BAMBOO_WEBHOOK_SECRET', '')
    if not secret:
        return True
    provided = request.query_params.get('token', '')
    return hmac.compare_digest(provided.encode(), secret.encode())


class PaymentWebhookView(APIView):
    """POST /api/payments/webhook/ — Notification asynchrone Bamboo Pay.

    Bamboo Pay appelle cette URL quand le statut d'une transaction change.
    Pas d'auth utilisateur (Bamboo appelle directement) : le corps de la requête
    n'est donc PAS digne de confiance. Il sert uniquement à identifier le
    paiement ; le statut réel est toujours revérifié auprès de l'API Bamboo.
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        if not _webhook_token_is_valid(request):
            logger.warning("webhook.invalid_token ip=%s", request.META.get('REMOTE_ADDR'))
            return Response({'error': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data if hasattr(request.data, 'get') else {}
        reference = data.get('reference_bp') or data.get('reference') or data.get('billingId')
        logger.info("webhook.received ref=%s claimed_status=%s", reference, data.get('status'))

        if not reference:
            logger.warning("webhook.invalid_payload keys=%s", list(data.keys()))
            return Response({'error': 'reference manquante'}, status=status.HTTP_400_BAD_REQUEST)

        reference = str(reference)
        payment = (
            Payment.objects.filter(transaction_id=reference).first()
            or Payment.objects.filter(bamboo_response__reference=reference).first()
        )
        if payment is None:
            logger.warning("webhook.payment_not_found ref=%s", reference)
            return Response({'error': 'payment introuvable'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status in ('SUCCESS', 'FAILED'):
            return Response({'status': 'already_processed'})

        try:
            result = get_bamboo_service().check_status(payment.transaction_id)
        except (BambooPayError, RuntimeError) as e:
            # La réconciliation (reconcile_payments) rattrapera ce paiement.
            logger.warning("webhook.verification_failed ref=%s err=%s", reference, e)
            return Response(
                {'status': 'verification_deferred'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        payment = apply_bamboo_result(payment.pk, result, source='webhook')
        return Response({'status': payment.status.lower()})
