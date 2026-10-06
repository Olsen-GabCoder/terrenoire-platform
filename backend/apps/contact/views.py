import logging

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttling import ContactThrottle
from .models import ContactMessage
from .serializers import ContactMessageSerializer
from apps.core.email import run_in_background

logger = logging.getLogger(__name__)


class ContactSubmitView(APIView):
    """Envoi d'un message via le formulaire de contact. Accessible à tous."""
    permission_classes = [AllowAny]
    throttle_classes = [ContactThrottle]

    def post(self, request):
        serializer = ContactMessageSerializer(data=request.data)
        if serializer.is_valid():
            contact = serializer.save()
            # Envoi email en arriere-plan pour ne pas bloquer la reponse
            def _send(c):
                try:
                    from apps.core.email import send_contact_notification
                    send_contact_notification(c)
                except Exception as e:
                    logger.exception("Erreur envoi notification contact: %s", e)
            run_in_background(_send, contact)
            return Response(
                {'success': True, 'message': 'Message envoyé ! Nous vous répondrons très bientôt.'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ContactMessagesView(APIView):
    """Liste et gestion des messages de contact (admin)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        messages = ContactMessage.objects.all().order_by('-created_at')
        data = [
            {
                'id': m.id,
                'name': m.name,
                'email': m.email,
                'subject': m.subject,
                'message': m.message,
                'created_at': m.created_at,
                'is_read': m.is_read,
            }
            for m in messages
        ]
        stats = {
            'total': len(data),
            'unread': sum(1 for m in data if not m['is_read']),
        }
        return Response({'results': data, 'stats': stats})


class ContactMessageDetailView(APIView):
    """Modifier/supprimer un message de contact (admin)."""
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            msg = ContactMessage.objects.get(pk=pk)
        except ContactMessage.DoesNotExist:
            return Response({'detail': 'Message introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if 'is_read' in request.data:
            msg.is_read = request.data['is_read']
            msg.save()
        return Response({'id': msg.id, 'is_read': msg.is_read})

    def delete(self, request, pk):
        try:
            msg = ContactMessage.objects.get(pk=pk)
        except ContactMessage.DoesNotExist:
            return Response({'detail': 'Message introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        msg.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
