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

from django.conf import settings
from django.db import transaction
from django.db.models import Prefetch
from django.http import HttpResponse
from django.utils import timezone

from .models import Order, OrderItem, Payment, PaymentNotification
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

# Un paiement non confirmé après ce délai est considéré expiré.
# La page BambooPay laisse plus de temps au client pour saisir ses informations.
PAYMENT_EXPIRATION_DELAY = timedelta(minutes=10)
REDIRECT_PAYMENT_EXPIRATION_DELAY = timedelta(minutes=30)
# Intervalle minimal entre deux appels à /check-status pour un même paiement :
# la doc Bamboo demande de ne pas l'appeler en boucle (il peut déclencher un SMS).
BAMBOO_CHECK_MIN_INTERVAL = timedelta(seconds=20)


def payment_expiration_delay(payment):
    if payment.provider == 'BAMBOOPAY':
        return REDIRECT_PAYMENT_EXPIRATION_DELAY
    return PAYMENT_EXPIRATION_DELAY


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
    
    def get_throttles(self):
        # Création de commandes limitée par compte (empêche de bloquer un code
        # promo à usage limité en multipliant les commandes non payées)
        if self.action == 'create':
            return [OrderCreateThrottle()]
        return super().get_throttles()

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

class OrderCreateThrottle(UserRateThrottle):
    scope = 'order_create'
    rate = '20/hour'


class PaymentCheckStatusThrottle(UserRateThrottle):
    # Le polling client = 1 req/5s = 12/min exact.
    # La fenetre glissante DRF peut throttler a 12/min.
    # 20/min donne une marge confortable sans risquer d'abus.
    rate = '20/min'


# Préfixes mobiles gabonais (numéros à 9 chiffres commençant par 0)
OPERATOR_PREFIXES = {
    'airtel_money': ('07',),
    'moov_money': ('06',),
}
OPERATOR_LABELS = {'airtel_money': 'Airtel Money', 'moov_money': 'Moov Money'}


def normalize_gabon_phone(raw_phone, operator):
    """
    Normalise un numéro gabonais au format local à 9 chiffres (0XXXXXXXX).
    Accepte « +241 74 30 16 39 », « 24174301639 », « 74301639 », « 074301639 ».
    Retourne (numéro, message_erreur).
    """
    digits = ''.join(c for c in str(raw_phone) if c.isdigit())
    if digits.startswith('00241'):
        digits = digits[5:]
    elif digits.startswith('241') and len(digits) > 9:
        digits = digits[3:]
    if len(digits) == 8:
        digits = '0' + digits
    if len(digits) != 9 or not digits.startswith('0'):
        return None, 'Numéro invalide : saisissez un numéro gabonais à 8 ou 9 chiffres (ex. 07 XX XX XX).'
    prefixes = OPERATOR_PREFIXES.get(operator, ())
    if prefixes and not digits.startswith(prefixes):
        other = 'airtel_money' if operator == 'moov_money' else 'moov_money'
        return None, (
            f"Ce numéro ne correspond pas à {OPERATOR_LABELS[operator]} "
            f"(numéros en {' / '.join(p + 'X' for p in prefixes)}). "
            f"Choisissez {OPERATOR_LABELS[other]} ou un autre numéro."
        )
    return digits, None


class PaymentInitiateView(APIView):
    """POST /api/payments/initiate/ — Initie un paiement Bamboo Pay."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        operator = request.data.get('operator')  # moov_money | airtel_money | bamboopay
        phone = request.data.get('phone')

        # Validation
        if not all([order_id, operator, phone]):
            return Response(
                {'error': 'Informations de paiement incomplètes : commande, moyen de paiement et numéro sont requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if operator not in ('moov_money', 'airtel_money', 'bamboopay'):
            return Response(
                {'error': "Moyen de paiement invalide : choisissez Airtel Money, Moov Money ou BambooPay."},
                status=status.HTTP_400_BAD_REQUEST
            )

        phone, phone_error = normalize_gabon_phone(phone, operator)
        if phone_error:
            return Response({'error': phone_error}, status=status.HTTP_400_BAD_REQUEST)

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
                {'error': 'Cette commande ne peut plus être payée.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si la commande est deja payee, refuser
        if order.payments.filter(status='SUCCESS').exists():
            return Response(
                {'error': 'Cette commande a déjà été payée.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        provider = Payment.BAMBOO_OPERATOR_MAP[operator]

        # Un paiement PENDING existe : le réutiliser s'il est encore actif et du même
        # mode, sinon l'expirer (délai dépassé ou changement de moyen de paiement).
        current_payment = order.payments.filter(status='PENDING').order_by('-created_at').first()
        if current_payment:
            still_active = current_payment.created_at >= timezone.now() - payment_expiration_delay(current_payment)
            if still_active and current_payment.provider == provider:
                response = {
                    'bamboo_ref': current_payment.transaction_id,
                    'status': 'PENDING',
                    'message': 'Paiement déjà initié. Vérifiez votre téléphone.',
                }
                redirect_url = (current_payment.bamboo_response or {}).get('redirect_url')
                if redirect_url:
                    response['redirect_url'] = redirect_url
                    response['message'] = 'Paiement déjà initié. Poursuivez sur la page BambooPay.'
                return Response(response)
            current_payment.status = 'EXPIRED'
            current_payment.finalized_at = timezone.now()
            current_payment.save()
            logger.info("payment.expired_on_retry ref=%s", current_payment.transaction_id)

        # Montant entier en FCFA, arrondi au supérieur pour ne jamais sous-facturer
        amount = int(order.total_amount.to_integral_value(rounding=ROUND_CEILING))
        reference = f"TN-{order.id}-{uuid.uuid4().hex[:8]}"
        payer_name = request.user.get_full_name() or request.user.username

        try:
            service = get_bamboo_service()
            if operator == 'bamboopay':
                # Mode A : redirection vers la page de paiement BambooPay.
                # BambooPay ajoutera « /?status=...&ref=... » : URL sans paramètres.
                frontend_url = settings.FRONTEND_URL.rstrip('/')
                result = service.initiate_redirect_payment(
                    phone=phone,
                    amount=amount,
                    payer_name=payer_name,
                    billing_id=reference,
                    matricule=f"TNE-{request.user.id}",
                    return_url=f"{frontend_url}/checkout/paiement/{reference}",
                )
                # La référence BambooPay n'est connue qu'au retour : on suit le
                # paiement avec notre billingId (accepté par check-status).
                bamboo_ref = reference
            else:
                # Mode B : paiement instantané (validation sur le téléphone)
                result = service.initiate_instant_payment(
                    phone=phone,
                    amount=amount,
                    payer_name=payer_name,
                    reference=reference,
                    operator=operator,
                )
                bamboo_ref = result.get('reference_bp') or reference

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

            response = {
                'bamboo_ref': bamboo_ref,
                'merchant_ref': reference,
                'status': 'PENDING',
                'message': 'Paiement initié. Validez la demande sur votre téléphone.',
            }
            if operator == 'bamboopay':
                response['redirect_url'] = result['redirect_url']
                response['message'] = 'Redirection vers la page de paiement BambooPay.'
            return Response(response, status=status.HTTP_202_ACCEPTED)

        except (BambooPayError, RuntimeError) as e:
            logger.error("payment.initiate_failed order=%d provider=%s err=%s", order.id, provider, str(e))
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

        # Idempotence : si deja final, retourner sans re-appeler Bamboo
        if payment.is_final:
            return Response({
                'bamboo_ref': payment.transaction_id,
                'status': payment.status,
                'finalized_at': payment.finalized_at,
            })

        now = timezone.now()
        expired_locally = payment.created_at < now - payment_expiration_delay(payment)

        # Le client interroge cette vue toutes les 5 s : on ne relaie à Bamboo qu'au
        # plus une fois toutes les 20 s (le callback met à jour le statut entre-temps).
        # Avant d'expirer, Bamboo est toujours interrogé.
        recently_checked = (
            payment.last_checked_at is not None
            and payment.last_checked_at > now - BAMBOO_CHECK_MIN_INTERVAL
        )
        if recently_checked and not expired_locally:
            return Response({
                'bamboo_ref': payment.transaction_id,
                'status': payment.status,
                'finalized_at': payment.finalized_at,
            })
        Payment.objects.filter(pk=payment.pk).update(last_checked_at=now)

        # Interroger Bamboo avant de conclure : un client peut valider
        # le paiement sur son téléphone juste avant l'expiration.
        try:
            service = get_bamboo_service()
            result = service.check_status(bamboo_ref)

            if result.get('code') == 404 or not result.get('transaction'):
                # Juste après l'initiation, Bamboo peut ne pas encore connaître la
                # transaction : ce n'est pas un échec, on continue d'attendre.
                logger.info("bamboo.transaction_not_found_yet ref=%s", bamboo_ref)
            else:
                payment = apply_bamboo_result(payment.pk, result, source='check_status')
        except BambooPayError as e:
            logger.warning(
                "payment.check_temporary_error ref=%s err=%s — returning PENDING",
                bamboo_ref, str(e)
            )
            if not expired_locally:
                return Response({
                    'bamboo_ref': bamboo_ref,
                    'status': 'PENDING',
                    'message': 'Verification temporairement indisponible, nouvelle tentative en cours.',
                })

        # Auto-expiration : toujours PENDING chez Bamboo après 10 minutes
        if payment.status == 'PENDING' and expired_locally:
            Payment.objects.filter(pk=payment.pk, status='PENDING').update(
                status='EXPIRED', finalized_at=timezone.now()
            )
            payment.refresh_from_db()
            logger.info("payment.auto_expired ref=%s", bamboo_ref)
            if payment.status == 'EXPIRED':
                minutes = int(payment_expiration_delay(payment).total_seconds() // 60)
                return Response({
                    'bamboo_ref': payment.transaction_id,
                    'status': 'EXPIRED',
                    'finalized_at': payment.finalized_at,
                    'message': f'Paiement expiré après {minutes} minutes sans confirmation.',
                })

        return Response({
            'bamboo_ref': payment.transaction_id,
            'status': payment.status,
            'finalized_at': payment.finalized_at,
        })


def _webhook_token_is_valid(request):
    """
    Vérifie le jeton secret du webhook (BAMBOO_WEBHOOK_SECRET, obligatoire en production).
    Le jeton est ajouté automatiquement à l'URL de callback envoyée à Bamboo.
    """
    secret = os.environ.get('BAMBOO_WEBHOOK_SECRET', '')
    if not secret:
        # En production, un webhook sans secret configuré est refusé (fail closed) :
        # sinon n'importe qui pourrait l'appeler. Ouvert uniquement en développement.
        if settings.DEBUG:
            return True
        logger.error("payment.webhook_refused reason=BAMBOO_WEBHOOK_SECRET_absent")
        return False
    provided = request.query_params.get('token', '')
    return hmac.compare_digest(provided.encode(), secret.encode())


class PaymentWebhookView(APIView):
    """POST /api/payments/webhook/ — Notification asynchrone Bamboo Pay (callback).

    Bamboo Pay appelle cette URL quand le statut d'une transaction change, pour
    le paiement instantané (callback_url) comme pour la redirection (update_status_url).
    Corps reçu : billingId (réf. BambooPay), reference (réf. marchand), amount,
    status (completed|failed), idempotency_key, etc.

    Pas d'auth utilisateur (Bamboo appelle directement) : le corps n'est PAS digne
    de confiance. Il sert à identifier le paiement ; le statut réel est revérifié
    auprès de l'API Bamboo. Chaque idempotency_key n'est traitée qu'une fois.
    """
    permission_classes = []
    authentication_classes = []  # vue API : pas de session, donc pas de CSRF

    def post(self, request):
        if not _webhook_token_is_valid(request):
            logger.warning("webhook.invalid_token ip=%s", request.META.get('REMOTE_ADDR'))
            return Response({'error': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data if hasattr(request.data, 'get') else {}
        candidates = [
            str(v) for v in (
                data.get('billingId'), data.get('reference_bp'), data.get('reference'),
            ) if v
        ]
        idempotency_key = str(data.get('idempotency_key') or '')[:255]
        logger.info(
            "webhook.received refs=%s claimed_status=%s key=%s",
            candidates, data.get('status'), idempotency_key or '-',
        )

        if not candidates:
            logger.warning("webhook.invalid_payload keys=%s", list(data.keys()))
            return Response({'error': 'reference manquante'}, status=status.HTTP_400_BAD_REQUEST)

        if idempotency_key and PaymentNotification.objects.filter(idempotency_key=idempotency_key).exists():
            return Response({'status': 'duplicate_ignored'})

        payment = (
            Payment.objects.filter(transaction_id__in=candidates).first()
            or Payment.objects.filter(bamboo_response__reference__in=candidates).first()
        )
        if payment is None:
            logger.warning("webhook.payment_not_found refs=%s", candidates)
            return Response({'error': 'payment introuvable'}, status=status.HTTP_404_NOT_FOUND)

        if idempotency_key:
            _, created = PaymentNotification.objects.get_or_create(
                idempotency_key=idempotency_key,
                defaults={'payment': payment, 'payload': _json_safe(data)},
            )
            if not created:  # doublon reçu en parallèle
                return Response({'status': 'duplicate_ignored'})

        if payment.status in ('SUCCESS', 'FAILED'):
            return Response({'status': 'already_processed'})

        try:
            result = get_bamboo_service().check_status(payment.transaction_id)
            Payment.objects.filter(pk=payment.pk).update(last_checked_at=timezone.now())
        except (BambooPayError, RuntimeError) as e:
            # On accuse réception ; le suivi client (check-status) et la
            # réconciliation rattraperont ce paiement.
            logger.warning("webhook.verification_failed ref=%s err=%s", payment.transaction_id, e)
            # La notification n'a pas pu être vérifiée : on oublie sa clé pour
            # qu'un renvoi de BambooPay (même idempotency_key) soit bien traité.
            if idempotency_key:
                PaymentNotification.objects.filter(idempotency_key=idempotency_key).delete()
            return Response({'status': 'received_verification_deferred'})

        payment = apply_bamboo_result(payment.pk, result, source='webhook')
        return Response({'status': payment.status.lower()})


def _json_safe(data):
    """Copie JSON-sérialisable du corps reçu (QueryDict ou dict)."""
    try:
        return {k: data.get(k) for k in data.keys()}
    except Exception:
        return {}
