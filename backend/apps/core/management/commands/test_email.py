"""
Teste l'envoi d'email avec la configuration active (API Brevo, SMTP ou aucune).
Usage : python manage.py test_email votre@email.com
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Envoie un email de test et affiche la configuration d'envoi utilisée"

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Adresse email de destination')

    def handle(self, *args, **options):
        from django.conf import settings
        from django.core.mail import send_mail

        to = options['email']
        backend = settings.EMAIL_BACKEND
        modes = {
            'apps.core.email_backends.BrevoAPIEmailBackend': 'API Brevo (BREVO_API_KEY)',
            'django.core.mail.backends.smtp.EmailBackend': f"SMTP ({getattr(settings, 'EMAIL_HOST', '')})",
            'django.core.mail.backends.dummy.EmailBackend': 'AUCUN — ni BREVO_API_KEY ni EMAIL_HOST définis',
            'django.core.mail.backends.console.EmailBackend': 'console (DEBUG, rien n\'est envoyé)',
        }
        self.stdout.write(f"Mode d'envoi : {modes.get(backend, backend)}")
        self.stdout.write(f"Expéditeur   : {settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write(f"Envoi d'un email de test vers {to}...")

        try:
            send_mail(
                subject="Test d'envoi — Terre Noire Éditions",
                message="Ceci est un email de test. Si vous le recevez, l'envoi des e-mails fonctionne.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS("Email envoyé avec succès. Vérifiez votre boîte (et les spams)."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Erreur : {e}"))
