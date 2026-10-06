"""
Vues JWT qui stockent les tokens dans des cookies HttpOnly.
"""
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from django.conf import settings

from apps.core.throttling import LoginThrottle
from .token_serializers import EmailTokenObtainPairSerializer
from .serializers import UserDetailSerializer


def _set_auth_cookies(response, access_token, refresh_token=None):
    """Configure les cookies HttpOnly pour les tokens."""
    secure = not getattr(settings, 'DEBUG', True)
    samesite = 'None' if secure else 'Lax'
    cookie_opts = {
        'httponly': True,
        'secure': secure,
        'samesite': samesite,
        'path': '/',
        'max_age': int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
    }
    access_name = getattr(settings, 'JWT_ACCESS_COOKIE_NAME', 'access_token')
    response.set_cookie(access_name, str(access_token), **cookie_opts)

    if refresh_token:
        refresh_opts = {
            'httponly': True,
            'secure': secure,
            'samesite': samesite,
            'path': '/',
            'max_age': int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        }
        refresh_name = getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'refresh_token')
        response.set_cookie(refresh_name, str(refresh_token), **refresh_opts)


def _clear_auth_cookies(response):
    """Supprime les cookies d'authentification."""
    access_name = getattr(settings, 'JWT_ACCESS_COOKIE_NAME', 'access_token')
    refresh_name = getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'refresh_token')
    for name in (access_name, refresh_name):
        response.delete_cookie(name, path='/', samesite='None' if not getattr(settings, 'DEBUG', True) else 'Lax')


class CookieTokenObtainPairView(TokenObtainPairView):
    """
    Connexion JWT : retourne les tokens + user en JSON ET les définit en cookies HttpOnly.
    Le champ 'user' permet au frontend de se connecter sans appeler check-auth (évite les
    problèmes de cookies cross-origin en dev si localhost ≠ 127.0.0.1).
    """
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access = response.data.get('access')
            refresh = response.data.get('refresh')
            if access:
                _set_auth_cookies(response, access, refresh)
                # Inclure les données utilisateur pour éviter un 2e appel check-auth (cookies cross-origin)
                try:
                    user_id = AccessToken(access)['user_id']
                    from .models import User
                    user = User.objects.get(id=user_id)
                    response.data['user'] = UserDetailSerializer(user, context={'request': request}).data
                except Exception:
                    pass
        return response


class CookieTokenRefreshView(APIView):
    """
    Rafraîchissement JWT : lit le refresh token depuis le cookie ou le body.
    Définit le nouveau access token en cookie.
    """
    permission_classes = [AllowAny]
    # Un access token expiré ne doit pas bloquer le refresh / la déconnexion
    authentication_classes = []

    def post(self, request):
        refresh_name = getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'refresh_token')
        refresh_value = request.data.get('refresh') or request.COOKIES.get(refresh_name)
        if not refresh_value:
            return Response(
                {'detail': 'Token de rafraîchissement manquant.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        # TokenRefreshSerializer applique ROTATE_REFRESH_TOKENS et
        # BLACKLIST_AFTER_ROTATION tels que définis dans settings.SIMPLE_JWT.
        serializer = TokenRefreshSerializer(data={'refresh': refresh_value})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken, ValidationError):
            response = Response(
                {'detail': 'Token invalide ou expiré.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            _clear_auth_cookies(response)
            return response

        data = serializer.validated_data
        response = Response(data)
        _set_auth_cookies(response, data['access'], data.get('refresh'))
        return response


class LogoutView(APIView):
    """
    Déconnexion : supprime les cookies JWT.
    POST /api/users/logout/
    """
    permission_classes = [AllowAny]
    # Un access token expiré ne doit pas bloquer le refresh / la déconnexion
    authentication_classes = []

    def post(self, request):
        # Révoquer le refresh token pour qu'il ne puisse plus être réutilisé
        refresh_name = getattr(settings, 'JWT_REFRESH_COOKIE_NAME', 'refresh_token')
        refresh_value = request.data.get('refresh') or request.COOKIES.get(refresh_name)
        if refresh_value:
            try:
                RefreshToken(refresh_value).blacklist()
            except TokenError:
                pass
        response = Response({'message': 'Déconnexion réussie.'}, status=status.HTTP_200_OK)
        _clear_auth_cookies(response)
        return response
