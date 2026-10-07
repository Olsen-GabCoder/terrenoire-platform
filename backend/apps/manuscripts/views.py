import io
import logging
import mimetypes
import zipfile

import requests as http_requests
from rest_framework import generics, status, permissions
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from django.http import HttpResponse
from django.utils import timezone

from apps.core.throttling import PublicEndpointThrottle
from .models import Manuscript
from .serializers import ManuscriptSerializer

logger = logging.getLogger(__name__)

class ManuscriptCreateView(generics.CreateAPIView):
    queryset = Manuscript.objects.all()
    serializer_class = ManuscriptSerializer
    permission_classes = [AllowAny]
    throttle_classes = [PublicEndpointThrottle]
    parser_classes = [MultiPartParser, FormParser]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Accusé de réception + notification admin : envoyés par les signaux (signals.py)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'success': True,
                'message': 'Votre manuscrit a été soumis avec succès.',
                'data': serializer.data
            },
            status=status.HTTP_201_CREATED,
            headers=headers
        )

class ManuscriptListView(generics.ListAPIView):
    """
    Vue pour lister tous les manuscrits (Admin seulement)
    Endpoint: GET /api/manuscripts/
    """
    queryset = Manuscript.objects.filter(is_deleted=False).order_by('-submitted_at')
    serializer_class = ManuscriptSerializer
    permission_classes = [IsAdminUser]

class ManuscriptDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vue pour voir, modifier ou supprimer un manuscrit spécifique (Admin seulement)
    Endpoint: GET/PUT/PATCH/DELETE /api/manuscripts/{id}/
    """
    queryset = Manuscript.objects.filter(is_deleted=False)
    serializer_class = ManuscriptSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(
            {
                'success': True,
                'message': 'Manuscrit mis à jour avec succès.',
                'data': serializer.data
            }
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['is_deleted', 'deleted_at'])
        return Response(
            {
                'success': True,
                'message': 'Manuscrit supprimé avec succès.'
            },
            status=status.HTTP_200_OK
        )

class ManuscriptStatusUpdateView(APIView):
    """
    Vue spécifique pour mettre à jour uniquement le statut d'un manuscrit
    Endpoint: PATCH /api/manuscripts/{id}/update-status/
    """
    permission_classes = [IsAdminUser]
    
    def patch(self, request, pk):
        try:
            manuscript = Manuscript.objects.get(pk=pk, is_deleted=False)
        except Manuscript.DoesNotExist:
            return Response(
                {'error': 'Manuscrit non trouvé.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        status_value = request.data.get('status')
        if status_value not in [choice[0] for choice in Manuscript.STATUS_CHOICES]:
            return Response(
                {'error': f'Statut invalide. Choisissez parmi: {[choice[1] for choice in Manuscript.STATUS_CHOICES]}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        manuscript.status = status_value
        manuscript.save()
        # La notification de l'auteur est envoyée par le signal post_save (signals.py)

        return Response(
            {
                'success': True,
                'message': f'Statut du manuscrit mis à jour à "{manuscript.get_status_display()}"',
                'data': ManuscriptSerializer(manuscript).data
            }
        )


class ManuscriptDownloadView(APIView):
    """
    Proxy de telechargement des manuscrits via l'API Cloudinary.
    Cloudinary bloque la livraison publique des fichiers raw (401),
    donc Django telecharge le fichier via generate_archive et le
    streame au navigateur apres verification d'auth admin.
    Endpoint: GET /api/manuscripts/<pk>/download/
    """
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        try:
            manuscript = Manuscript.objects.get(pk=pk, is_deleted=False)
        except Manuscript.DoesNotExist:
            return Response(
                {'error': 'Manuscrit non trouvé.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not manuscript.file:
            return Response(
                {'error': 'Aucun fichier associé à ce manuscrit.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            import cloudinary.utils

            archive_url = cloudinary.utils.download_archive_url(
                public_ids=[manuscript.file.name],
                resource_type='raw',
                flatten_folders=True,
                target_format='zip',
            )
            resp = http_requests.get(archive_url, timeout=30)
            resp.raise_for_status()

            z = zipfile.ZipFile(io.BytesIO(resp.content))
            filenames = z.namelist()
            if not filenames:
                raise ValueError("Archive Cloudinary vide")
            file_data = z.read(filenames[0])

        except Exception as e:
            logger.error(
                "[DOWNLOAD] Echec telechargement manuscrit #%s depuis Cloudinary: %s",
                pk, e, exc_info=True,
            )
            return Response(
                {'error': 'Impossible de récupérer le fichier. Réessayez plus tard.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        original_name = manuscript.file.name.split('/')[-1]
        content_type, _ = mimetypes.guess_type(original_name)
        if not content_type:
            content_type = 'application/octet-stream'

        # Téléchargement en pièce jointe (jamais affiché dans le navigateur),
        # avec la vraie extension du fichier déposé (.pdf, .doc ou .docx)
        from django.utils.http import content_disposition_header
        extension = (original_name.rsplit('.', 1)[-1].lower() if '.' in original_name else 'bin')
        response = HttpResponse(file_data, content_type=content_type)
        response['Content-Disposition'] = content_disposition_header(
            as_attachment=True, filename=f"{manuscript.title[:80]}.{extension}",
        )
        response['X-Content-Type-Options'] = 'nosniff'
        response['Content-Length'] = len(file_data)
        return response