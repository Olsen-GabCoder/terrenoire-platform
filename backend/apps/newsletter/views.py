import logging
from datetime import timedelta

from django.conf import settings
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttling import PublicEndpointThrottle
from .models import NewsletterSubscriber
from .serializers import NewsletterSubscribeSerializer
from apps.core.email import run_in_background

logger = logging.getLogger(__name__)


def _send_confirmation_email_async(subscriber):
    """Envoie l'email de confirmation en arrière-plan."""
    def _send():
        try:
            from apps.core.email import send_templated_email
            confirm_url = f"{settings.FRONTEND_URL}/newsletter/confirm/{subscriber.confirmation_token}"
            context = {
                'email': subscriber.email,
                'confirm_url': confirm_url,
                'frontend_url': settings.FRONTEND_URL,
            }
            send_templated_email(
                "Confirmez votre inscription — Terre Noire Éditions",
                'newsletter_confirm',
                context,
                [subscriber.email],
            )
        except Exception as e:
            logger.exception("Erreur envoi email confirmation newsletter à %s: %s", subscriber.email, e)
    run_in_background(_send)


class NewsletterSubscribeView(APIView):
    """Inscription à la newsletter (double opt-in)."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def post(self, request):
        # Purger les inscriptions non confirmées de +72h
        expiry = timezone.now() - timedelta(hours=72)
        NewsletterSubscriber.objects.filter(confirmed=False, subscribed_at__lt=expiry).delete()

        serializer = NewsletterSubscribeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        subscriber, created = NewsletterSubscriber.objects.get_or_create(
            email=email,
            defaults={'is_active': True, 'confirmed': False},
        )

        if not created:
            if subscriber.is_active and subscriber.confirmed:
                return Response(
                    {'email': ["Cet email est déjà inscrit à notre newsletter."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Réactivation ou renvoi de confirmation
            if not subscriber.is_active:
                subscriber.is_active = True
            if not subscriber.confirmed:
                from .models import _default_token
                subscriber.confirmation_token = _default_token()
                subscriber.confirmed = False
                subscriber.confirmed_at = None
            subscriber.save()

        _send_confirmation_email_async(subscriber)

        return Response(
            {'success': True, 'message': 'Un email de confirmation vous a été envoyé. Vérifiez votre boîte de réception.'},
            status=status.HTTP_201_CREATED,
        )


class NewsletterConfirmView(APIView):
    """Confirmation d'inscription via le lien envoyé par email."""
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def get(self, request, token):
        try:
            subscriber = NewsletterSubscriber.objects.get(
                confirmation_token=token, is_active=True,
            )
        except NewsletterSubscriber.DoesNotExist:
            return self._respond(request, 'invalid')

        # Vérifier expiration (72h)
        if (timezone.now() - subscriber.subscribed_at).total_seconds() > 72 * 3600 and not subscriber.confirmed:
            return self._respond(request, 'expired')

        if not subscriber.confirmed:
            subscriber.confirmed = True
            subscriber.confirmed_at = timezone.now()
            subscriber.save()
            # Envoyer le welcome en arrière-plan
            def _send_welcome():
                try:
                    from apps.core.email import send_newsletter_welcome
                    send_newsletter_welcome(subscriber.email, subscriber.confirmation_token)
                except Exception as e:
                    logger.exception("Erreur envoi welcome newsletter: %s", e)
            run_in_background(_send_welcome)

        return self._respond(request, 'success')

    def _respond(self, request, result):
        """JSON si appel API (axios), redirect si navigateur direct."""
        if 'application/json' in request.headers.get('Accept', ''):
            return Response({'result': result})
        return redirect(f"{settings.FRONTEND_URL}/newsletter/confirm/{result}")


class NewsletterUnsubscribeView(APIView):
    """Désinscription en 1 clic via le token unique."""
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            subscriber = NewsletterSubscriber.objects.get(confirmation_token=token)
        except NewsletterSubscriber.DoesNotExist:
            if 'application/json' in request.headers.get('Accept', ''):
                return Response({'result': 'invalid'})
            return redirect(f"{settings.FRONTEND_URL}/newsletter/unsubscribe/invalid")

        if subscriber.is_active:
            subscriber.is_active = False
            subscriber.save()

        if 'application/json' in request.headers.get('Accept', ''):
            return Response({'result': 'success'})
        return redirect(f"{settings.FRONTEND_URL}/newsletter/unsubscribe/success")


class NewsletterStatsView(APIView):
    """Statistiques newsletter pour le dashboard admin."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        total = NewsletterSubscriber.objects.count()
        active = NewsletterSubscriber.objects.filter(is_active=True, confirmed=True).count()
        pending = NewsletterSubscriber.objects.filter(is_active=True, confirmed=False).count()
        unsubscribed = NewsletterSubscriber.objects.filter(is_active=False).count()
        return Response({
            'total': total,
            'active': active,
            'pending': pending,
            'unsubscribed': unsubscribed,
        })


class NewsletterSubscribersListView(APIView):
    """Liste des abonnés newsletter pour l'admin."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        subscribers = NewsletterSubscriber.objects.all().order_by('-subscribed_at')
        data = [
            {
                'id': s.id,
                'email': s.email,
                'subscribed_at': s.subscribed_at,
                'confirmed': s.confirmed,
                'confirmed_at': s.confirmed_at,
                'is_active': s.is_active,
            }
            for s in subscribers
        ]
        return Response({'results': data})

    def delete(self, request, pk=None):
        """Supprimer un abonné."""
        if not pk:
            return Response({'detail': 'ID requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            subscriber = NewsletterSubscriber.objects.get(pk=pk)
            subscriber.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except NewsletterSubscriber.DoesNotExist:
            return Response({'detail': 'Abonné introuvable.'}, status=status.HTTP_404_NOT_FOUND)
