"""Tests pour l'app orders."""
from decimal import Decimal
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.books.models import Book, Category, Author
from apps.coupons.models import Coupon
from apps.core.models import SiteConfig
from apps.orders.models import Order

User = get_user_model()


class OrderCreateTest(APITestCase):
    """Tests de creation de commande."""

    def setUp(self):
        SiteConfig.get_config()
        self.user = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='TestPass123!',
            first_name='Buyer',
            last_name='Test',
            phone_number='+24112345678',
            address='123 Rue Test',
            city='Port-Gentil',
        )
        self.user_incomplete = User.objects.create_user(
            username='incomplete',
            email='incomplete@example.com',
            password='TestPass123!',
        )
        cat, _ = Category.objects.get_or_create(name='Roman', defaults={'slug': 'roman'})
        auth, _ = Author.objects.get_or_create(full_name='Auteur Test', defaults={'slug': 'auteur-test'})
        self.book = Book.objects.create(
            title='Livre Test',
            slug='livre-test',
            reference='REF001',
            description='Desc',
            price=Decimal('5000'),
            available=True,
            category=cat,
            author=auth,
        )

    def _order_payload(self):
        return {
            'items': [{'book_id': self.book.id, 'quantity': 1}],
            'shipping_address': '123 Rue Test',
            'shipping_phone': '+24112345678',
            'shipping_city': 'Port-Gentil',
        }

    def test_create_order_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/orders/', self._order_payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, msg=response.data)
        self.assertIn('id', response.data)

    def test_create_order_unauthenticated(self):
        response = self.client.post('/api/orders/', self._order_payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_order_incomplete_profile(self):
        """Un utilisateur sans profil complet ne peut pas commander."""
        self.client.force_authenticate(user=self.user_incomplete)
        response = self.client.post('/api/orders/', self._order_payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('profil', str(response.data).lower())

    def test_create_order_with_valid_coupon(self):
        """Une commande avec coupon valide applique la reduction."""
        Coupon.objects.create(code='PROMO10', discount_type='percent', discount_value=10, is_active=True)
        self.client.force_authenticate(user=self.user)
        payload = self._order_payload()
        payload['coupon_code'] = 'PROMO10'
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertGreater(float(response.data.get('discount_amount', 0)), 0)

    def test_create_order_with_expired_coupon(self):
        """Un coupon expire est refuse avec un message explicite."""
        Coupon.objects.create(
            code='EXPIRED',
            discount_type='percent', discount_value=10,
            is_active=True,
            valid_until=timezone.now() - timezone.timedelta(days=1),
        )
        self.client.force_authenticate(user=self.user)
        payload = self._order_payload()
        payload['coupon_code'] = 'EXPIRED'
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('coupon_code', response.data)
        self.assertFalse(Order.objects.exists())

    def test_create_order_with_maxed_coupon(self):
        """Un coupon ayant atteint max_uses est refuse."""
        Coupon.objects.create(
            code='MAXED', discount_type='percent', discount_value=20, is_active=True, max_uses=1, usage_count=1,
        )
        self.client.force_authenticate(user=self.user)
        payload = self._order_payload()
        payload['coupon_code'] = 'MAXED'
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('coupon_code', response.data)
        self.assertFalse(Order.objects.exists())
