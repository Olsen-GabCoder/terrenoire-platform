from rest_framework import serializers
from .models import Order, OrderItem, Payment
from apps.books.serializers import BookListSerializer
from apps.books.models import Book
from apps.coupons.models import Coupon
from apps.core.models import SiteConfig
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from decimal import Decimal


class OrderItemSerializer(serializers.ModelSerializer):
    book = BookListSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(
        queryset=Book.objects.all(),
        source='book',
        write_only=True
    )
    
    class Meta:
        model = OrderItem
        fields = ['id', 'book', 'book_id', 'quantity', 'price', 'format_purchased']
        read_only_fields = ['id', 'price']


class OrderItemInputSerializer(serializers.Serializer):
    """Article envoyé par le client : seuls l'id, la quantité et le format sont pris en compte."""
    book_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=100)
    format_purchased = serializers.ChoiceField(choices=['PAPIER', 'EBOOK'], default='PAPIER')


class OrderCreateSerializer(serializers.Serializer):
    items = OrderItemInputSerializer(many=True, write_only=True)
    shipping_address = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    shipping_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    shipping_city = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True, min_length=0)
    
    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("La commande doit contenir au moins un article.")

        if len(value) > 50:
            raise serializers.ValidationError("Une commande ne peut pas contenir plus de 50 articles.")

        # Ebook = 1 exemplaire max
        for item in value:
            if item.get('format_purchased') == 'EBOOK' and item['quantity'] > 1:
                raise serializers.ValidationError(
                    "Un ebook ne peut etre commande qu'en un seul exemplaire."
                )

        # Verifier que le livre propose bien l'ebook si demande
        ebook_items = [item for item in value if item.get('format_purchased') == 'EBOOK']
        if ebook_items:
            ebook_book_ids = [item['book_id'] for item in ebook_items]
            books_without_ebook = Book.objects.filter(
                id__in=ebook_book_ids, has_ebook=False
            ).values_list('id', flat=True)
            if books_without_ebook:
                raise serializers.ValidationError(
                    "Certains livres ne sont pas disponibles en ebook."
                )

        return value

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.has_complete_profile:
            missing = []
            if not user.first_name:
                missing.append('prenom')
            if not user.last_name:
                missing.append('nom')
            if not user.phone_number:
                missing.append('telephone')
            if not user.address:
                missing.append('adresse')
            if not user.city:
                missing.append('ville')
            raise serializers.ValidationError(
                f"Veuillez completer votre profil avant de commander. "
                f"Champs manquants : {', '.join(missing)}."
            )

        # Verifier si la commande contient des livres papier
        items = attrs.get('items', [])
        has_physical = any(item.get('format_purchased', 'PAPIER') == 'PAPIER' for item in items)

        if has_physical:
            if not attrs.get('shipping_address', '').strip():
                raise serializers.ValidationError({
                    'shipping_address': "L'adresse est requise pour une commande avec livre papier."
                })
            if not attrs.get('shipping_city', '').strip():
                raise serializers.ValidationError({
                    'shipping_city': 'La ville est requise pour une commande avec livre papier.'
                })
            if not attrs.get('shipping_phone', '').strip():
                raise serializers.ValidationError({
                    'shipping_phone': 'Le téléphone est requis pour une commande avec livre papier.'
                })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = self.context['request'].user

        subtotal = Decimal('0')
        order_items = []
        book_ids = [item['book_id'] for item in items_data]
        books_map = {b.id: b for b in Book.objects.filter(id__in=book_ids).select_related('category', 'author')}

        for item_data in items_data:
            book = books_map.get(item_data['book_id'])
            if not book:
                raise serializers.ValidationError(f"Livre id={item_data['book_id']} introuvable.")
            if not book.available:
                raise serializers.ValidationError(f"Le livre '{book.title}' n'est plus disponible.")

            fmt = item_data.get('format_purchased', 'PAPIER')
            quantity = item_data['quantity']
            price = book.ebook_price if fmt == 'EBOOK' else book.price
            subtotal += price * quantity

            order_items.append({
                'book': book,
                'quantity': quantity,
                'price': price,
                'format_purchased': fmt,
            })

        config = SiteConfig.get_config()
        shipping_free_threshold = config.shipping_free_threshold
        shipping_cost_default = config.shipping_cost
        has_physical = any(item['format_purchased'] == 'PAPIER' for item in order_items)
        if not has_physical:
            shipping_cost = Decimal('0')
        elif subtotal >= shipping_free_threshold:
            shipping_cost = Decimal('0')
        else:
            shipping_cost = shipping_cost_default
        discount_amount = Decimal('0')
        coupon_code = validated_data.get('coupon_code', '').strip().upper()

        if coupon_code:
            try:
                coupon = Coupon.objects.select_for_update().get(code=coupon_code)
            except Coupon.DoesNotExist:
                raise serializers.ValidationError({'coupon_code': 'Code promo invalide.'})
            error = coupon.validation_error(subtotal=subtotal, user=user)
            if error:
                raise serializers.ValidationError({'coupon_code': error})
            discount_amount = coupon.compute_discount(subtotal)
            Coupon.objects.filter(pk=coupon.pk).update(usage_count=F('usage_count') + 1)

        total_amount = max(Decimal('0'), subtotal - discount_amount + shipping_cost)

        order = Order.objects.create(
            user=user,
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            discount_amount=discount_amount,
            coupon_code=coupon_code or None,
            total_amount=total_amount,
            shipping_address=validated_data['shipping_address'],
            shipping_phone=validated_data['shipping_phone'],
            shipping_city=validated_data['shipping_city']
        )

        for item_data in order_items:
            OrderItem.objects.create(order=order, **item_data)

        # Envoi email de confirmation
        try:
            from apps.core.email import send_order_confirmation
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"[EMAIL] Envoi confirmation commande #{order.id} a {order.user.email}...")
            result = send_order_confirmation(order)
            logger.info(f"[EMAIL] Resultat: {result}")
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"[EMAIL] ECHEC envoi email commande #{order.id}: {e}", exc_info=True)

        return order


class OrderUserSerializer(serializers.Serializer):
    def to_representation(self, instance):
        return {
            'id': instance.id,
            'username': instance.username,
            'email': instance.email or '',
            'first_name': getattr(instance, 'first_name', '') or '',
            'last_name': getattr(instance, 'last_name', '') or '',
            'phone_number': getattr(instance, 'phone_number', '') or '',
            'full_name': instance.get_full_name() or instance.username,
        }


class OrderListSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user = OrderUserSerializer(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id',
            'status',
            'status_display',
            'subtotal',
            'shipping_cost',
            'discount_amount',
            'coupon_code',
            'total_amount',
            'shipping_address',
            'shipping_phone',
            'shipping_city',
            'created_at',
            'updated_at',
            'items',
            'user',
        ]
        read_only_fields = [
            'id', 'status_display', 'subtotal', 'shipping_cost', 'discount_amount', 'coupon_code',
            'total_amount', 'shipping_address', 'shipping_phone', 'shipping_city',
            'created_at', 'updated_at', 'items', 'user',
        ]


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer minimal pour la mise à jour du statut par l'admin."""
    class Meta:
        model = Order
        fields = ['status']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'transaction_id', 'provider', 'status', 'amount', 'created_at']
        read_only_fields = ['id', 'created_at']