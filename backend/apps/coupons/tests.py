"""Tests pour l'app coupons."""
from decimal import Decimal
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Coupon


class CouponValidateTest(APITestCase):
    """Tests de validation des codes promo."""

    def setUp(self):
        Coupon.objects.create(code='TEST10', discount_type='percent', discount_value=10)

    def test_validate_success(self):
        response = self.client.post('/api/coupons/validate/', {'code': 'TEST10'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('valid'))
        self.assertEqual(response.data.get('discount_percent'), 10.0)

    def test_validate_invalid_code(self):
        response = self.client.post('/api/coupons/validate/', {'code': 'INVALID'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data.get('valid'))
