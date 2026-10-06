"""Tests pour l'app users."""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()


class UserRegistrationTest(APITestCase):
    """Tests d'inscription."""

    def test_register_success(self):
        response = self.client.post('/api/users/register/', {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'Test',
            'last_name': 'User',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertTrue(User.objects.filter(username='testuser').exists())

    def test_register_missing_fields(self):
        response = self.client.post('/api/users/register/', {'username': 'test'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserLoginTest(APITestCase):
    """Tests de connexion."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='loginuser', email='login@example.com', password='TestPass123!',
        )

    def test_login_with_username(self):
        response = self.client.post('/api/token/', {
            'username': 'loginuser', 'password': 'TestPass123!',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_login_with_email(self):
        response = self.client.post('/api/token/', {
            'username': 'login@example.com', 'password': 'TestPass123!',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_login_wrong_password(self):
        response = self.client.post('/api/token/', {
            'username': 'loginuser', 'password': 'WrongPass!',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserProfileTest(APITestCase):
    """Tests du profil."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='profuser', email='prof@example.com', password='TestPass123!',
            first_name='Jean', last_name='Dupont',
        )

    def test_get_profile_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'profuser')

    def test_get_profile_unauthenticated(self):
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_has_complete_profile(self):
        """Profil incomplet sans telephone/adresse/ville."""
        self.assertFalse(self.user.has_complete_profile)
        self.user.phone_number = '+24174301639'
        self.user.address = '123 Rue'
        self.user.city = 'Port-Gentil'
        self.user.save()
        self.user.refresh_from_db()
        self.assertTrue(self.user.has_complete_profile)


class PhoneValidationTest(TestCase):
    """Tests de validation du telephone."""

    def _make_user(self, phone):
        return User(username=f'phone_{phone[:5]}', email=f'{phone[:5]}@t.com',
                     password='TestPass123!', phone_number=phone)

    def test_valid_international(self):
        user = self._make_user('+24177123456')
        user.full_clean()  # ne doit pas lever d'erreur

    def test_valid_local(self):
        user = self._make_user('077123456')
        user.full_clean()

    def test_invalid_no_prefix(self):
        user = self._make_user('12345')
        with self.assertRaises(Exception):
            user.full_clean()
