"""
Authentification JWT via cookies HttpOnly.
Lit le token depuis le cookie si absent du header Authorization.
"""
from urllib.parse import urlsplit

from django.conf import settings
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication

SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS', 'TRACE')


def _origin_of(url):
    parts = urlsplit(url)
    if not parts.scheme or not parts.netloc:
        return None
    return f'{parts.scheme}://{parts.netloc}'.lower()


def _trusted_origins():
    origins = list(getattr(settings, 'CORS_ALLOWED_ORIGINS', [])) + \
        list(getattr(settings, 'CSRF_TRUSTED_ORIGINS', []))
    return {o.rstrip('/').lower() for o in origins}


class JWTCookieAuthentication(JWTAuthentication):
    """
    Authentification JWT qui accepte le token depuis :
    1. Le header Authorization (Bearer)
    2. Le cookie access_token (HttpOnly)

    Les cookies sont envoyés automatiquement par le navigateur, y compris depuis
    un site tiers (SameSite=None) : pour une requête qui modifie des données,
    on exige donc que l'origine soit l'une des origines de confiance (protection CSRF).
    """
    def authenticate(self, request):
        # D'abord essayer le header (comportement par défaut)
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                validated_token = self.get_validated_token(raw_token)
                return (self.get_user(validated_token), validated_token)

        # Sinon, lire depuis le cookie
        cookie_name = getattr(settings, 'JWT_ACCESS_COOKIE_NAME', 'access_token')
        raw_token = request.COOKIES.get(cookie_name)
        if raw_token:
            self.enforce_origin(request)
            validated_token = self.get_validated_token(raw_token)
            return (self.get_user(validated_token), validated_token)

        return None

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        # Jeton émis avant un changement de mot de passe : refusé tout de suite
        # (sans attendre son expiration).
        from .tokens import token_matches_password
        if not token_matches_password(validated_token, user):
            raise exceptions.AuthenticationFailed('Session expirée : le mot de passe a changé.', code='password_changed')
        return user

    def enforce_origin(self, request):
        if request.method in SAFE_METHODS or settings.DEBUG:
            return
        origin = request.META.get('HTTP_ORIGIN')
        if origin is None:
            referer = request.META.get('HTTP_REFERER')
            if referer is None:
                # Client non navigateur (pas d'Origin ni de Referer) : pas de risque CSRF.
                return
            origin = _origin_of(referer)
        else:
            origin = origin.rstrip('/').lower()
        if origin != _origin_of(request.build_absolute_uri('/')) and origin not in _trusted_origins():
            raise exceptions.PermissionDenied('Origine de la requête non autorisée (CSRF).')
