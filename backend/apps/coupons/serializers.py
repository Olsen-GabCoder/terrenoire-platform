from rest_framework import serializers
from .models import Coupon


class CouponValidateSerializer(serializers.Serializer):
    """Validation d'un code promo."""
    code = serializers.CharField(max_length=50, trim_whitespace=True)

    def validate_code(self, value):
        from django.utils import timezone
        code = value.upper().strip()
        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Code promo invalide.")

        request = self.context.get('request')
        error = coupon.validation_error(user=getattr(request, 'user', None))
        if error:
            raise serializers.ValidationError(error)

        return code


class CouponSerializer(serializers.ModelSerializer):
    """Serializer complet pour CRUD admin."""
    discount_percent = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'discount_type', 'discount_value',
            'discount_percent', 'discount_amount',
            'min_order_amount', 'recipient_email', 'custom_message',
            'valid_from', 'valid_until',
            'is_active', 'max_uses', 'usage_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at', 'discount_percent', 'discount_amount']

    def get_discount_percent(self, obj):
        return float(obj.discount_value) if obj.discount_type == 'percent' else None

    def get_discount_amount(self, obj):
        return float(obj.discount_value) if obj.discount_type == 'fixed' else None

    def validate_code(self, value):
        return value.upper().strip()

    def validate(self, attrs):
        discount_type = attrs.get('discount_type', getattr(self.instance, 'discount_type', 'percent'))
        discount_value = attrs.get('discount_value', getattr(self.instance, 'discount_value', 0))
        if discount_type == 'percent' and discount_value is not None and discount_value > 100:
            raise serializers.ValidationError({'discount_value': 'Un pourcentage ne peut pas dépasser 100.'})
        return attrs
