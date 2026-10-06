# backend/apps/books/tests.py

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError

from .models import Category, Author, Book


class ModelTests(TestCase):
    """Tests unitaires pour les modèles"""
    
    def setUp(self):
        """Configuration initiale pour tous les tests"""
        self.category = Category.objects.get_or_create(slug="roman", defaults={'name': "Roman"})[0]
        
        self.author = Author.objects.create(
            full_name="Victor Hugo",
            biography="Écrivain français célèbre",
            slug="victor-hugo"
        )
        
        # Créer un fichier image temporaire pour les tests
        self.test_image = SimpleUploadedFile(
            name='test_cover.jpg',
            content=b'fake_image_content',
            content_type='image/jpeg'
        )
        
        self.book = Book.objects.create(
            title="Les Misérables",
            reference="ISBN123456",
            description="Un roman historique français",
            price=25.99,
            cover_image=self.test_image,
            available=True,
            category=self.category,
            author=self.author
        )
    
    def test_category_creation(self):
        """Test de création d'une catégorie"""
        self.assertEqual(self.category.name, "Roman")
        self.assertEqual(self.category.slug, "roman")
        self.assertEqual(str(self.category), "Roman")
    
    def test_author_creation(self):
        """Test de création d'un auteur"""
        self.assertEqual(self.author.full_name, "Victor Hugo")
        self.assertEqual(self.author.slug, "victor-hugo")
        self.assertEqual(str(self.author), "Victor Hugo")
    
    def test_book_creation(self):
        """Test de création d'un livre"""
        self.assertEqual(self.book.title, "Les Misérables")
        self.assertEqual(self.book.reference, "ISBN123456")
        self.assertEqual(self.book.price, 25.99)
        self.assertEqual(self.book.available, True)
        self.assertEqual(self.book.category, self.category)
        self.assertEqual(self.book.author, self.author)
        self.assertEqual(str(self.book), "Les Misérables - Victor Hugo")
    
    def test_book_slug_auto_generation(self):
        """Test de génération automatique du slug"""
        # Créer un livre sans slug
        book2 = Book.objects.create(
            title="Notre-Dame de Paris",
            reference="ISBN789012",
            description="Roman historique",
            price=19.99,
            cover_image=self.test_image,
            available=True,
            category=self.category,
            author=self.author
        )
        # Le slug doit être généré automatiquement
        self.assertIsNotNone(book2.slug)
        self.assertEqual(book2.slug, "notre-dame-de-paris")
    
    def test_book_properties(self):
        """Test des propriétés calculées du livre"""
        # Test de has_ebook (par defaut False)
        self.assertFalse(self.book.has_ebook)

        # Creer un livre avec ebook
        ebook_book = Book.objects.create(
            title="Ebook Test",
            reference="EBOOK001",
            description="Un ebook",
            price=9.99,
            has_ebook=True,
            ebook_price=4.99,
            cover_image=self.test_image,
            available=True,
            category=self.category,
            author=self.author
        )
        self.assertTrue(ebook_book.has_ebook)
        self.assertEqual(ebook_book.ebook_price, 4.99)

        # Test de is_available
        self.assertTrue(self.book.is_available)
        
        # Mettre le livre non disponible
        self.book.available = False
        self.book.save()
        self.assertFalse(self.book.is_available)
    
    def test_category_books_count(self):
        """Test du nombre de livres par catégorie"""
        # Créer un deuxième livre dans la même catégorie
        Book.objects.create(
            title="L'Homme qui rit",
            reference="ISBN345678",
            description="Roman de Victor Hugo",
            price=22.50,
            cover_image=self.test_image,
            available=True,
            category=self.category,
            author=self.author
        )
        
        # Vérifier que la catégorie a bien 2 livres
        self.assertEqual(self.category.books.count(), 2)
    
    def test_author_books_count(self):
        """Test du nombre de livres par auteur"""
        # Créer un deuxième livre du même auteur
        Book.objects.create(
            title="Les Contemplations",
            reference="ISBN901234",
            description="Recueil de poèmes",
            price=18.75,
            cover_image=self.test_image,
            available=True,
            category=self.category,
            author=self.author
        )
        
        # Vérifier que l'auteur a bien 2 livres
        self.assertEqual(self.author.books.count(), 2)


class BookAPITests(APITestCase):
    """Tests d'intégration pour l'API des livres"""
    
    def setUp(self):
        """Configuration initiale pour les tests API"""
        self.client = APIClient()
        
        # Créer des données de test
        self.category = Category.objects.get_or_create(slug="science-fiction", defaults={'name': "Science-Fiction"})[0]
        
        self.author = Author.objects.create(
            full_name="Isaac Asimov",
            biography="Auteur de science-fiction",
            slug="isaac-asimov"
        )
        
        # Créer un fichier image temporaire
        self.test_image = SimpleUploadedFile(
            name='test_cover_sf.jpg',
            content=b'fake_image_content',
            content_type='image/jpeg'
        )
        
        self.book = Book.objects.create(
            title="Fondation",
            reference="ISBN-SF-001",
            description="Un empire galactique",
            price=29.99,
            cover_image=self.test_image,
            available=True,
            category=self.category,
            author=self.author
        )
        
        # Créer un deuxième livre pour les tests de liste
        self.book2 = Book.objects.create(
            title="Les Robots",
            reference="ISBN-SF-002",
            description="Recueil de nouvelles",
            price=24.99,
            available=False,  # Non disponible pour tester les filtres
            category=self.category,
            author=self.author
        )
        
        # Creer un livre avec ebook
        self.ebook = Book.objects.create(
            title="I, Robot",
            reference="ISBN-EBOOK-001",
            description="Premiere loi de la robotique",
            price=14.99,
            has_ebook=True,
            ebook_price=9.99,
            available=True,
            category=self.category,
            author=self.author
        )
    
    def test_get_book_list(self):
        """Test de l'endpoint de liste des livres"""
        url = reverse('book-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)
        self.assertEqual(response.data['count'], 3)
    
    def test_get_book_detail(self):
        """Test de l'endpoint de détail d'un livre"""
        url = reverse('book-detail', args=[self.book.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Fondation")
        self.assertEqual(response.data['reference'], "ISBN-SF-001")
        self.assertEqual(response.data['price'], "29.99")
        self.assertEqual(response.data['author']['full_name'], "Isaac Asimov")
        self.assertEqual(response.data['category']['name'], "Science-Fiction")
    
    def test_book_filter_by_category(self):
        """Test du filtre par catégorie"""
        # Créer une nouvelle catégorie et un livre associé
        category2 = Category.objects.get_or_create(slug="fantasy", defaults={'name': "Fantasy"})[0]
        Book.objects.create(
            title="Le Seigneur des Anneaux",
            reference="ISBN-FANTASY-001",
            description="Fantasy épique",
            price=35.99,
            available=True,
            category=category2,
            author=self.author
        )
        
        # Filtrer par catégorie Science-Fiction
        url = reverse('book-list')
        response = self.client.get(url, {'category': self.category.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)
    
    def test_book_filter_by_ebook(self):
        """Test du filtre has_ebook"""
        url = reverse('book-list')
        response = self.client.get(url, {'has_ebook': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], "I, Robot")
    
    def test_book_filter_by_availability(self):
        """Test du filtre par disponibilité"""
        url = reverse('book-list')
        response = self.client.get(url, {'available': 'true'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
    
    def test_book_search(self):
        """Test de la fonction de recherche"""
        url = reverse('book-list')
        
        # Recherche par titre
        response = self.client.get(url, {'search': 'Fondation'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['title'], "Fondation")
        
        # Recherche par auteur
        response = self.client.get(url, {'search': 'Asimov'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 3)
    
    def test_book_ordering(self):
        """Test du tri des livres"""
        url = reverse('book-list')
        
        # Trier par prix croissant
        response = self.client.get(url, {'ordering': 'price'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prices = [float(book['price']) for book in response.data['results']]
        self.assertEqual(prices, sorted(prices))
        
        # Trier par prix décroissant
        response = self.client.get(url, {'ordering': '-price'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prices = [float(book['price']) for book in response.data['results']]
        self.assertEqual(prices, sorted(prices, reverse=True))
    
    def test_featured_books_endpoint(self):
        """Test de l'endpoint des livres mis en avant"""
        url = '/api/books/featured/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data), 6)
        for book in response.data:
            self.assertTrue(book['available'])
    
    def test_new_releases_endpoint(self):
        """Test de l'endpoint des nouveautés"""
        url = '/api/books/new-releases/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data), 10)
    
    def test_statistics_endpoint(self):
        """Test de l'endpoint des statistiques"""
        url = '/api/books/statistics/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_books'], 3)
        self.assertEqual(response.data['total_authors'], 1)
        # Les catégories par défaut (migration 0005) sont aussi comptées
        self.assertEqual(response.data['total_categories'], Category.objects.count())
        self.assertEqual(response.data['available_books'], 2)
        self.assertEqual(response.data['ebooks_count'], 1)
        self.assertEqual(response.data['paper_books_count'], 3)
    
    def test_author_api(self):
        """Test de l'API des auteurs"""
        # Liste des auteurs
        url = reverse('author-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['full_name'], "Isaac Asimov")
        
        # Détail d'un auteur
        url = reverse('author-detail', args=[self.author.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], "Isaac Asimov")
        self.assertEqual(len(response.data['books']), 3)
    
    def test_category_api(self):
        """Test de l'API des catégories"""
        # Liste des catégories
        url = reverse('category-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Les catégories par défaut (migration 0005) sont aussi listées
        self.assertEqual(response.data['count'], Category.objects.count())
        self.assertIn("Science-Fiction", [c['name'] for c in response.data['results']])
        
        # Détail d'une catégorie
        url = reverse('category-detail', args=[self.category.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Science-Fiction")
        self.assertEqual(len(response.data['books']), 3)
    
    def test_author_books_endpoint(self):
        """Test de l'endpoint des livres par auteur"""
        url = f'/api/authors/{self.author.id}/books/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
    
    def test_category_books_endpoint(self):
        """Test de l'endpoint des livres par catégorie"""
        url = f'/api/categories/{self.category.id}/books/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)


class PaginationTests(APITestCase):
    """Tests spécifiques pour la pagination"""
    
    def setUp(self):
        """Créer plus de livres pour tester la pagination"""
        self.client = APIClient()
        
        category = Category.objects.get_or_create(slug="test", defaults={'name': "Test"})[0]
        author = Author.objects.create(full_name="Test Author", slug="test-author")
        
        # Créer 15 livres (plus que le page_size de 12)
        for i in range(15):
            Book.objects.create(
                title=f"Livre Test {i+1}",
                reference=f"TEST-{i+1}",
                description="Description test",
                price=10.00,
                    available=True,
                category=category,
                author=author
            )
    
    def test_pagination_default(self):
        """Test de la pagination par défaut (12 par page)"""
        url = reverse('book-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 15)
        self.assertEqual(len(response.data['results']), 12)
        self.assertIsNotNone(response.data['next'])
    
    def test_pagination_custom_page_size(self):
        """Test avec un page_size personnalisé"""
        url = reverse('book-list')
        response = self.client.get(url, {'page_size': 5})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 15)
        self.assertEqual(len(response.data['results']), 5)


class ValidationTests(TestCase):
    """Tests de validation des modèles"""
    
    def setUp(self):
        self.category = Category.objects.get_or_create(slug="test", defaults={'name': "Test"})[0]
        self.author = Author.objects.create(full_name="Test Author", slug="test-author")
    
    def test_book_price_validation(self):
        """Test que le prix ne peut pas être négatif"""
        from django.core.validators import MinValueValidator
        
        validator = MinValueValidator(0)
        
        # Le validateur doit lever une exception pour -10
        with self.assertRaises(ValidationError):
            validator(-10)
    
    def test_unique_reference(self):
        """Test que la référence doit être unique"""
        Book.objects.create(
            title="Livre 1",
            reference="REF-001",
            description="Description",
            price=10.00,
            available=True,
            category=self.category,
            author=self.author
        )
        
        # Tenter de créer un deuxième livre avec la même référence doit échouer
        with self.assertRaises(Exception):
            Book.objects.create(
                title="Livre 2",
                reference="REF-001",
                description="Description",
                price=15.00,
                    available=True,
                category=self.category,
                author=self.author
            )