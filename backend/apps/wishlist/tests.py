"""Tests pour l'app wishlist."""
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from decimal import Decimal

from apps.books.models import Book, Category, Author

User = get_user_model()


class WishlistTest(APITestCase):
    """Tests de la liste d'envie."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='wishuser',
            email='wish@example.com',
            password='TestPass123!',
        )
        cat = Category.objects.get_or_create(slug='roman', defaults={'name': 'Roman'})[0]
        auth = Author.objects.create(full_name='Auteur', slug='auteur')
        self.book = Book.objects.create(
            title='Livre',
            slug='livre',
            reference='REF1',
            description='D',
            price=Decimal('1000'),
            available=True,
            category=cat,
            author=auth,
        )

    def test_get_wishlist_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/wishlist/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_add_to_wishlist(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/wishlist/add/', {'book_id': self.book.id})
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
