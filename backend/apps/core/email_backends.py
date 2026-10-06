"""
Backend e-mail Django utilisant l'API HTTP transactionnelle de Brevo.

Pourquoi : les hébergeurs comme Render bloquent les ports SMTP sortants
(25 / 465 / 587) sur les offres gratuites ; l'envoi SMTP échoue alors après
un long délai. L'API Brevo passe par HTTPS (port 443), toujours autorisé.

Activation : définir la variable d'environnement BREVO_API_KEY
(Brevo > SMTP & API > Clés API). L'adresse DEFAULT_FROM_EMAIL doit être un
expéditeur validé dans Brevo.
"""
import base64
import logging
from email.utils import parseaddr

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'


def _contact(address):
    name, email = parseaddr(address)
    contact = {'email': email}
    if name:
        contact['name'] = name
    return contact


class BrevoAPIEmailBackend(BaseEmailBackend):
    def __init__(self, fail_silently=False, api_key=None, timeout=15, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = api_key or getattr(settings, 'BREVO_API_KEY', '')
        self.timeout = timeout

    def send_messages(self, email_messages):
        sent = 0
        for message in email_messages:
            try:
                self._send(message)
                sent += 1
            except Exception:
                logger.exception("brevo.send_failed subject=%r to=%s", message.subject, message.to)
                if not self.fail_silently:
                    raise
        return sent

    def _send(self, message):
        if not message.recipients():
            return
        payload = {
            'sender': _contact(message.from_email or settings.DEFAULT_FROM_EMAIL),
            'to': [_contact(a) for a in message.to],
            'subject': message.subject,
            'textContent': message.body or ' ',
        }
        if message.cc:
            payload['cc'] = [_contact(a) for a in message.cc]
        if message.bcc:
            payload['bcc'] = [_contact(a) for a in message.bcc]
        if message.reply_to:
            payload['replyTo'] = _contact(message.reply_to[0])
        for content, mimetype in getattr(message, 'alternatives', []) or []:
            if mimetype == 'text/html':
                payload['htmlContent'] = content
        attachments = []
        for attachment in message.attachments:
            if isinstance(attachment, tuple):
                filename, content = attachment[0], attachment[1]
                if isinstance(content, str):
                    content = content.encode()
                attachments.append({
                    'name': filename,
                    'content': base64.b64encode(content).decode('ascii'),
                })
        if attachments:
            payload['attachment'] = attachments

        response = requests.post(
            BREVO_API_URL,
            json=payload,
            headers={'api-key': self.api_key, 'accept': 'application/json'},
            timeout=self.timeout,
        )
        if response.status_code >= 300:
            raise RuntimeError(f"Brevo API HTTP {response.status_code}: {response.text[:300]}")
