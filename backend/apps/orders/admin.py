from django.contrib import admin
from .models import Order, OrderItem, Payment, PaymentNotification


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['book', 'quantity', 'price']
    can_delete = True


class PaymentInline(admin.StackedInline):
    model = Payment
    extra = 0
    readonly_fields = ['transaction_id', 'provider', 'status', 'amount', 'created_at']
    can_delete = True


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'user',
        'status',
        'subtotal',
        'shipping_cost',
        'discount_amount',
        'coupon_code',
        'total_amount',
        'shipping_city',
        'created_at',
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['id', 'user__email', 'shipping_address', 'shipping_city', 'shipping_phone']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['status']
    inlines = [OrderItemInline, PaymentInline]
    date_hierarchy = 'created_at'


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['transaction_id', 'order', 'provider', 'status', 'amount', 'created_at']
    list_filter = ['provider', 'status']
    search_fields = ['transaction_id', 'order__id']
    readonly_fields = ['created_at']


@admin.register(PaymentNotification)
class PaymentNotificationAdmin(admin.ModelAdmin):
    """Callbacks reçus de Bamboo Pay (lecture seule, pour le suivi et le support)."""
    list_display = ['idempotency_key', 'payment', 'received_at']
    search_fields = ['idempotency_key', 'payment__transaction_id']
    readonly_fields = ['idempotency_key', 'payment', 'payload', 'received_at']

    def has_add_permission(self, request):
        return False
