"""Utilitaires autour des JWT."""


def revoke_user_tokens(user):
    """Blackliste tous les refresh tokens d'un utilisateur (après changement de mot de passe)."""
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
