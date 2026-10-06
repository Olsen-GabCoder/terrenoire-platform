"""
Numéros de téléphone (Gabon d'abord).

Plan de numérotation gabonais : 9 chiffres en local (0 + 8 chiffres) depuis le
6 avril 2024 ; en international, +241 suivi des 8 chiffres (le 0 disparaît).
Stockage : E.164 (+24174301639). Les numéros étrangers (+33…) sont conservés.
"""
import re

GABON_LOCAL_RE = re.compile(r'^0(11|6[0-6]|7[467])\d{6}$')
INTERNATIONAL_RE = re.compile(r'^\+[1-9]\d{7,14}$')


def gabon_local(raw):
    """Format local à 9 chiffres (074301639) si la saisie est un numéro gabonais, sinon None."""
    digits = re.sub(r'\D', '', str(raw or ''))
    if digits.startswith('00241'):
        digits = digits[5:]
    elif digits.startswith('241') and len(digits) >= 11:
        digits = digits[3:]
    if len(digits) == 8 and not digits.startswith('0'):
        digits = '0' + digits
    return digits if GABON_LOCAL_RE.match(digits) else None


def normalize_phone(raw):
    """
    Retourne le numéro au format E.164, ou lève ValueError avec un message lisible.
    Chaîne vide / None -> None.
    """
    value = str(raw or '').strip()
    if not value:
        return None
    local = gabon_local(value)
    if local:
        return '+241' + local[1:]
    compact = re.sub(r'[\s.\-()]', '', value)
    if compact.startswith('+') and not compact.startswith('+241') and INTERNATIONAL_RE.match(compact):
        return compact
    raise ValueError(
        "Numéro invalide : saisissez un numéro gabonais à 9 chiffres (ex. 074 30 16 39) "
        "ou un numéro international (ex. +33 6 12 34 56 78)."
    )


def phone_variants(e164):
    """Formes sous lesquelles un même numéro gabonais a pu être enregistré (pour l'unicité)."""
    if not e164:
        return []
    variants = {e164}
    if e164.startswith('+241') and len(e164) == 12:
        national = e164[4:]
        variants.update({'0' + national, national, '241' + national})
    return list(variants)
