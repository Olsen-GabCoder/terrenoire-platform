from decimal import Decimal, ROUND_HALF_UP

from django.db import models
from django.core.validators import MinValueValidator


class Coupon(models.Model):
    """Code promo pour reduction sur les commandes."""
    DISCOUNT_TYPE_CHOICES = [
        ('percent', 'Pourcentage'),
        ('fixed', 'Montant fixe'),
    ]

    code = models.CharField(max_length=50, unique=True, verbose_name="Code")
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='percent', verbose_name="Type de reduction")
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], default=0, verbose_name="Valeur de reduction")
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Montant min. commande")
    valid_from = models.DateTimeField(null=True, blank=True, verbose_name="Valide a partir de")
    valid_until = models.DateTimeField(null=True, blank=True, verbose_name="Valide jusqu'a")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    max_uses = models.PositiveIntegerField(null=True, blank=True, verbose_name="Nombre max d'utilisations")
    usage_count = models.PositiveIntegerField(default=0, verbose_name="Utilisations")
    status = models.CharField(max_length=20, default='active')
    custom_message = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='created_coupons')
    recipient = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='received_coupons')
    recipient_email = models.EmailField(null=True, blank=True, db_index=True)
    used_by = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='used_coupons')
    used_at = models.DateTimeField(null=True, blank=True)
    used_on_order = models.ForeignKey('orders.Order', null=True, blank=True, on_delete=models.SET_NULL)
    organization = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='org_coupons')
    template = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='generated_coupons')
    provider_profile = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='provider_coupons')

    class Meta:
        verbose_name = "Code promo"
        verbose_name_plural = "Codes promo"
        ordering = ['-created_at']

    @property
    def discount_percent(self):
        return self.discount_value if self.discount_type == 'percent' else None

    @property
    def discount_amount(self):
        return self.discount_value if self.discount_type == 'fixed' else None

    def validation_error(self, subtotal=None, user=None):
        """
        Retourne un message d'erreur si le coupon n'est pas utilisable, sinon None.
        `subtotal` et `user` sont optionnels (la validation publique ne les connaît pas toujours).
        """
        from django.utils import timezone
        if not self.is_active:
            return "Ce code promo n'est plus actif."
        now = timezone.now()
        if self.valid_from and now < self.valid_from:
            return "Ce code promo n'est pas encore valide."
        if self.valid_until and now > self.valid_until:
            return "Ce code promo a expire."
        if self.max_uses is not None and self.usage_count >= self.max_uses:
            return "Ce code promo a atteint sa limite d'utilisation."
        if self.recipient_email and user is not None and getattr(user, 'is_authenticated', False):
            if (user.email or '').strip().lower() != self.recipient_email.strip().lower():
                return "Ce code promo est reserve a un autre client."
        if subtotal is not None and self.min_order_amount and Decimal(subtotal) < self.min_order_amount:
            return f"Ce code promo necessite un minimum de commande de {int(self.min_order_amount)} FCFA."
        return None

    def compute_discount(self, subtotal):
        """Montant de la remise (Decimal) pour un sous-total donné, jamais supérieur au sous-total."""
        subtotal = Decimal(subtotal)
        if self.discount_type == 'percent':
            percent = min(max(self.discount_value, Decimal('0')), Decimal('100'))
            discount = (subtotal * percent / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        else:
            discount = self.discount_value
        return min(max(discount, Decimal('0')), subtotal)

    def __str__(self):
        if self.discount_type == 'percent':
            return f"{self.code} (-{self.discount_value}%)"
        return f"{self.code} (-{self.discount_value} FCFA)"
