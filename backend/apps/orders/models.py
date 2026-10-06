from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from apps.books.models import Book


class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('PAID', 'Payé'),
        ('SHIPPED', 'Expédié'),
        ('CANCELLED', 'Annulé'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)], default=0)
    coupon_code = models.CharField(max_length=50, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    
    shipping_address = models.TextField(blank=True, default='')
    shipping_phone = models.CharField(max_length=20, blank=True, default='')
    shipping_city = models.CharField(max_length=100, blank=True, default='')

    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Commande #{self.id} - {self.user.email}"

    @property
    def has_physical_book(self):
        """True si la commande contient au moins un livre papier."""
        return self.items.filter(format_purchased='PAPIER').exists()

    def release_coupon(self):
        """Rend une utilisation au coupon (commande annulée sans avoir été payée)."""
        if not self.coupon_code:
            return
        from django.db.models import F
        from apps.coupons.models import Coupon
        Coupon.objects.filter(code=self.coupon_code, usage_count__gt=0).update(
            usage_count=F('usage_count') - 1
        )


class OrderItem(models.Model):
    FORMAT_CHOICES = [
        ('PAPIER', 'Papier'),
        ('EBOOK', 'Ebook'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    book = models.ForeignKey(Book, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    format_purchased = models.CharField(
        max_length=10,
        choices=FORMAT_CHOICES,
        default='PAPIER',
        verbose_name="Format acheté",
        help_text="Format effectivement acheté (papier ou ebook)",
    )
    
    def __str__(self):
        return f"{self.book.title} x{self.quantity}"


class Payment(models.Model):
    PROVIDER_CHOICES = [
        ('MOBICASH', 'Moov Money'),  # ex-Mobicash, renomme apres rachat Moov Africa
        ('AIRTEL', 'Airtel Money'),
        ('CASH', 'Espèces'),
        ('VISA', 'Carte Visa'),
        ('BAMBOOPAY', 'BambooPay (page de paiement)'),
    ]

    # Mapping operateur Bamboo Pay -> provider
    BAMBOO_OPERATOR_MAP = {
        'moov_money': 'MOBICASH',
        'airtel_money': 'AIRTEL',
        'bamboopay': 'BAMBOOPAY',
    }

    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('SUCCESS', 'Réussi'),
        ('FAILED', 'Échoué'),
        ('EXPIRED', 'Expiré'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    transaction_id = models.CharField(max_length=128, unique=True, db_index=True,
                                       help_text="Référence Bamboo Pay (bamboo_ref)")
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    phone_number = models.CharField(max_length=20, blank=True, default='')
    bamboo_response = models.JSONField(default=dict, blank=True,
                                        help_text="Dernière réponse brute Bamboo Pay")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    finalized_at = models.DateTimeField(null=True, blank=True,
                                         help_text="Date de finalisation (success/failed/expired)")
    last_checked_at = models.DateTimeField(null=True, blank=True,
                                           help_text="Dernière vérification du statut auprès de Bamboo Pay")

    class Meta:
        ordering = ['-created_at']

    @property
    def is_final(self):
        """True si le statut est définitif (success/failed/expired)."""
        return self.status in ('SUCCESS', 'FAILED', 'EXPIRED')

    def __str__(self):
        return f"Paiement {self.transaction_id} - {self.status}"

class PaymentNotification(models.Model):
    """
    Notification (callback) reçue de Bamboo Pay.
    Sert à ignorer les doublons : chaque `idempotency_key` n'est traitée qu'une fois.
    """
    idempotency_key = models.CharField(max_length=255, unique=True)
    payment = models.ForeignKey(Payment, null=True, blank=True, on_delete=models.SET_NULL,
                                related_name='notifications')
    payload = models.JSONField(default=dict, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']
        verbose_name = "Notification Bamboo Pay"
        verbose_name_plural = "Notifications Bamboo Pay"

    def __str__(self):
        return f"Notification {self.idempotency_key}"
