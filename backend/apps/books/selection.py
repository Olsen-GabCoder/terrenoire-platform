"""
Sélection d'accueil tournante.

Le tirage est aléatoire mais déterministe pour une période donnée : tous les
visiteurs (et tous les workers gunicorn) voient la même sélection jusqu'à la
période suivante, puis un nouveau tirage a lieu automatiquement.
"""
import random

from django.utils import timezone


def current_period(rotation_hours):
    """Numéro de la période en cours (None si la rotation est désactivée)."""
    if not rotation_hours:
        return None
    return int(timezone.now().timestamp() // (rotation_hours * 3600))


def pick_rotating_selection(queryset, source, period, size=6):
    """
    Retourne `size` livres :
    - rotation désactivée (period=None) : comportement historique (livres
      marqués « Sélection », sinon les plus populaires) ;
    - sinon tirage aléatoire parmi les livres éligibles, renouvelé à chaque période.
    """
    featured_qs = queryset.filter(is_featured=True)

    if period is None:
        qs = featured_qs if featured_qs.exists() else queryset.order_by('-popularity_score')
        return list(qs[:size])

    pool_qs = featured_qs if source == 'featured' and featured_qs.exists() else queryset
    ids = sorted(pool_qs.values_list('id', flat=True))
    chosen = random.Random(f'tn-selection-{period}').sample(ids, min(size, len(ids)))
    books = {b.id: b for b in queryset.filter(id__in=chosen)}
    return [books[i] for i in chosen if i in books]
