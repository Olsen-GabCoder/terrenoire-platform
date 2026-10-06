"""
E-mails automatiques des manuscrits.

Branchés sur le modèle (et non sur les vues) pour partir quel que soit
l'endroit où le manuscrit est créé ou son statut modifié : formulaire du site,
tableau de bord admin du site, ou administration Django (liste éditable incluse).
"""
import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Manuscript

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Manuscript)
def remember_previous_status(sender, instance, **kwargs):
    instance._previous_status = None
    if instance.pk:
        instance._previous_status = (
            Manuscript.objects.filter(pk=instance.pk).values_list('status', flat=True).first()
        )


@receiver(post_save, sender=Manuscript)
def notify_manuscript_events(sender, instance, created, raw=False, **kwargs):
    if raw:  # chargement de fixtures
        return
    from apps.core import email

    try:
        if created:
            email.send_manuscript_acknowledgment(instance)
            email.send_manuscript_admin_notification(instance)
            return
        previous = getattr(instance, '_previous_status', None)
        if previous and previous != instance.status:
            email.send_manuscript_status_changed(instance, previous, instance.status)
    except Exception:
        logger.exception("manuscript.email_failed id=%s", instance.pk)
