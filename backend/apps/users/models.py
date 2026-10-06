# backend/apps/users/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator


class User(AbstractUser):
    """
    Modèle utilisateur personnalisé pour la Maison d'Édition
    Hérite de AbstractUser et ajoute les champs spécifiques au contexte africain
    (Mobile Money, adresse complète, etc.)
    """
    
    # Validateur pour le numero de telephone
    phone_regex = RegexValidator(
        regex=r'^(\+[1-9]\d{7,14}|0\d{7,9})$',
        message="Format accepté : +24174301639 (international) ou 074301639 (local)."
    )
    
    # Champs supplémentaires - TÉLÉPHONE CORRIGÉ
    phone_number = models.CharField(
        validators=[phone_regex],
        max_length=20,
        unique=True,
        null=True,  # ✅ AJOUTÉ: Permet NULL en base de données
        blank=True,  # ✅ AJOUTÉ: Permet champ vide dans les formulaires
        verbose_name="Numéro de téléphone",
        help_text="Format international : +24174301639 (nécessaire pour commander)"
    )
    
    address = models.TextField(
        blank=True,
        null=True,
        verbose_name="Adresse complète",
        help_text="Rue, avenue, numéro, quartier"
    )
    
    city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Ville"
    )
    
    country = models.CharField(
        max_length=100,
        default="Gabon",
        verbose_name="Pays"
    )
    
    profile_image = models.ImageField(
        upload_to='users/avatars/',
        blank=True,
        null=True,
        verbose_name="Photo de profil"
    )

    # Préférences utilisateur
    receive_newsletter = models.BooleanField(
        default=False,
        verbose_name="Recevoir la newsletter"
    )
    
    # Métadonnées
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'inscription"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière modification"
    )
    
    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def get_full_name(self):
        """
        Retourne le nom complet de l'utilisateur
        """
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.username
    
    @property
    def has_complete_profile(self):
        """
        Vérifie si le profil est complet (nécessaire pour passer commande)
        """
        return all([
            self.first_name,
            self.last_name,
            self.phone_number,
            self.address,
            self.city,
        ])
    
    @property
    def full_address(self):
        """
        Retourne l'adresse complète formatée
        """
        parts = []
        if self.address:
            parts.append(self.address)
        if self.city:
            parts.append(self.city)
        if self.country:
            parts.append(self.country)
        return ", ".join(parts) if parts else "Adresse non renseignée"