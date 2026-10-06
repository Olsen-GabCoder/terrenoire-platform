"""
Crée un utilisateur superuser (admin) de façon non interactive.

Usage (sans shell, ex. Render one-off job ou CI) :
  Voir backend/docs/CREATE_ADMIN.md pour les instructions.

Règles de sécurité :
- Le mot de passe ne doit jamais être en dur : il est lu depuis la variable
  d'environnement CREATE_ADMIN_PASSWORD uniquement.
- Si CREATE_ADMIN_PASSWORD n'est pas défini, un mot de passe aléatoire est généré
  et affiché une seule fois (à changer à la première connexion).
"""
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()


def _username_from_email(email):
    """Dérive un username unique à partir de l'email (pas de @ pour respecter le validateur)."""
    base = email.split("@")[0].lower().replace(".", "_")[:150]
    return base or "admin"


class Command(BaseCommand):
    help = (
        "Crée un superuser admin de façon non interactive. "
        "Mot de passe : variable d'environnement CREATE_ADMIN_PASSWORD (ou généré et affiché)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            type=str,
            default=os.getenv("CREATE_ADMIN_EMAIL", ""),
            help="Email de l'admin (obligatoire : --email ou variable CREATE_ADMIN_EMAIL)",
        )
        parser.add_argument(
            "--username",
            type=str,
            default=None,
            help="Username (défaut : dérivé de l'email)",
        )
        parser.add_argument(
            "--no-update",
            action="store_true",
            help="Ne pas mettre à jour le mot de passe si l'utilisateur existe déjà",
        )

    def handle(self, *args, **options):
        email = (options["email"] or "").strip().lower()
        if not email:
            self.stdout.write(
                self.style.ERROR(
                    "L'email est obligatoire : --email votre@email.com ou variable CREATE_ADMIN_EMAIL. "
                    "Voir backend/docs/CREATE_ADMIN.md"
                )
            )
            return

        username = (options.get("username") or "").strip() or _username_from_email(email)
        password = os.environ.get("CREATE_ADMIN_PASSWORD", "").strip()
        no_update = options["no_update"]

        # Génération d'un mot de passe aléatoire si aucune variable d'environnement
        if not password:
            from django.utils.crypto import get_random_string
            password = get_random_string(32)
            self.stdout.write(
                self.style.WARNING(
                    "CREATE_ADMIN_PASSWORD non défini : mot de passe temporaire généré. "
                    "Utilisez « Mot de passe oublié » pour le définir."
                )
            )
            # Le mot de passe n'est volontairement pas affiché (les logs de déploiement
            # sont conservés) : utilisez "Mot de passe oublié" pour le définir.

        if len(password) < 8:
            self.stdout.write(
                self.style.ERROR("Le mot de passe doit contenir au moins 8 caractères.")
            )
            return

        try:
            user = User.objects.filter(email__iexact=email).first()
            if user:
                if no_update:
                    self.stdout.write(
                        self.style.SUCCESS(f"L'utilisateur admin existe déjà : {email}")
                    )
                    return
                user.set_password(password)
                user.is_staff = True
                user.is_superuser = True
                user.is_active = True
                user.save(update_fields=["password", "is_staff", "is_superuser", "is_active"])
                self.stdout.write(
                    self.style.SUCCESS(f"Mot de passe et droits admin mis à jour pour : {email}")
                )
                return

            # Vérifier que le username est libre (éviter conflit avec email dérivé)
            if User.objects.filter(username=username).exists():
                username = f"{username}_{email.split('@')[0]}"
            if User.objects.filter(username=username).exists():
                base = username
                for i in range(100):
                    candidate = f"{base}{i}"
                    if not User.objects.filter(username=candidate).exists():
                        username = candidate
                        break

            user = User(
                username=username,
                email=email,
                is_staff=True,
                is_superuser=True,
                is_active=True,
            )
            user.set_password(password)
            user.full_clean()
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Superuser créé : {email} (username: {user.username})"))
        except ValidationError as e:
            self.stdout.write(self.style.ERROR(f"Validation : {e}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Erreur : {e}"))
