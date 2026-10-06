"""Tests des retours client après mise en production (V1.2)."""
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.admin.sites import site as admin_site
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
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

    def setUp(self):
        # Les limites d'inscription/connexion sont mémorisées dans le cache partagé
        cache.clear()

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

    def setUp(self):
        cache.clear()  # limite d'inscriptions partagée entre les tests

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


class BambooPayRedirectTests(APITestCase):
    """Point 9 : paiement BambooPay par redirection (mode A) + callback conforme à la doc."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer9', email='b9@example.com', password='x', phone_number='+24100000009',
            first_name='Awa', last_name='Ndong',
        )
        self.order = Order.objects.create(user=self.user, total_amount=Decimal('5000.50'), subtotal=Decimal('5000.50'))
        self.client.force_authenticate(self.user)

    def _initiate(self, operator='bamboopay', phone='062000000'):
        with mock.patch('apps.orders.views.get_bamboo_service') as svc:
            svc.return_value.initiate_redirect_payment.return_value = {'redirect_url': 'https://pay.bamboo/xyz'}
            svc.return_value.initiate_instant_payment.return_value = {'reference_bp': 'TXN-B-1', 'status': True}
            response = self.client.post('/api/payments/initiate/', {
                'order_id': self.order.id, 'operator': operator, 'phone': phone,
            }, format='json')
        return response, svc

    @override_settings(FRONTEND_URL='https://terrenoireeditions.com')
    def test_initiate_returns_redirect_url_and_tracks_billing_id(self):
        response, svc = self._initiate()
        self.assertEqual(response.status_code, 202, response.data)
        self.assertEqual(response.data['redirect_url'], 'https://pay.bamboo/xyz')
        kwargs = svc.return_value.initiate_redirect_payment.call_args.kwargs
        billing_id = kwargs['billing_id']
        self.assertEqual(response.data['bamboo_ref'], billing_id)
        self.assertEqual(kwargs['amount'], 5001)  # arrondi au supérieur, entier
        self.assertEqual(kwargs['return_url'], f'https://terrenoireeditions.com/checkout/paiement/{billing_id}')
        payment = Payment.objects.get(transaction_id=billing_id)
        self.assertEqual(payment.provider, 'BAMBOOPAY')

    def test_any_gabon_number_is_accepted_for_bamboopay(self):
        response, _ = self._initiate(phone='+241 74 30 16 39')
        self.assertEqual(response.status_code, 202, response.data)

    def test_retry_reuses_redirect_url(self):
        self._initiate()
        response, svc = self._initiate()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['redirect_url'], 'https://pay.bamboo/xyz')
        svc.return_value.initiate_redirect_payment.assert_not_called()

    def test_switching_method_expires_previous_payment(self):
        self._initiate()
        response, _ = self._initiate(operator='airtel_money', phone='074000000')
        self.assertEqual(response.status_code, 202, response.data)
        statuses = dict(Payment.objects.filter(order=self.order).values_list('provider', 'status'))
        self.assertEqual(statuses, {'BAMBOOPAY': 'EXPIRED', 'AIRTEL': 'PENDING'})

    def test_redirect_payment_has_longer_expiry(self):
        self._initiate()
        payment = Payment.objects.get(order=self.order)
        Payment.objects.filter(pk=payment.pk).update(created_at=timezone.now() - timedelta(minutes=15))
        with mock.patch('apps.orders.views.get_bamboo_service') as svc:
            svc.return_value.check_status.return_value = {'code': 200, 'transaction': {'status': 'pending'}}
            response = self.client.post(f'/api/payments/check-status/{payment.transaction_id}/')
        self.assertEqual(response.data['status'], 'PENDING')


class BambooCallbackTests(APITestCase):
    URL = '/api/payments/webhook/'

    def setUp(self):
        user = User.objects.create_user(username='cb', email='cb@example.com', password='x', phone_number='+24100000010')
        self.order = Order.objects.create(user=user, total_amount=Decimal('5000'), subtotal=Decimal('5000'))
        self.payment = Payment.objects.create(
            order=self.order, transaction_id='TXN-2025-000381', provider='AIRTEL', status='PENDING',
            amount=Decimal('5000'), bamboo_response={'reference': 'TN-1-abcd'},
        )
        self.payload = {
            'billingId': 'TXN-2025-000381', 'reference': 'TN-1-abcd', 'numCpte': '074000000',
            'amount': 5000.0, 'payername': 'Awa', 'status': 'completed', 'reason': 'ok',
            'paymentType': 'airtel_money', 'description': 'ok', 'idempotency_key': 'key-1',
        }

    def _post(self, payload, bamboo_status='completed'):
        with mock.patch('apps.orders.views.get_bamboo_service') as svc:
            svc.return_value.check_status.return_value = {'code': 200, 'transaction': {'status': bamboo_status}}
            response = self.client.post(self.URL, payload, format='json')
        return response, svc

    def test_documented_payload_marks_order_paid(self):
        response, _ = self._post(self.payload)
        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'PAID')

    def test_duplicate_idempotency_key_is_ignored(self):
        self._post(self.payload, bamboo_status='pending')
        response, svc = self._post(self.payload)
        self.assertEqual(response.data['status'], 'duplicate_ignored')
        svc.return_value.check_status.assert_not_called()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'PENDING')

    def test_merchant_reference_only_is_enough(self):
        payload = {**self.payload, 'billingId': None, 'idempotency_key': 'key-2'}
        response, _ = self._post(payload)
        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'PAID')

    def test_verification_failure_still_acknowledged(self):
        from apps.orders.services.bamboo_pay import BambooPayError
        with mock.patch('apps.orders.views.get_bamboo_service') as svc:
            svc.return_value.check_status.side_effect = BambooPayError('timeout')
            response = self.client.post(self.URL, {**self.payload, 'idempotency_key': 'key-3'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'PENDING')


class CheckStatusRateLimitTests(APITestCase):
    def test_bamboo_is_not_called_more_than_every_20_seconds(self):
        user = User.objects.create_user(username='rl', email='rl@example.com', password='x', phone_number='+24100000011')
        order = Order.objects.create(user=user, total_amount=Decimal('5000'), subtotal=Decimal('5000'))
        Payment.objects.create(order=order, transaction_id='TXN-RL', provider='AIRTEL', status='PENDING', amount=Decimal('5000'))
        self.client.force_authenticate(user)
        with mock.patch('apps.orders.views.get_bamboo_service') as svc:
            svc.return_value.check_status.return_value = {'code': 200, 'transaction': {'status': 'pending'}}
            for _ in range(3):
                self.assertEqual(self.client.post('/api/payments/check-status/TXN-RL/').data['status'], 'PENDING')
        self.assertEqual(svc.return_value.check_status.call_count, 1)


class BambooServiceRedirectTests(TestCase):
    @mock.patch.dict('os.environ', {
        'BAMBOO_PAY_API_URL': 'https://client-v2.bamboopay-ga.com', 'BAMBOO_PAY_MERCHANT_ID': '600123',
        'BAMBOO_PAY_USERNAME': 'u', 'BAMBOO_PAY_PASSWORD': 'p',
        'BAMBOO_CALLBACK_URL': 'https://api.example.com/api/payments/webhook/', 'BAMBOO_WEBHOOK_SECRET': 's3cret',
    })
    def test_send_payload_matches_documentation(self):
        from apps.orders.services.bamboo_pay import BambooPayService
        with mock.patch('apps.orders.services.bamboo_pay.requests.post') as post:
            post.return_value.status_code = 200
            post.return_value.json.return_value = {'redirect_url': 'https://pay/x'}
            result = BambooPayService().initiate_redirect_payment(
                phone='074000000', amount=5001, payer_name='Awa Ndong', billing_id='TN-1-abcd',
                matricule='TNE-1', return_url='https://site/checkout/paiement/TN-1-abcd',
            )
        self.assertEqual(result['redirect_url'], 'https://pay/x')
        self.assertEqual(post.call_args.args[0], 'https://client-v2.bamboopay-ga.com/api/send')
        self.assertEqual(post.call_args.kwargs['json'], {
            'payerName': 'Awa Ndong', 'matricule': 'TNE-1', 'raisonSociale': None,
            'billingId': 'TN-1-abcd', 'transactionAmount': '5001', 'merchant_id': '600123',
            'phone': '074000000', 'return_url': 'https://site/checkout/paiement/TN-1-abcd',
            'update_status_url': 'https://api.example.com/api/payments/webhook/?token=s3cret',
        })


@override_settings(EMAIL_REPLY_TO='terrenoireeditions@gmail.com', ADMIN_EMAIL='editions@example.com')
class ReplyToTests(TestCase):
    """Les réponses des clients arrivent dans une vraie boîte (l'expéditeur n'en a pas)."""

    def test_customer_emails_reply_to_gmail(self):
        from apps.core.email import send_templated_email
        send_templated_email('Sujet', 'registration_welcome', {'user': None, 'frontend_url': ''}, ['a@example.com'])
        self.assertEqual(mail.outbox[-1].reply_to, ['terrenoireeditions@gmail.com'])

    def test_manuscript_admin_notice_replies_to_author(self):
        Manuscript.objects.create(
            title='T', author_name='Awa', email='awa@example.com', phone_number='074000000',
            description='d', terms_accepted=True,
            file=SimpleUploadedFile('m.pdf', b'%PDF', content_type='application/pdf'),
        )
        admin_mail = next(m for m in mail.outbox if m.to == ['editions@example.com'])
        self.assertEqual(admin_mail.reply_to, ['awa@example.com'])

    def test_brevo_uses_default_reply_to_for_plain_send_mail(self):
        from apps.core.email_backends import BrevoAPIEmailBackend
        msg = EmailMultiAlternatives('Sujet', 'texte', 'contact@terrenoireeditions.com', ['a@example.com'])
        with mock.patch('apps.core.email_backends.requests.post') as post:
            post.return_value.status_code = 201
            BrevoAPIEmailBackend(api_key='k').send_messages([msg])
        self.assertEqual(post.call_args.kwargs['json']['replyTo'], {'email': 'terrenoireeditions@gmail.com'})
