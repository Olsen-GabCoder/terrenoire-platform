from decimal import Decimal, InvalidOperation

from rest_framework import status as http_status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q, Value, CharField
from django.db.models.functions import Concat

from .models import SiteConfig


class DeliveryConfigView(APIView):
    """
    Configuration livraison.
    GET  /api/config/delivery/ — public (pour le panier)
    PATCH /api/config/delivery/ — admin only (modifier les frais)
    """

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return [IsAdminUser()]
        return [AllowAny()]

    @staticmethod
    def _serialize(config):
        return {
            'shipping_free_threshold': float(config.shipping_free_threshold),
            'shipping_cost': float(config.shipping_cost),
            'selection_rotation_hours': config.selection_rotation_hours,
            'selection_source': config.selection_source,
        }

    def get(self, request):
        cache_key = 'delivery_config'
        data = cache.get(cache_key)
        if data is None:
            data = self._serialize(SiteConfig.get_config())
            cache.set(cache_key, data, getattr(settings, 'CACHE_DELIVERY_TTL', 600))
        return Response(data)

    def patch(self, request):
        config = SiteConfig.get_config()
        errors = {}
        for field in ('shipping_free_threshold', 'shipping_cost'):
            if field in request.data:
                try:
                    value = Decimal(str(request.data[field]))
                    if value < 0:
                        raise InvalidOperation
                    setattr(config, field, value)
                except (InvalidOperation, ValueError):
                    errors[field] = 'Montant invalide.'
        if 'selection_rotation_hours' in request.data:
            try:
                hours = int(request.data['selection_rotation_hours'])
                if hours < 0 or hours > 24 * 365:
                    raise ValueError
                config.selection_rotation_hours = hours
            except (TypeError, ValueError):
                errors['selection_rotation_hours'] = "Nombre d'heures invalide."
        if 'selection_source' in request.data:
            source = request.data['selection_source']
            if source not in dict(SiteConfig.SELECTION_SOURCE_CHOICES):
                errors['selection_source'] = 'Valeur invalide.'
            else:
                config.selection_source = source
        if errors:
            return Response(errors, status=http_status.HTTP_400_BAD_REQUEST)
        config.save()
        return Response(self._serialize(config))


class GlobalSearchView(APIView):
    """
    Recherche globale sur toute la plateforme.
    GET /api/config/search/?q=victor
    Cherche dans : livres (titre, description, reference, auteur), auteurs (nom, bio), categories (nom).
    Retourne les resultats groupes par type, max 5 par type.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response({'books': [], 'authors': [], 'categories': []})

        from apps.books.models import Book, Author, Category

        # --- Livres ---
        books_qs = Book.objects.filter(
            Q(title__icontains=query)
            | Q(description__icontains=query)
            | Q(reference__icontains=query)
            | Q(author__full_name__icontains=query)
            | Q(category__name__icontains=query),
            available=True,
        ).select_related('author', 'category').distinct()[:5]

        books = []
        for b in books_qs:
            books.append({
                'id': b.id,
                'title': b.title,
                'slug': b.slug,
                'price': float(b.price),
                'format': b.format,
                'cover_image': request.build_absolute_uri(b.cover_image.url) if b.cover_image else None,
                'author_name': b.author.full_name if b.author else None,
                'category_name': b.category.name if b.category else None,
                'rating': float(b.rating) if b.rating else 0,
                'has_discount': b.has_discount,
            })

        # --- Auteurs ---
        authors_qs = Author.objects.filter(
            Q(full_name__icontains=query)
            | Q(biography__icontains=query),
        ).prefetch_related('books')[:5]

        authors = []
        for a in authors_qs:
            authors.append({
                'id': a.id,
                'full_name': a.full_name,
                'slug': a.slug,
                'photo': request.build_absolute_uri(a.photo.url) if a.photo else None,
                'books_count': a.books.count(),
            })

        # --- Categories ---
        categories_qs = Category.objects.filter(
            Q(name__icontains=query),
        ).prefetch_related('books')[:5]

        categories = []
        for c in categories_qs:
            categories.append({
                'id': c.id,
                'name': c.name,
                'slug': c.slug,
                'books_count': c.books.filter(available=True).count(),
            })

        return Response({
            'books': books,
            'authors': authors,
            'categories': categories,
            'query': query,
            'total': len(books) + len(authors) + len(categories),
        })
