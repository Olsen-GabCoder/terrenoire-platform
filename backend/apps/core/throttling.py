"""Throttles pour limiter les requetes sur les endpoints publics et sensibles.

Les limites s'appliquent par adresse IP, que l'utilisateur soit connecté ou non
(AnonRateThrottle ignorait totalement les utilisateurs connectés).
"""
from rest_framework.throttling import SimpleRateThrottle


class IPRateThrottle(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class PublicEndpointThrottle(IPRateThrottle):
    """10 requetes/minute pour les endpoints publics (contact, newsletter, etc.)."""
    scope = 'anon_burst'


class LoginThrottle(IPRateThrottle):
    """5 tentatives de connexion par minute par IP."""
    scope = 'login'


class RegisterThrottle(IPRateThrottle):
    """3 inscriptions par heure par IP."""
    scope = 'register'


class PasswordResetThrottle(IPRateThrottle):
    """3 demandes de reinitialisation par heure par IP."""
    scope = 'password_reset'


class ContactThrottle(IPRateThrottle):
    """5 messages de contact par heure par IP."""
    scope = 'contact'
