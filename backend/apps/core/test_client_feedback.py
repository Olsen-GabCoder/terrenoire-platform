"""Tests des retours client après mise en production (V1.2)."""
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.admin.sites import site as admin_site
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.mail import EmailMultiAlternatives
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.books.models import Author, Book, Category
from apps.core.models import SiteConfig
from apps.manuscripts.models import Manuscript
from apps.orders.models import Order, Payment
from apps.orders.views import normalize_gabon_phone

User = get_user_model()


class RegistrationTests(APITestCase):
    """Point 5 : plus de « Aucun compte actif… » après une inscription réussie."""

    def test_register_returns_session_even_with_uppercase_username(self):
        response = self.client.post('/api/users/register/', {
            'username': 'Olsen_Gab', 'email': 'Olsen@Example.com',
            'password': 'Sup3rSecret!x', 'password_confirm': 'Sup3rSecret!x',
            'first_name': 'Olsen', 'last_name': 'Gab',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'olsen_gab')

    def test_login_with_original_case_works(self):
        User.objects.create_user(username='olsen_gab', email='o@example.com', password='Sup3rSecret!x')
        response = self.client.post('/api/token/', {'username': 'Olsen_Gab', 'password': 'Sup3rSecret!x'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)

    def test_wrong_password_still_fails(self):
        User.objects.create_user(username='olsen_gab', email='o@example.com', password='Sup3rSecret!x')
        response = self.client.post('/api/token/', {'username': 'olsen_gab', 'password': 'nope'}, format='json')
        self.assertEqual(response.status_code, 401)


class RotatingSelectionTests(APITestCase):
    """Point 6 : la sélection change à chaque période, mais reste stable pendant la période."""

    def setUp(self):
        cat, _ = Category.objects.get_or_create(slug='roman', defaults={'name': 'Roman'})
        author = Author.objects.create(full_name='A', slug='a-sel')
        for i in range(30):
            Book.objects.create(
                title=f'Livre {i}', slug=f'livre-sel-{i}', reference=f'SEL{i:03d}', description='d',
                price=Decimal('1000'), available=True, category=cat, author=author,
            )
        config = SiteConfig.get_config()
        config.selection_rotation_hours = 24
        config.selection_source = 'all'
        config.save()

    def _ids_at(self, when):
        from django.core.cache import cache
        cache.clear()
        with mock.patch('django.utils.timezone.now', return_value=when):
            response = self.client.get('/api/books/featured/')
        self.assertEqual(response.status_code, 200)
        return [b['id'] for b in response.data]

    def test_selection_changes_between_days_and_is_stable_within_a_day(self):
        day1 = timezone.now().replace(hour=1, minute=0)
        same_day = day1 + timedelta(hours=5)
        next_day = day1 + timedelta(days=1)
        first = self._ids_at(day1)
        self.assertEqual(len(first), 6)
        self.assertEqual(first, self._ids_at(same_day))
        self.assertNotEqual(first, self._ids_at(next_day))

    def test_rotation_can_be_disabled(self):
        config = SiteConfig.get_config()
        config.selection_rotation_hours = 0
        config.save()
        now = timezone.now()
        self.assertEqual(self._ids_at(now), self._ids_at(now + timedelta(days=3)))

    def test_admin_can_configure_rotation(self):
        admin = User.objects.create_user(username='adm', email='adm@example.com', password='x', is_staff=True)
        self.client.force_authenticate(admin)
        response = self.client.patch('/api/config/delivery/', {'selection_rotation_hours': 168}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(SiteConfig.get_config().selection_rotation_hours, 168)
        bad = self.client.patch('/api/config/delivery/', {'selection_source': 'nimporte'}, format='json')
        self.assertEqual(bad.status_code, 400)

    def test_list_exposes_has_excerpt(self):
        response = self.client.get('/api/books/')
        self.assertIn('has_excerpt', response.data['results'][0])


class PhoneNormalizationTests(TestCase):
    """Point 8 : numéros saisis avec indicatif, et opérateur incohérent."""

    def test_accepts_common_formats(self):
        for raw in ('074301639', '74301639', '+241 74 30 16 39', '24174301639', '00241 74301639'):
            self.assertEqual(normalize_gabon_phone(raw, 'airtel_money'), ('074301639', None), raw)

    def test_operator_mismatch_is_explained(self):
        phone, error = normalize_gabon_phone('074301639', 'moov_money')
        self.assertIsNone(phone)
        self.assertIn('Airtel Money', error)

    def test_invalid_number(self):
        self.assertIsNone(normalize_gabon_phone('1234', 'airtel_money')[0])


class CheckStatusRobustnessTests(APITestCase):
    """Point 8 : pas de faux échec juste après l'initiation, pas d'expiration à l'aveugle."""

    def setUp(self):
        self.user = User.objects.create_user(username='buyer', email='b@example.com', password='x', phone_number='+24100000001')
        self.order = Order.objects.create(user=self.user, total_amount=Decimal('5000'), subtotal=Decimal('5000'))
        self.payment = Payment.objects.create(
            order=self.order, transaction_id='TXN-CS-1', provider='AIRTEL', status='PENDING', amount=Decimal('5000'),
        )
        self.client.force_authenticate(self.user)
        self.url = '/api/payments/check-status/TXN-CS-1/'

    def _check(self, result):
        with mock.patch('apps.orders.views.get_bamboo_service') as svc:
            svc.return_value.check_status.return_value = result
            return self.client.post(self.url)

    def test_transaction_not_yet_known_stays_pending(self):
        response = self._check({'code': 404, 'message': 'not found'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'PENDING')

    def test_late_confirmation_is_accepted_instead_of_expired(self):
        Payment.objects.filter(pk=self.payment.pk).update(created_at=timezone.now() - timedelta(minutes=11))
        response = self._check({'code': 200, 'transaction': {'status': 'completed'}})
        self.assertEqual(response.data['status'], 'SUCCESS')
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'PAID')

    def test_still_pending_after_delay_expires(self):
        Payment.objects.filter(pk=self.payment.pk).update(created_at=timezone.now() - timedelta(minutes=11))
        response = self._check({'code': 200, 'transaction': {'status': 'pending'}})
        self.assertEqual(response.data['status'], 'EXPIRED')


@override_settings(ADMIN_EMAIL='editions@example.com')
class AutomaticEmailTests(APITestCase):
    """Point 10 : e-mails automatiques."""

    def _manuscript(self):
        return Manuscript.objects.create(
            title='Le fleuve', author_name='Awa', email='awa@example.com', phone_number='074000000',
            description='Un roman', terms_accepted=True,
            file=SimpleUploadedFile('m.pdf', b'%PDF-1.4 test', content_type='application/pdf'),
        )

    def test_submission_sends_ack_to_author_and_notice_to_admin(self):
        self._manuscript()
        recipients = [m.to[0] for m in mail.outbox]
        self.assertIn('awa@example.com', recipients)
        self.assertIn('editions@example.com', recipients)

    def test_each_status_change_notifies_author(self):
        manuscript = self._manuscript()
        mail.outbox.clear()
        for new_status in ('REVIEWING', 'ACCEPTED'):
            manuscript.status = new_status
            manuscript.save()
        self.assertEqual(len(mail.outbox), 2)
        self.assertTrue(all(m.to == ['awa@example.com'] for m in mail.outbox))

    def test_saving_without_status_change_sends_nothing(self):
        manuscript = self._manuscript()
        mail.outbox.clear()
        manuscript.description = 'Modifié'
        manuscript.save()
        self.assertEqual(len(mail.outbox), 0)

    def test_status_change_from_django_admin_list_notifies_author(self):
        """La liste éditable de l'admin Django passe aussi par save()."""
        manuscript = self._manuscript()
        mail.outbox.clear()
        model_admin = admin_site._registry[Manuscript]
        self.assertIn('status', model_admin.list_editable)
        manuscript.status = 'REJECTED'
        manuscript.save(update_fields=['status'])
        self.assertEqual(len(mail.outbox), 1)

    def test_registration_sends_welcome(self):
        self.client.post('/api/users/register/', {
            'username': 'newbie', 'email': 'newbie@example.com',
            'password': 'Sup3rSecret!x', 'password_confirm': 'Sup3rSecret!x',
            'first_name': 'New', 'last_name': 'Bie',
        }, format='json')
        self.assertIn(['newbie@example.com'], [m.to for m in mail.outbox])

    def test_password_change_sends_security_email(self):
        user = User.objects.create_user(username='pw', email='pw@example.com', password='OldPassw0rd!x')
        self.client.force_authenticate(user)
        response = self.client.put('/api/users/me/change-password/', {
            'old_password': 'OldPassw0rd!x', 'new_password': 'NewPassw0rd!y', 'new_password_confirm': 'NewPassw0rd!y',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn(['pw@example.com'], [m.to for m in mail.outbox])


class BrevoBackendTests(TestCase):
    def test_sends_html_email_through_brevo_api(self):
        from apps.core.email_backends import BrevoAPIEmailBackend
        msg = EmailMultiAlternatives('Sujet', 'texte', 'Terre Noire <contact@example.com>', ['a@example.com'])
        msg.attach_alternative('<p>html</p>', 'text/html')
        msg.attach('facture.pdf', b'%PDF', 'application/pdf')
        with mock.patch('apps.core.email_backends.requests.post') as post:
            post.return_value.status_code = 201
            sent = BrevoAPIEmailBackend(api_key='k').send_messages([msg])
        self.assertEqual(sent, 1)
        payload = post.call_args.kwargs['json']
        self.assertEqual(payload['sender'], {'email': 'contact@example.com', 'name': 'Terre Noire'})
        self.assertEqual(payload['to'], [{'email': 'a@example.com'}])
        self.assertEqual(payload['htmlContent'], '<p>html</p>')
        self.assertEqual(payload['attachment'][0]['name'], 'facture.pdf')
        self.assertEqual(post.call_args.kwargs['headers']['api-key'], 'k')

    def test_api_error_is_reported(self):
        from apps.core.email_backends import BrevoAPIEmailBackend
        msg = EmailMultiAlternatives('Sujet', 'texte', 'contact@example.com', ['a@example.com'])
        with mock.patch('apps.core.email_backends.requests.post') as post:
            post.return_value.status_code = 401
            post.return_value.text = 'unauthorized'
            self.assertEqual(BrevoAPIEmailBackend(api_key='k', fail_silently=True).send_messages([msg]), 0)
