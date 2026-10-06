"""Règles d'accès à la lecture des ebooks."""
from datetime import datetime, timezone as dt_timezone

from django.db.models import Q

# Avant cette date, les commandes n'enregistraient pas le format acheté
# (tous les articles ont reçu PAPIER par défaut lors de la migration) :
# on conserve donc l'accès des anciens acheteurs quel que soit le format.
FORMAT_TRACKING_START = datetime(2026, 6, 23, tzinfo=dt_timezone.utc)

READABLE_ORDER_STATUSES = ('PAID', 'SHIPPED')


def user_can_read_ebook(user, book):
    if not user or not user.is_authenticated:
        return False
    if user.is_staff:
        return True
    from apps.orders.models import OrderItem
    return OrderItem.objects.filter(
        Q(format_purchased='EBOOK') | Q(order__created_at__lt=FORMAT_TRACKING_START),
        order__user=user,
        order__status__in=READABLE_ORDER_STATUSES,
        book=book,
    ).exists()
