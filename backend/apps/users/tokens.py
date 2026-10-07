"""Utilitaires autour des JWT."""
import hashlib

# Claim portant l'empreinte du mot de passe : un jeton émis avant un changement
# (ou une réinitialisation) de mot de passe est refusé immédiatement.
PASSWORD_CLAIM = 'pwv'


def password_fingerprint(user):
    """Empreinte courte du hash de mot de passe (change à chaque nouveau mot de passe)."""
    return hashlib.sha256((user.password or '').encode()).hexdigest()[:16]


def add_session_claims(token, user):
    token[PASSWORD_CLAIM] = password_fingerprint(user)
    return token


def token_matches_password(validated_token, user):
    """False si le jeton a été émis avec un ancien mot de passe.
    Les jetons émis avant l'ajout du claim restent acceptés jusqu'à leur expiration."""
    claim = validated_token.get(PASSWORD_CLAIM)
    return claim is None or claim == password_fingerprint(user)


def revoke_user_tokens(user):
    """Blackliste tous les refresh tokens d'un utilisateur (après changement de mot de passe)."""
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
