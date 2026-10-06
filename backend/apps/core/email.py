"""
Service d'envoi d'emails pour Terre Noire Éditions.
Centralise l'envoi des notifications (commandes, newsletter, contact, etc.).
"""
import base64
import logging

from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _get_logo_base64():
    """Encode le logo en base64 pour affichage inline dans les emails."""
    logo_path = getattr(settings, 'LOGO_PATH', None)
    if logo_path and hasattr(logo_path, 'exists') and logo_path.exists():
        try:
            data = logo_path.read_bytes()
            return f"data:image/png;base64,{base64.b64encode(data).decode('ascii')}"
        except Exception:
            pass
    return None


def run_in_background(func, *args):
    """
    Exécute une tâche d'envoi d'e-mails dans un thread si settings.EMAIL_ASYNC,
    sinon immédiatement (tests, ou EMAIL_ASYNC=False).
    """
    if getattr(settings, 'EMAIL_ASYNC', False):
        import threading
        threading.Thread(target=func, args=args, daemon=True).start()
    else:
        func(*args)


def _send_message(msg, subject, to_emails, fail_silently):
    try:
        msg.send(fail_silently=False)
        logger.info(f"Email envoyé: {subject} -> {to_emails}")
        return True
    except Exception as e:
        logger.exception(f"Erreur envoi email {subject}: {e}")
        if not fail_silently:
            raise
        return False


def send_templated_email(subject, template_name, context, to_emails, attachments=None, fail_silently=True,
                         reply_to=None):
    """
    Envoie un email à partir d'un template HTML.
    Génère aussi une version texte pour les clients qui ne supportent pas le HTML.
    attachments: liste de tuples (filename, content, mimetype) ou (filename, content)
    reply_to: adresse de réponse ; par défaut settings.EMAIL_REPLY_TO

    Si settings.EMAIL_ASYNC est actif (et fail_silently=True), le message est
    préparé immédiatement puis envoyé dans un thread : la requête de
    l'utilisateur n'attend pas le serveur d'e-mails.
    """
    if not to_emails:
        return False
    if isinstance(to_emails, str):
        to_emails = [to_emails]

    try:
        logo_base64 = _get_logo_base64()
        ctx = {
            **context,
            'logo_base64': logo_base64,
            'logo_url': getattr(settings, 'LOGO_URL', None) or f"{settings.FRONTEND_URL}/images/logo_terre_noire.png",
        }
        html_content = render_to_string(f'emails/{template_name}.html', ctx)
        text_content = strip_tags(html_content)
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=to_emails,
            reply_to=[a for a in [reply_to or getattr(settings, 'EMAIL_REPLY_TO', '')] if a],
        )
        msg.attach_alternative(html_content, 'text/html')
        if attachments:
            for att in attachments:
                filename = att[0]
                content = att[1].getvalue() if hasattr(att[1], 'getvalue') else (att[1].read() if hasattr(att[1], 'read') else att[1])
                mimetype = att[2] if len(att) >= 3 else 'application/pdf'
                msg.attach(filename, content, mimetype)
        if fail_silently and getattr(settings, 'EMAIL_ASYNC', False):
            run_in_background(_send_message, msg, subject, to_emails, True)
            return True
        return _send_message(msg, subject, to_emails, fail_silently)
    except Exception as e:
        logger.exception(f"Erreur envoi email {subject}: {e}")
        if not fail_silently:
            raise
        return False


def send_order_confirmation(order):
    """Email de confirmation de commande (commande créée) avec facture PDF."""
    from apps.orders.models import Order
    from apps.core.invoice import generate_order_invoice_pdf

    order = Order.objects.prefetch_related('items__book').get(pk=order.pk)
    items = []
    for item in order.items.all():
        items.append({
            'title': item.book.title,
            'quantity': item.quantity,
            'price': float(item.price),
            'total': float(item.price * item.quantity),
        })
    context = {
        'order': order,
        'user': order.user,
        'items': items,
        'subtotal': float(order.subtotal),
        'shipping_cost': float(order.shipping_cost),
        'discount_amount': float(order.discount_amount or 0),
        'total_amount': float(order.total_amount),
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Confirmation de commande #{order.id:06d} — Terre Noire Éditions"
    pdf_buffer = generate_order_invoice_pdf(order)
    attachments = [(f"facture-{order.id:06d}.pdf", pdf_buffer, 'application/pdf')]
    return send_templated_email(
        subject, 'order_confirmation', context, [order.user.email],
        attachments=attachments,
    )


def send_order_paid(order):
    """Email de confirmation de paiement avec facture PDF."""
    from apps.orders.models import Order
    from apps.core.invoice import generate_order_invoice_pdf

    order = Order.objects.prefetch_related('items__book').get(pk=order.pk)
    items = []
    for item in order.items.all():
        items.append({
            'title': item.book.title,
            'quantity': item.quantity,
            'total': float(item.price * item.quantity),
        })
    context = {
        'order': order,
        'user': order.user,
        'items': items,
        'total_amount': float(order.total_amount),
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Paiement reçu — Commande #{order.id:06d} — Terre Noire Éditions"
    pdf_buffer = generate_order_invoice_pdf(order)
    attachments = [(f"facture-{order.id:06d}.pdf", pdf_buffer, 'application/pdf')]
    return send_templated_email(
        subject, 'order_paid', context, [order.user.email],
        attachments=attachments,
    )


def send_newsletter_welcome(email, token=None):
    """Email de bienvenue après confirmation de la newsletter."""
    context = {
        'email': email,
        'frontend_url': settings.FRONTEND_URL,
        'unsubscribe_url': f"{settings.FRONTEND_URL}/newsletter/unsubscribe/{token}" if token else None,
    }
    subject = "Bienvenue dans la newsletter — Terre Noire Éditions"
    return send_templated_email(
        subject, 'newsletter_welcome', context, [email]
    )


def send_new_book_notification(book):
    """Envoie une notification à tous les abonnés confirmés et actifs pour un nouveau livre."""
    from apps.newsletter.models import NewsletterSubscriber

    subscribers = NewsletterSubscriber.objects.filter(is_active=True, confirmed=True)
    if not subscribers.exists():
        logger.info("Aucun abonné newsletter actif — notification nouveau livre ignorée.")
        return 0

    author_name = book.author.full_name if book.author else "Auteur inconnu"
    category_name = book.category.name if book.category else None
    price = f"{int(book.price):,}".replace(",", " ")
    original_price = None
    discount_percentage = None
    if book.original_price and book.original_price > book.price:
        original_price = f"{int(book.original_price):,}".replace(",", " ")
        discount_percentage = round((1 - float(book.price) / float(book.original_price)) * 100)

    cover_image = None
    if book.cover_image:
        cover_image = f"{settings.FRONTEND_URL.rstrip('/')}" \
            .replace(':5173', ':8000') + book.cover_image.url

    sent = 0
    for subscriber in subscribers:
        context = {
            'title': book.title,
            'author_name': author_name,
            'category_name': category_name,
            'description': book.description or "",
            'price': price,
            'original_price': original_price,
            'discount_percentage': discount_percentage,
            'cover_image': cover_image,
            'book_url': f"{settings.FRONTEND_URL}/books/{book.id}",
            'frontend_url': settings.FRONTEND_URL,
            'unsubscribe_url': f"{settings.FRONTEND_URL}/newsletter/unsubscribe/{subscriber.confirmation_token}",
        }
        ok = send_templated_email(
            f"Nouvelle parution : {book.title} — Terre Noire Éditions",
            'newsletter_new_book',
            context,
            [subscriber.email],
        )
        if ok:
            sent += 1
    logger.info("Notification nouveau livre '%s' envoyée à %d/%d abonnés.", book.title, sent, subscribers.count())
    return sent


def send_promo_notification(book):
    """Envoie une alerte promo à tous les abonnés confirmés et actifs."""
    from apps.newsletter.models import NewsletterSubscriber

    if not book.original_price or book.original_price <= book.price:
        return 0

    subscribers = NewsletterSubscriber.objects.filter(is_active=True, confirmed=True)
    if not subscribers.exists():
        return 0

    author_name = book.author.full_name if book.author else "Auteur inconnu"
    fmt = lambda v: f"{int(v):,}".replace(",", " ")
    discount_pct = round((1 - float(book.price) / float(book.original_price)) * 100)
    discount_amt = fmt(int(book.original_price - book.price))

    cover_image = None
    if book.cover_image:
        cover_image = settings.FRONTEND_URL.rstrip('/').replace(':5173', ':8000') + book.cover_image.url

    sent = 0
    for subscriber in subscribers:
        context = {
            'title': book.title,
            'author_name': author_name,
            'price': fmt(book.price),
            'original_price': fmt(book.original_price),
            'discount_percentage': discount_pct,
            'discount_amount': discount_amt,
            'cover_image': cover_image,
            'book_url': f"{settings.FRONTEND_URL}/books/{book.id}",
            'frontend_url': settings.FRONTEND_URL,
            'unsubscribe_url': f"{settings.FRONTEND_URL}/newsletter/unsubscribe/{subscriber.confirmation_token}",
        }
        ok = send_templated_email(
            f"Promo : {book.title} à -{discount_pct}% — Terre Noire Éditions",
            'newsletter_promo',
            context,
            [subscriber.email],
        )
        if ok:
            sent += 1
    logger.info("Notification promo '%s' (-%d%%) envoyée à %d/%d abonnés.", book.title, discount_pct, sent, subscribers.count())
    return sent


def send_coupon_email(coupon):
    """Envoie un code promo par email à un destinataire spécifique."""
    if not coupon.recipient_email:
        return False
    if coupon.discount_type == 'percent':
        discount_label = f"{int(coupon.discount_value)}%"
    else:
        discount_label = f"{int(coupon.discount_value):,} FCFA".replace(",", " ")
    context = {
        'code': coupon.code,
        'discount_label': discount_label,
        'discount_type': coupon.discount_type,
        'custom_message': coupon.custom_message or '',
        'valid_until': coupon.valid_until.strftime('%d/%m/%Y') if coupon.valid_until else None,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Votre code promo -{discount_label} — Terre Noire Éditions"
    return send_templated_email(
        subject, 'coupon_gift', context, [coupon.recipient_email]
    )


def send_contact_notification(contact_message):
    """Notification admin + accusé de réception client."""
    context = {
        'name': contact_message.name,
        'email': contact_message.email,
        'subject': contact_message.get_subject_display(),
        'message': contact_message.message,
    }
    # Email à l'admin
    admin_subject = f"[Contact] {contact_message.subject} — {contact_message.name}"
    send_templated_email(
        admin_subject, 'contact_admin', context, [settings.ADMIN_EMAIL],
        reply_to=contact_message.email,  # « Répondre » écrit directement au visiteur
    )
    # Accusé de réception au client
    client_subject = "Nous avons bien reçu votre message — Terre Noire Éditions"
    return send_templated_email(
        client_subject, 'contact_ack', context, [contact_message.email]
    )


def send_manuscript_acknowledgment(manuscript):
    """Accusé de réception après soumission de manuscrit."""
    context = {
        'author_name': manuscript.author_name,
        'title': manuscript.title,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = "Manuscrit reçu — Terre Noire Éditions"
    return send_templated_email(
        subject, 'manuscript_ack', context, [manuscript.email]
    )


def send_manuscript_status_changed(manuscript, old_status, new_status):
    """Notifier l'auteur du changement de statut de son manuscrit."""
    STATUS_LABELS = {'PENDING': 'En attente', 'REVIEWING': 'En cours d\'examen', 'ACCEPTED': 'Accepté', 'REJECTED': 'Refusé'}
    context = {
        'author_name': manuscript.author_name,
        'title': manuscript.title,
        'old_status': STATUS_LABELS.get(old_status, old_status),
        'new_status': STATUS_LABELS.get(new_status, new_status),
        'new_status_raw': new_status,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Manuscrit « {manuscript.title} » — Mise à jour du statut — Terre Noire Éditions"
    return send_templated_email(
        subject, 'manuscript_status_changed', context, [manuscript.email]
    )


def send_welcome_registration(user):
    """Email de bienvenue après création de compte (inscription)."""
    if not user or not getattr(user, 'email', None):
        return False
    context = {
        'user': user,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = "Bienvenue — Terre Noire Éditions"
    return send_templated_email(
        subject, 'registration_welcome', context, [user.email]
    )


def send_order_cancelled(order):
    """Email de confirmation d'annulation de commande."""
    from apps.orders.models import Order
    order = Order.objects.prefetch_related('items__book').get(pk=order.pk)
    items = [{'title': item.book.title, 'quantity': item.quantity} for item in order.items.all()]
    context = {
        'order': order,
        'user': order.user,
        'items': items,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Commande #{order.id:06d} annulée — Terre Noire Éditions"
    return send_templated_email(
        subject, 'order_cancelled', context, [order.user.email]
    )


def send_order_shipped(order):
    """Email de notification d'expédition."""
    from apps.orders.models import Order
    order = Order.objects.prefetch_related('items__book').get(pk=order.pk)
    items = [{'title': item.book.title, 'quantity': item.quantity} for item in order.items.all()]
    context = {
        'order': order,
        'user': order.user,
        'items': items,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Votre commande #{order.id:06d} a été expédiée — Terre Noire Éditions"
    return send_templated_email(
        subject, 'order_shipped', context, [order.user.email]
    )


def send_order_status_changed(order, old_status, new_status):
    """Email generique de changement de statut (fallback pour les statuts non geres individuellement)."""
    from apps.orders.models import Order
    order = Order.objects.prefetch_related('items__book').get(pk=order.pk)
    items = [{'title': item.book.title, 'quantity': item.quantity} for item in order.items.all()]
    STATUS_LABELS = {'PENDING': 'En attente', 'PAID': 'Payee', 'SHIPPED': 'Expediee', 'CANCELLED': 'Annulee'}
    context = {
        'order': order,
        'user': order.user,
        'items': items,
        'old_status': STATUS_LABELS.get(old_status, old_status),
        'new_status': STATUS_LABELS.get(new_status, new_status),
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"Commande #{order.id:06d} — Mise à jour du statut — Terre Noire Éditions"
    return send_templated_email(
        subject, 'order_status_changed', context, [order.user.email]
    )


def send_order_cancelled_admin(order):
    """Notification a l'admin quand un client annule sa commande."""
    from apps.orders.models import Order
    order = Order.objects.prefetch_related('items__book').select_related('user').get(pk=order.pk)
    items = [{'title': item.book.title, 'quantity': item.quantity, 'price': float(item.price)} for item in order.items.all()]
    user = order.user
    context = {
        'order': order,
        'user': user,
        'client_name': user.get_full_name() or user.username,
        'client_email': user.email,
        'items': items,
        'total_amount': float(order.total_amount),
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = f"[ANNULATION] Commande #{order.id:06d} annulée par {context['client_name']}"
    return send_templated_email(
        subject, 'order_cancelled_admin', context, [settings.ADMIN_EMAIL]
    )


def send_password_changed(user):
    """Alerte de sécurité : le mot de passe du compte vient d'être modifié."""
    if not user or not getattr(user, 'email', None):
        return False
    from zoneinfo import ZoneInfo
    from django.utils import timezone
    changed_at = timezone.now().astimezone(ZoneInfo('Africa/Libreville'))
    context = {
        'user': user,
        'changed_at': changed_at.strftime('%d/%m/%Y à %H:%M'),
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = "Votre mot de passe a été modifié — Terre Noire Éditions"
    return send_templated_email(subject, 'password_changed', context, [user.email])


def send_manuscript_admin_notification(manuscript):
    """Prévenir l'équipe éditoriale qu'un nouveau manuscrit a été soumis."""
    admin_email = getattr(settings, 'ADMIN_EMAIL', None)
    if not admin_email:
        return False
    context = {
        'manuscript': manuscript,
        'frontend_url': settings.FRONTEND_URL,
    }
    subject = "Nouveau manuscrit reçu — Terre Noire Éditions"
    return send_templated_email(
        subject, 'manuscript_admin', context, [admin_email],
        reply_to=manuscript.email,  # « Répondre » écrit directement à l'auteur
    )
