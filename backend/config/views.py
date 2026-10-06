"""
Vues principales de l'API pour la racine et les tests.
"""
import io
from datetime import datetime
from django.utils import timezone
from django.core.management import call_command
from django.http import HttpResponse
from django.contrib.admin.views.decorators import staff_member_required
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """
    Endpoint racine de l'API qui liste tous les endpoints disponibles.
    """
    base_url = request.build_absolute_uri('/api/')
    
    return Response({
        'message': 'API Maison d\'Édition - Bienvenue !',
        'version': '1.0.0',
        'endpoints': {
            'authentication': {
                'login': base_url + 'token/',
                'refresh': base_url + 'token/refresh/',
                'register': base_url + 'users/register/',
                'profile': base_url + 'users/me/',
            },
            'users': {
                'list': base_url + 'users/',
                'detail': base_url + 'users/{id}/',
            },
            'books': {
                'list': base_url + 'books/',
                'featured': base_url + 'books/featured/',
                'new_releases': base_url + 'books/new-releases/',
            },
        },
        'documentation': {
            'schema': base_url + 'schema/',
            'swagger': base_url + 'docs/',
            'redoc': base_url + 'redoc/',
        },
        'status': 'operational'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Endpoint de vérification de santé de l'API.
    """
    from django.db import connection
    from django.db.utils import OperationalError
    
    # Vérifier la connexion à la base de données
    db_connected = True
    try:
        connection.ensure_connection()
    except OperationalError:
        db_connected = False
    
    return Response({
        'status': 'healthy',
        'database': 'connected' if db_connected else 'disconnected',
        'timestamp': timezone.now().isoformat(),
    })


@staff_member_required
def admin_backup(request):
    """
    Génère une sauvegarde JSON de la base de données (dumpdata).
    Accessible uniquement aux superutilisateurs : la sauvegarde contient
    les hashes de mots de passe et les tokens.
    """
    if not request.user.is_superuser:
        from django.core.exceptions import PermissionDenied
        raise PermissionDenied("Sauvegarde réservée aux superutilisateurs.")
    buffer = io.StringIO()
    try:
        call_command('dumpdata', '--natural-foreign', '--natural-primary', stdout=buffer)
        buffer.seek(0)
        content = buffer.getvalue()
    except Exception as e:
        return HttpResponse(
            f"Erreur lors de la sauvegarde : {str(e)}",
            status=500,
            content_type='text/plain; charset=utf-8'
        )
    filename = f"backup_terrenoire_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    response = HttpResponse(content, content_type='application/json')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response