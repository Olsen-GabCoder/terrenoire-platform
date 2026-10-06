"""
Finalisation des paiements Bamboo Pay.

Point d'entrée unique utilisé par le webhook, le polling client (check-status)
et la commande de réconciliation. La seule source de vérité est la réponse
de l'API Bamboo `check_status` obtenue côté serveur : on ne fait jamais
confiance au statut envoyé par un client ou dans le corps d'un webhook.
"""

import logging
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

from apps.orders.models import Order, Payment

logger = logging.getLogger('bamboo_pay')

STATUS_MAP = {
    'completed': 'SUCCESS',
    'success': 'SUCCESS',
    'successful': 'SUCCESS',
    'approved': 'SUCCESS',
    'paid': 'SUCCESS',
    'failed': 'FAILED',
    'rejected': 'FAILED',
    'cancelled': 'FAILED',
    'expired': 'EXPIRED',
    'timeout': 'EXPIRED',
    'pending': 'PENDING',
    'processing': 'PENDING',
}


def map_bamboo_status(raw_status):
    """Convertit un statut Bamboo en statut Payment. Inconnu -> PENDING."""
    key = str(raw_status or 'pending').lower().strip()
    new_status = STATUS_MAP.get(key)
    if new_status is None:
        logger.warning("bamboo.unknown_status raw_status=%r — fallback PENDING", key)
        return 'PENDING'
    return new_status


def _amount_mismatch(tx, expected):
    """True si Bamboo renvoie un montant inférieur au montant attendu."""
    raw = tx.get('amount')
    if raw in (None, ''):
        return False
    try:
        paid = Decimal(str(raw))
    except (InvalidOperation, ValueError):
        return True
    # Tolérance < 1 FCFA (le montant envoyé à Bamboo est un entier)
    return expected - paid >= 1


def apply_bamboo_result(payment_id, result, source):
    """
    Applique une réponse `check_status` de Bamboo à un paiement, sous verrou.

    Retourne le Payment à jour. N'autorise que les transitions :
      PENDING -> SUCCESS / FAILED / EXPIRED
      EXPIRED -> SUCCESS (l'expiration est un timeout applicatif, pas un échec réel)
    La commande ne passe à PAID que si elle est encore PENDING.
    """
    tx = (result or {}).get('transaction') or {}
    new_status = map_bamboo_status(tx.get('status'))
    paid_order = None

    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=payment_id)
        order = Order.objects.select_for_update().get(pk=payment.order_id)

        if new_status == 'PENDING':
            return payment

        recovering = payment.status == 'EXPIRED' and new_status == 'SUCCESS'
        if payment.is_final and not recovering:
            return payment

        if new_status == 'SUCCESS' and _amount_mismatch(tx, payment.amount):
            logger.error(
                "payment.amount_mismatch source=%s ref=%s expected=%s bamboo=%r — "
                "paiement NON validé, vérification manuelle requise",
                source, payment.transaction_id, payment.amount, tx.get('amount'),
            )
            payment.bamboo_response = result
            payment.save(update_fields=['bamboo_response', 'updated_at'])
            return payment

        payment.status = new_status
        payment.bamboo_response = result
        payment.finalized_at = timezone.now()
        payment.save()

        if new_status == 'SUCCESS':
            if order.status == 'PENDING':
                order.status = 'PAID'
                order.save()
                paid_order = order
            elif order.status != 'PAID':
                logger.error(
                    "payment.success_on_%s_order source=%s ref=%s order=%d — "
                    "le client a payé une commande non payable, remboursement à prévoir",
                    order.status.lower(), source, payment.transaction_id, order.id,
                )

        logger.info(
            "payment.finalized source=%s ref=%s status=%s order=%d%s",
            source, payment.transaction_id, new_status, order.id,
            ' (recovered from EXPIRED)' if recovering else '',
        )

    if paid_order is not None:
        try:
            from apps.core.email import send_order_paid
            send_order_paid(paid_order)
        except Exception:
            logger.exception("payment.email_failed order=%d", paid_order.id)

    payment.refresh_from_db()
    return payment
