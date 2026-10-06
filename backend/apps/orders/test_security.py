"""Tests de non-régression des failles de sécurité sur les commandes et paiements."""
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.books.models import Author, Book, Category
from apps.coupons.models import Coupon
from apps.core.models import SiteConfig
from apps.orders.models import Order, OrderItem, Payment

User = get_user_model()


def bamboo_result(raw_status, amount=None):
    tx = {'status': raw_status}
    if amount is not None:
        tx['amount'] = amount
    return {'code': 200, 'transaction': tx}


class BaseOrderTestCase(APITestCase):
    def setUp(self):
        SiteConfig.get_config()
        self.user = User.objects.create_user(
            username='buyer', email='buyer@example.com', password='TestPass123!',
            first_name='Buyer', last_name='Test', phone_number='+24174301639',
            address='123 Rue Test', city='Port-Gentil',
        )
        self.other = User.objects.create_user(
            username='other', email='other@example.com', password='TestPass123!',
            phone_number='+24162654321',
        )
        self.admin = User.objects.create_user(
            username='admin', email='admin@example.com', password='TestPass123!',
            is_staff=True, phone_number='+24166000000',
        )
        cat, _ = Category.objects.get_or_create(slug='roman', defaults={'name': 'Roman'})
        author, _ = Author.objects.get_or_create(slug='auteur-sec', defaults={'full_name': 'Auteur Sec'})
        self.book = Book.objects.create(
            title='Livre Sec', slug='livre-sec', reference='SEC001', description='Desc',
            price=Decimal('5000'), available=True, category=cat, author=author,
            has_ebook=True, ebook_price=Decimal('3000'),
        )
        self.order = Order.objects.create(
            user=self.user, subtotal=Decimal('5000'), total_amount=Decimal('5000'),
        )
        OrderItem.objects.create(order=self.order, book=self.book, quantity=1, price=Decimal('5000'))
        self.payment = Payment.objects.create(
            order=self.order, transaction_id='TXN-TEST-1', provider='AIRTEL',
            status='PENDING', amount=Decimal('5000'),
        )

    def _order_payload(self, **extra):
        payload = {
            'items': [{'book_id': self.book.id, 'quantity': 1}],
            'shipping_address': '123 Rue Test',
            'shipping_phone': '+24174301639',
            'shipping_city': 'Port-Gentil',
        }
        payload.update(extra)
        return payload


class WebhookTests(BaseOrderTestCase):
    URL = '/api/payments/webhook/'

    def test_forged_webhook_does_not_mark_order_paid(self):
        """Le statut envoyé dans le webhook est ignoré : Bamboo dit 'pending'."""
        with mock.patch('apps.orders.views.get_bamboo_service') as svc:
            svc.return_value.check_status.return_value = bamboo_result('pending')
            response = self.client.post(self.URL, {'reference': 'TXN-TEST-1', 'status': 'success'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.payment.refresh_from_db()
        self.assertEqual(self.order.status, 'PENDING')
        self.assertEqual(self.payment.status, 'PENDING')
        svc.return_value.check_status.assert_called_once_with('TXN-TEST-1')

    def test_webhook_confirmed_by_bamboo_marks_order_paid(self):
        with mock.patch('apps.orders.views.get_bamboo_service') as svc:
            svc.return_value.check_status.return_value = bamboo_result('completed', amount='5000')
            response = self.client.post(self.URL, {'reference': 'TXN-TEST-1'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'PAID')

    def test_webhook_amount_mismatch_is_rejected(self):
        with mock.patch('apps.orders.views.get_bamboo_service') as svc:
            svc.return_value.check_status.return_value = bamboo_result('completed', amount='100')
            self.client.post(self.URL, {'reference': 'TXN-TEST-1'}, format='json')
        self.order.refresh_from_db()
        self.payment.refresh_from_db()
        self.assertEqual(self.order.status, 'PENDING')
        self.assertEqual(self.payment.status, 'PENDING')

    def test_webhook_does_not_revive_cancelled_order(self):
        self.order.status = 'CANCELLED'
        self.order.save()
        with mock.patch('apps.orders.views.get_bamboo_service') as svc:
            svc.return_value.check_status.return_value = bamboo_result('completed')
            self.client.post(self.URL, {'reference': 'TXN-TEST-1'}, format='json')
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'CANCELLED')

    @mock.patch.dict('os.environ', {'BAMBOO_WEBHOOK_SECRET': 's3cret'})
    def test_webhook_secret_token_required(self):
        with mock.patch('apps.orders.views.get_bamboo_service') as svc:
            svc.return_value.check_status.return_value = bamboo_result('completed')
            bad = self.client.post(self.URL, {'reference': 'TXN-TEST-1'}, format='json')
            good = self.client.post(self.URL + '?token=s3cret', {'reference': 'TXN-TEST-1'}, format='json')
        self.assertEqual(bad.status_code, 403)
        self.assertEqual(good.status_code, 200)

    def test_webhook_recovers_expired_payment_when_bamboo_confirms(self):
        self.payment.status = 'EXPIRED'
        self.payment.save()
        with mock.patch('apps.orders.views.get_bamboo_service') as svc:
            svc.return_value.check_status.return_value = bamboo_result('success')
            self.client.post(self.URL, {'reference': 'TXN-TEST-1'}, format='json')
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'PAID')


class PaymentAndOrderEndpointTests(BaseOrderTestCase):
    def test_client_cannot_create_payment(self):
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/payments/', {
            'order_id': self.order.id, 'transaction_id': 'FAKE', 'provider': 'CASH',
            'status': 'SUCCESS', 'amount': 1,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'PENDING')

    def test_owner_cannot_put_or_delete_order(self):
        self.client.force_authenticate(self.user)
        put = self.client.put(f'/api/orders/{self.order.id}/', {'status': 'PAID'}, format='json')
        delete = self.client.delete(f'/api/orders/{self.order.id}/')
        patch = self.client.patch(f'/api/orders/{self.order.id}/', {'status': 'PAID'}, format='json')
        self.assertEqual(put.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(delete.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(patch.status_code, status.HTTP_403_FORBIDDEN)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'PENDING')

    def test_admin_can_patch_order_status(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f'/api/orders/{self.order.id}/', {'status': 'PAID'}, format='json')
        self.assertEqual(response.status_code, 200)

    def test_cancel_refused_while_payment_in_progress(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(f'/api/orders/{self.order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_cancel_allowed_after_payment_expired(self):
        Payment.objects.filter(pk=self.payment.pk).update(created_at=timezone.now() - timedelta(minutes=30))
        self.client.force_authenticate(self.user)
        response = self.client.post(f'/api/orders/{self.order.id}/cancel/')
        self.assertEqual(response.status_code, 200)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, 'EXPIRED')


class OrderValidationTests(BaseOrderTestCase):
    def test_string_quantity_is_accepted(self):
        self.client.force_authenticate(self.user)
        payload = self._order_payload(items=[{'book_id': self.book.id, 'quantity': '2'}])
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)

    def test_invalid_quantity_returns_400(self):
        self.client.force_authenticate(self.user)
        for qty in ('abc', 0, 1000):
            payload = self._order_payload(items=[{'book_id': self.book.id, 'quantity': qty}])
            response = self.client.post('/api/orders/', payload, format='json')
            self.assertEqual(response.status_code, 400, qty)

    def test_percent_coupon_applies_discount(self):
        Coupon.objects.create(code='DIX', discount_type='percent', discount_value=10)
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/orders/', self._order_payload(coupon_code='dix'), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Decimal(response.data['discount_amount']), Decimal('500.00'))

    def test_fixed_coupon_applies_discount(self):
        Coupon.objects.create(code='MILLE', discount_type='fixed', discount_value=1000)
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/orders/', self._order_payload(coupon_code='MILLE'), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Decimal(response.data['discount_amount']), Decimal('1000.00'))

    def test_coupon_min_order_amount_enforced(self):
        Coupon.objects.create(code='GROS', discount_type='fixed', discount_value=1000, min_order_amount=20000)
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/orders/', self._order_payload(coupon_code='GROS'), format='json')
        self.assertEqual(response.status_code, 400)

    def test_cancel_releases_coupon(self):
        coupon = Coupon.objects.create(code='UNE', discount_type='percent', discount_value=10, max_uses=1)
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/orders/', self._order_payload(coupon_code='UNE'), format='json')
        coupon.refresh_from_db()
        self.assertEqual(coupon.usage_count, 1)
        self.client.post(f"/api/orders/{response.data['id']}/cancel/")
        coupon.refresh_from_db()
        self.assertEqual(coupon.usage_count, 0)


class CatalogPermissionTests(BaseOrderTestCase):
    def test_regular_user_cannot_modify_catalog(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.patch(f'/api/books/{self.book.id}/', {'price': '1'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(f'/api/books/{self.book.id}/').status_code, 403)
        self.assertEqual(self.client.post('/api/categories/', {'name': 'Pirate'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(f'/api/authors/{self.book.author_id}/').status_code, 403)
        self.book.refresh_from_db()
        self.assertEqual(self.book.price, Decimal('5000'))

    def test_admin_can_modify_catalog(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f'/api/books/{self.book.id}/', {'price': '4500'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

    def test_catalog_is_publicly_readable(self):
        self.assertEqual(self.client.get('/api/books/').status_code, 200)
        self.assertEqual(self.client.get('/api/categories/').status_code, 200)

    def test_user_can_still_post_review(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(f'/api/books/{self.book.id}/reviews/', {'rating': 5, 'comment': 'Super'}, format='json')
        self.assertIn(response.status_code, (200, 201), response.data)


@override_settings(DEBUG=False, CORS_ALLOWED_ORIGINS=['https://terrenoireeditions.com'], CSRF_TRUSTED_ORIGINS=[])
class CookieCsrfTests(BaseOrderTestCase):
    def _cookie_client(self):
        client = APIClient()
        client.cookies['access_token'] = str(RefreshToken.for_user(self.user).access_token)
        return client

    def test_cross_site_post_with_cookie_is_rejected(self):
        response = self._cookie_client().post(
            '/api/orders/', self._order_payload(), format='json',
            HTTP_ORIGIN='https://evil.example', secure=True,
        )
        self.assertEqual(response.status_code, 403)

    def test_trusted_origin_post_with_cookie_is_accepted(self):
        response = self._cookie_client().post(
            '/api/orders/', self._order_payload(), format='json',
            HTTP_ORIGIN='https://terrenoireeditions.com', secure=True,
        )
        self.assertEqual(response.status_code, 201, response.data)


class TokenRefreshTests(APITestCase):
    def test_invalid_refresh_token_returns_401(self):
        response = self.client.post('/api/token/refresh/', {'refresh': 'garbage'}, format='json')
        self.assertEqual(response.status_code, 401)

    def test_refresh_rotates_and_blacklists(self):
        user = User.objects.create_user(username='r', email='r@example.com', password='TestPass123!', phone_number='+24165111111')
        refresh = str(RefreshToken.for_user(user))
        first = self.client.post('/api/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(first.status_code, 200)
        self.assertIn('refresh', first.data)
        reuse = self.client.post('/api/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(reuse.status_code, 401)


class EbookAccessTests(BaseOrderTestCase):
    def _can_read(self, user):
        from apps.books.access import user_can_read_ebook
        return user_can_read_ebook(user, self.book)

    def test_paper_purchase_does_not_unlock_ebook(self):
        self.order.status = 'PAID'
        self.order.save()
        self.assertFalse(self._can_read(self.user))

    def test_ebook_purchase_unlocks_and_survives_shipping(self):
        OrderItem.objects.filter(order=self.order).update(format_purchased='EBOOK')
        self.order.status = 'PAID'
        self.order.save()
        self.assertTrue(self._can_read(self.user))
        self.order.status = 'SHIPPED'
        self.order.save()
        self.assertTrue(self._can_read(self.user))
        self.assertFalse(self._can_read(self.other))
