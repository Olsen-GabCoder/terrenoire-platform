# backend/apps/books/views.py

import io
import logging
import zipfile

import requests as http_requests
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny
from apps.core.permissions import CatalogWritePermissionMixin
from rest_framework.pagination import PageNumberPagination

from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg, Q, F, Exists, OuterRef
from django.conf import settings
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.http import FileResponse, HttpResponse, Http404
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.http import require_GET
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)

from .models import Book, Author, Category, BookReview, ReviewLike
from apps.orders.models import Order, OrderItem
from .filters import BookFilter
from .serializers import (
    BookListSerializer,
    BookDetailSerializer,
    BookCreateUpdateSerializer,
    AuthorSerializer,
    AuthorDetailSerializer,
    CategorySerializer,
    CategoryDetailSerializer,
    CollectionSerializer,
    CollectionDetailSerializer,
    BookStatisticsSerializer,
    BookReviewSerializer,
    BookReviewCreateSerializer,
    BookReviewReplySerializer,
)
from .models import Collection
from apps.core.email import run_in_background

# Nombre de livres de la « Sélection de la maison » (accueil)
FEATURED_SELECTION_SIZE = 8


@xframe_options_exempt
@require_GET
def serve_book_pdf(request, book_id):
    """
    Sert le PDF d'un livre pour affichage dans l'iframe de l'application.
    Exempt de X-Frame-Options pour autoriser l'embedding dans notre frontend.
    Securise : seuls les admins ou les utilisateurs ayant achete le livre peuvent y acceder.
    Telecharge le fichier via l'API Cloudinary (generate_archive) pour contourner
    le blocage ACL sur les fichiers raw.
    """
    from apps.users.jwt_cookie_auth import JWTCookieAuthentication

    # Authentification JWT (header ou cookie)
    auth = JWTCookieAuthentication()
    try:
        result = auth.authenticate(request)
    except Exception:
        result = None

    if result is None:
        from django.http import JsonResponse
        return JsonResponse(
            {'detail': 'Authentification requise pour lire ce livre.'},
            status=401
        )

    user, _ = result

    book = get_object_or_404(Book, pk=book_id)
    if not book.pdf_file:
        raise Http404("PDF non disponible pour ce livre.")

    # Les admins ont toujours acces
    if not user.is_staff:
        # Verifier que l'utilisateur a achete ce livre en version ebook
        from .access import user_can_read_ebook
        if not user_can_read_ebook(user, book):
            from django.http import JsonResponse
            return JsonResponse(
                {'detail': 'Vous devez acheter ce livre pour pouvoir le lire.'},
                status=403
            )

    try:
        file_data = _download_raw_from_cloudinary(book.pdf_file.name)
    except Exception as e:
        logger.warning("Telechargement PDF livre %s echoue: %s", book_id, e)
        raise Http404("Fichier PDF inaccessible.") from e

    filename = f"{book.slug or book.id}.pdf"
    response = HttpResponse(file_data, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    response['Content-Length'] = len(file_data)
    return response


def _download_raw_from_cloudinary(file_name):
    """
    Telecharge le contenu binaire d'un fichier raw (PDF).
    - En prod (Cloudinary actif) : passe par l'API Cloudinary generate_archive
    - En dev (Cloudinary inactif) : sert le fichier local depuis MEDIA_ROOT
    """
    import os
    use_cloudinary = bool(os.getenv('CLOUDINARY_CLOUD_NAME', '').strip())

    if use_cloudinary:
        import cloudinary.utils

        archive_url = cloudinary.utils.download_archive_url(
            public_ids=[file_name],
            resource_type='raw',
            flatten_folders=True,
            target_format='zip',
        )
        resp = http_requests.get(archive_url, timeout=30)
        resp.raise_for_status()

        z = zipfile.ZipFile(io.BytesIO(resp.content))
        filenames = z.namelist()
        if not filenames:
            raise ValueError("Archive Cloudinary vide")
        return z.read(filenames[0])

    # Fallback local (dev)
    local_path = os.path.join(settings.MEDIA_ROOT, file_name)
    if not os.path.exists(local_path):
        # Gestion du double prefixe "media/" (artefact Cloudinary)
        if file_name.startswith('media/'):
            local_path = os.path.join(settings.MEDIA_ROOT, file_name[len('media/'):])
    if not os.path.exists(local_path):
        raise FileNotFoundError(f"Fichier introuvable: {file_name}")
    with open(local_path, 'rb') as f:
        return f.read()


@require_GET
def serve_book_excerpt(request, book_id):
    """
    Sert l'extrait PDF d'un livre. Endpoint public (pas d'auth requise).
    Utilise le proxy Cloudinary pour contourner le blocage ACL raw.
    GET /api/books/<book_id>/excerpt/
    """
    book = get_object_or_404(Book, pk=book_id)
    if not book.excerpt_pdf:
        raise Http404("Aucun extrait disponible pour ce livre.")

    try:
        file_data = _download_raw_from_cloudinary(book.excerpt_pdf.name)
    except Exception as e:
        logger.warning("Telechargement extrait livre %s echoue: %s", book_id, e)
        raise Http404("Extrait inaccessible.") from e

    filename = f"extrait-{book.slug or book.id}.pdf"
    response = HttpResponse(file_data, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    response['Content-Length'] = len(file_data)
    return response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Pagination standard pour les listes
    12 éléments par page (3 lignes de 4 cartes en général)
    Maximum 100 pour éviter les abus
    """
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100


class ReviewResultsSetPagination(PageNumberPagination):
    """Pagination pour les avis (10 par page)."""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class BookViewSet(CatalogWritePermissionMixin, viewsets.ModelViewSet):
    """
    ViewSet pour la gestion complète des livres
    
    Liste des actions disponibles:
    - list: GET /api/books/ - Liste paginée des livres
    - retrieve: GET /api/books/{id}/ - Détail d'un livre
    - create: POST /api/books/ - Créer un livre (admin)
    - update: PUT /api/books/{id}/ - Modifier un livre (admin)
    - partial_update: PATCH /api/books/{id}/ - Modifier partiellement (admin)
    - destroy: DELETE /api/books/{id}/ - Supprimer un livre (admin)
    
    Filtres disponibles:
    - ?category=1 - Filtrer par catégorie
    - ?author=2 - Filtrer par auteur
    - ?book_format=EBOOK - Filtrer par format (renommé pour éviter conflit DRF)
    - ?available=true - Filtrer par disponibilité
    - ?search=victor - Rechercher dans titre/description/auteur
    - ?ordering=-created_at - Trier par date (descendant)
    """
    
    queryset = Book.objects.select_related('category', 'author').all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    
    # Configuration des filtres
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    
    # Utiliser le filtre personnalisé au lieu de filterset_fields
    filterset_class = BookFilter
    
    # Champs dans lesquels on peut rechercher
    search_fields = [
        'title',
        'description',
        'author__full_name',
        'reference'
    ]
    
    # Champs sur lesquels on peut trier
    ordering_fields = [
        'title',
        'price',
        'created_at',
        'updated_at',
        'rating'
    ]
    
    # Tri par défaut
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """
        Retourne le sérialiseur approprié selon l'action
        - Liste: Version allégée pour les performances
        - Détail: Version complète avec toutes les infos
        - Création/Modification: Version simplifiée sans nested
        """
        if self.action == 'list':
            return BookListSerializer
        elif self.action == 'retrieve':
            return BookDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return BookCreateUpdateSerializer
        return BookDetailSerializer

    def create(self, request, *args, **kwargs):
        if request.method == 'POST' and not request.data and not request.FILES:
            logger.warning("POST /api/books/ : body vide (multipart non parsé ?)")
            return Response(
                {
                    'detail': 'Aucune donnée reçue. Vérifiez que le formulaire envoie bien les champs '
                              '(titre, auteur, catégorie, etc.) avec Content-Type multipart/form-data.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(
                "POST /api/books/ validation error: keys=%s errors=%s",
                list(request.data.keys()) if request.data else [],
                serializer.errors,
            )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """Sauvegarde le livre puis notifie les abonnés newsletter en arrière-plan."""
        book = serializer.save()
        book = Book.objects.select_related('author', 'category').get(pk=book.pk)

        def _notify(b):
            try:
                from apps.core.email import send_new_book_notification
                send_new_book_notification(b)
            except Exception as e:
                logger.exception("Erreur notification newsletter nouveau livre: %s", e)
        run_in_background(_notify, book)

    def perform_update(self, serializer):
        """Détecte si un livre passe en promo et notifie les abonnés."""
        old_original_price = serializer.instance.original_price
        book = serializer.save()
        book = Book.objects.select_related('author', 'category').get(pk=book.pk)

        # Notifier seulement si le livre vient de passer en promo
        # (original_price n'existait pas avant OU a augmenté → nouvelle promo)
        is_new_promo = (
            book.original_price
            and book.original_price > book.price
            and (not old_original_price or old_original_price <= book.price)
        )
        if is_new_promo:
            def _notify_promo(b):
                try:
                    from apps.core.email import send_promo_notification
                    send_promo_notification(b)
                except Exception as e:
                    logger.exception("Erreur notification promo: %s", e)
            run_in_background(_notify_promo, book)

    def get_queryset(self):
        """
        Optimisation des requêtes selon l'action
        Utilise select_related pour éviter les N+1 queries
        """
        queryset = super().get_queryset()
        
        # Optimisation: précharger les relations
        if self.action in ['list', 'retrieve']:
            queryset = queryset.select_related('category', 'author')
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='featured')
    def featured_books(self, request):
        """
        /api/books/featured/
        Selection editoriale (is_featured=True).
        Fallback : top popularite si aucun livre n'est marque featured.
        """
        from apps.core.models import SiteConfig
        from .selection import pick_rotating_selection, current_period

        config = SiteConfig.get_config()
        period = current_period(config.selection_rotation_hours)
        cache_key = 'books_featured'
        cached = cache.get(cache_key)
        # Le cache est invalidé dès qu'on change de période (nouveau tirage)
        if isinstance(cached, dict) and cached.get('period') == period:
            return Response(cached['data'])

        featured = pick_rotating_selection(
            self.get_queryset().filter(available=True),
            source=config.selection_source,
            period=period,
            # 8 = deux rangées pleines de 4 sur ordinateur (2 colonnes sur mobile)
            size=FEATURED_SELECTION_SIZE,
        )
        data = BookListSerializer(featured, many=True, context={'request': request}).data
        cache.set(cache_key, {'period': period, 'data': data}, getattr(settings, 'CACHE_BOOKS_TTL', 300))
        return Response(data)

    @action(detail=False, methods=['get'], url_path='bestsellers')
    def bestsellers(self, request):
        """
        /api/books/bestsellers/
        Trie par popularity_score (ventes reelles + rating + wishlist + boost admin).
        """
        cache_key = 'books_bestsellers'
        data = cache.get(cache_key)
        if data is None:
            bestsellers = (
                self.get_queryset()
                .filter(available=True)
                .order_by('-popularity_score', '-rating')[:8]
            )
            serializer = BookListSerializer(bestsellers, many=True, context={'request': request})
            data = serializer.data
            cache.set(cache_key, data, getattr(settings, 'CACHE_BOOKS_TTL', 300))
        return Response(data)

    @action(detail=False, methods=['get'], url_path='trending')
    def trending(self, request):
        """
        /api/books/trending/
        Livres avec la plus forte velocite recente (trending_score).
        """
        cache_key = 'books_trending'
        data = cache.get(cache_key)
        if data is None:
            books = (
                self.get_queryset()
                .filter(available=True)
                .order_by('-trending_score', '-popularity_score')[:8]
            )
            serializer = BookListSerializer(books, many=True, context={'request': request})
            data = serializer.data
            cache.set(cache_key, data, getattr(settings, 'CACHE_BOOKS_TTL', 300))
        return Response(data)

    @action(detail=False, methods=['get'], url_path='new-releases')
    def new_releases(self, request):
        """
        /api/books/new-releases/
        Nouveautes par published_date (fallback created_at).
        """
        cache_key = 'books_new_releases'
        data = cache.get(cache_key)
        if data is None:
            new_books = (
                self.get_queryset()
                .filter(available=True)
                .order_by(F('published_date').desc(nulls_last=True), '-created_at')[:10]
            )
            serializer = BookListSerializer(new_books, many=True, context={'request': request})
            data = serializer.data
            cache.set(cache_key, data, getattr(settings, 'CACHE_BOOKS_TTL', 300))
        return Response(data)

    @action(detail=False, methods=['get'], url_path='recommended')
    def recommended(self, request):
        """
        /api/books/recommended/
        Recommandations personnalisees (connecte) ou trending+qualite (anonyme).
        """
        from .scoring import get_personalized_recommendations, _anonymous_recommendations

        cache_key = None
        if not request.user.is_authenticated:
            cache_key = 'books_recommended_anon'
            data = cache.get(cache_key)
            if data is not None:
                return Response(data)
            books = _anonymous_recommendations(limit=8)
        else:
            books = get_personalized_recommendations(request.user, limit=8)

        serializer = BookListSerializer(books, many=True, context={'request': request})
        data = serializer.data
        if cache_key:
            cache.set(cache_key, data, getattr(settings, 'CACHE_BOOKS_TTL', 300))
        return Response(data)
    
    @action(detail=True, methods=['get'], url_path='reviews/me')
    def my_review(self, request, pk=None):
        """
        GET /api/books/{id}/reviews/me/
        Retourne l'avis principal de l'utilisateur connecté (ou 404).
        """
        book = self.get_object()
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_404_NOT_FOUND)
        try:
            review = BookReview.objects.get(
                book=book, user=request.user, parent__isnull=True
            )
        except BookReview.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = BookReviewSerializer(review, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post', 'delete'], url_path='reviews')
    def reviews(self, request, pk=None):
        """
        GET /api/books/{id}/reviews/ - Liste les avis du livre
        POST /api/books/{id}/reviews/ - Créer ou modifier son avis (authentifié)
        DELETE /api/books/{id}/reviews/ - Supprimer son avis (authentifié)
        """
        book = self.get_object()

        if request.method == 'GET':
            reviews_qs = (
                BookReview.objects.filter(book=book, parent__isnull=True)
                .select_related('user')
                .prefetch_related('replies__user', 'likes')
                .annotate(_likes_count=Count('likes'))
                .order_by('-created_at')
            )
            # Annoter user_has_liked pour l'utilisateur connecté
            if request.user.is_authenticated:
                user_liked = ReviewLike.objects.filter(review=OuterRef('pk'), user=request.user)
                reviews_qs = reviews_qs.annotate(_user_has_liked=Exists(user_liked))
            # Pagination
            paginator = ReviewResultsSetPagination()
            page = paginator.paginate_queryset(reviews_qs, request)
            if page is not None:
                serializer = BookReviewSerializer(
                    page, many=True, context={'request': request}
                )
                return paginator.get_paginated_response(serializer.data)
            serializer = BookReviewSerializer(
                reviews_qs, many=True, context={'request': request}
            )
            return Response(serializer.data)

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentification requise.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if request.method == 'DELETE':
            deleted, _ = BookReview.objects.filter(
                user=request.user, book=book, parent__isnull=True
            ).delete()
            if deleted:
                return Response(status=status.HTTP_204_NO_CONTENT)
            return Response(
                {'detail': "Vous n'avez pas d'avis sur ce livre."},
                status=status.HTTP_404_NOT_FOUND
            )

        # POST : créer ou mettre à jour son avis principal
        review, created = BookReview.objects.get_or_create(
            user=request.user,
            book=book,
            parent=None,
            defaults={'rating': 1, 'comment': ''}
        )
        serializer = BookReviewCreateSerializer(review, data=request.data, partial=not created)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        response_serializer = BookReviewSerializer(
            review, context={'request': request}
        )
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='reviews/(?P<review_id>[^/.]+)/reply')
    def reply_to_review(self, request, pk=None, review_id=None):
        """
        POST /api/books/{id}/reviews/{review_id}/reply/
        Répondre à un avis (authentifié).
        """
        book = self.get_object()
        try:
            parent_review = BookReview.objects.get(
                id=review_id, book=book, parent__isnull=True
            )
        except BookReview.DoesNotExist:
            return Response(
                {'detail': 'Avis introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentification requise.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = BookReviewReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reply = BookReview.objects.create(
            user=request.user,
            book=book,
            parent=parent_review,
            comment=serializer.validated_data['comment']
        )
        response_serializer = BookReviewSerializer(
            reply, context={'request': request}
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='reviews/(?P<review_id>[^/.]+)/delete')
    def delete_review_by_id(self, request, pk=None, review_id=None):
        """
        DELETE /api/books/{id}/reviews/{review_id}/delete/
        Supprimer un avis ou une réponse (uniquement les siens).
        """
        book = self.get_object()
        try:
            review = BookReview.objects.get(id=review_id, book=book)
        except BookReview.DoesNotExist:
            return Response(
                {'detail': 'Avis introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentification requise.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if review.user_id != request.user.id:
            return Response(
                {'detail': "Vous ne pouvez supprimer que vos propres avis."},
                status=status.HTTP_403_FORBIDDEN
            )

        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post', 'delete'], url_path='reviews/(?P<review_id>[^/.]+)/like')
    def like_review(self, request, pk=None, review_id=None):
        """
        POST /api/books/{id}/reviews/{review_id}/like/ - Liker un avis
        DELETE /api/books/{id}/reviews/{review_id}/like/ - Retirer son like
        """
        book = self.get_object()
        try:
            review = BookReview.objects.get(id=review_id, book=book)
        except BookReview.DoesNotExist:
            return Response(
                {'detail': 'Avis introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentification requise.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if request.method == 'POST':
            _, created = ReviewLike.objects.get_or_create(
                user=request.user, review=review
            )
            return Response(
                {'liked': True, 'likes_count': review.likes.count()},
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
        else:
            deleted, _ = ReviewLike.objects.filter(
                user=request.user, review=review
            ).delete()
            return Response(
                {'liked': False, 'likes_count': review.likes.count()},
                status=status.HTTP_200_OK
            )

    @action(detail=True, methods=['get'], url_path='related')
    def related_books(self, request, pk=None):
        """
        Endpoint personnalisé: /api/books/{id}/related/
        Retourne des livres similaires (même catégorie ou même auteur)
        """
        book = self.get_object()
        
        # Livres de la même catégorie ou du même auteur, excluant le livre actuel
        related = self.get_queryset().filter(
            Q(category=book.category) | Q(author=book.author),
            available=True
        ).exclude(id=book.id).distinct()[:6]
        
        serializer = BookListSerializer(related, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='statistics')
    def statistics(self, request):
        """
        Endpoint personnalisé: /api/books/statistics/
        Retourne des statistiques sur le catalogue
        """
        try:
            # Calcul des statistiques
            total_books = Book.objects.count()
            available_books = Book.objects.filter(available=True).count()
            
            # Prix moyen
            avg_price = Book.objects.aggregate(Avg('price'))['price__avg']
            average_price = round(float(avg_price), 2) if avg_price else 0.0
            
            # Note moyenne
            avg_rating = Book.objects.filter(rating__gt=0).aggregate(Avg('rating'))['rating__avg']
            average_rating = round(float(avg_rating), 2) if avg_rating else 0.0
            
            # Livres avec remise (original_price existe et est supérieur au prix actuel)
            books_with_discount = Book.objects.filter(
                original_price__isnull=False
            ).filter(
                original_price__gt=F('price')
            ).count()
            
            stats = {
                'total_books': total_books,
                'total_authors': Author.objects.count(),
                'total_categories': Category.objects.count(),
                'available_books': available_books,
                'ebooks_count': Book.objects.filter(has_ebook=True).count(),
                'paper_books_count': total_books,
                'average_price': average_price,
                'bestsellers_count': Book.objects.filter(is_bestseller=True).count(),
                'average_rating': average_rating,
                'books_with_discount': books_with_discount
            }
            
            serializer = BookStatisticsSerializer(stats)
            return Response(serializer.data)
            
        except Exception as e:
            # En cas d'erreur, retourner des statistiques par défaut
            return Response({
                'total_books': 0,
                'total_authors': 0,
                'total_categories': 0,
                'available_books': 0,
                'ebooks_count': 0,
                'paper_books_count': 0,
                'average_price': 0.0,
                'bestsellers_count': 0,
                'average_rating': 0.0,
                'books_with_discount': 0
            })


class AuthorViewSet(CatalogWritePermissionMixin, viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des auteurs
    
    Liste des actions:
    - list: GET /api/authors/ - Liste tous les auteurs
    - retrieve: GET /api/authors/{id}/ - Détail d'un auteur avec ses livres
    - create: POST /api/authors/ - Créer un auteur (admin)
    - update: PUT/PATCH /api/authors/{id}/ - Modifier (admin)
    - destroy: DELETE /api/authors/{id}/ - Supprimer (admin)
    """
    
    queryset = Author.objects.prefetch_related('books').all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    
    search_fields = ['full_name', 'biography']
    ordering_fields = ['full_name', 'created_at']
    ordering = ['full_name']
    
    def get_serializer_class(self):
        """
        Liste: Version simple
        Détail: Version avec liste des livres
        """
        if self.action == 'retrieve':
            return AuthorDetailSerializer
        return AuthorSerializer
    
    def get_queryset(self):
        """
        Optimisation: précharger les livres pour le détail
        """
        queryset = super().get_queryset()
        
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related(
                'books__category',
                'books__author'
            )
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='with-books')
    def authors_with_books(self, request):
        """
        Endpoint personnalisé: /api/authors/with-books/
        Retourne uniquement les auteurs qui ont au moins un livre publié
        """
        authors = self.get_queryset().annotate(
            num_books=Count('books')
        ).filter(num_books__gt=0).order_by('-num_books')
        
        page = self.paginate_queryset(authors)
        
        if page is not None:
            serializer = AuthorSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = AuthorSerializer(authors, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='books')
    def author_books(self, request, pk=None):
        """
        Endpoint personnalisé: /api/authors/{id}/books/
        Retourne tous les livres d'un auteur spécifique
        """
        author = self.get_object()
        books = author.books.filter(available=True).select_related('category', 'author')
        
        page = self.paginate_queryset(books)
        
        if page is not None:
            serializer = BookListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = BookListSerializer(books, many=True, context={'request': request})
        return Response(serializer.data)


class CategoryViewSet(CatalogWritePermissionMixin, viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des catégories
    
    Liste des actions:
    - list: GET /api/categories/ - Liste toutes les catégories
    - retrieve: GET /api/categories/{id}/ - Détail d'une catégorie avec ses livres
    - create: POST /api/categories/ - Créer une catégorie (admin)
    - update: PUT/PATCH /api/categories/{id}/ - Modifier (admin)
    - destroy: DELETE /api/categories/{id}/ - Supprimer (admin)
    """
    
    queryset = Category.objects.prefetch_related('books').all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    
    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        """
        Liste: Version simple
        Détail: Version avec liste des livres
        """
        if self.action == 'retrieve':
            return CategoryDetailSerializer
        return CategorySerializer
    
    def get_queryset(self):
        """
        Optimisation: précharger les livres pour le détail
        """
        queryset = super().get_queryset()
        
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related(
                'books__category',
                'books__author'
            )
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='with-books')
    def categories_with_books(self, request):
        """
        Endpoint personnalisé: /api/categories/with-books/
        Retourne uniquement les catégories qui ont au moins un livre
        """
        categories = self.get_queryset().annotate(
            num_books=Count('books')
        ).filter(num_books__gt=0).order_by('-num_books')
        
        serializer = CategorySerializer(categories, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='books')
    def category_books(self, request, pk=None):
        """
        Endpoint personnalisé: /api/categories/{id}/books/
        Retourne tous les livres d'une catégorie spécifique
        """
        category = self.get_object()
        books = category.books.filter(available=True).select_related('category', 'author')

        page = self.paginate_queryset(books)

        if page is not None:
            serializer = BookListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)

        serializer = BookListSerializer(books, many=True, context={'request': request})
        return Response(serializer.data)


class CollectionViewSet(CatalogWritePermissionMixin, viewsets.ModelViewSet):
    """ViewSet pour les collections editoriales."""
    queryset = Collection.objects.all()
    serializer_class = CollectionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    @action(detail=False, methods=['get'], url_path='by-slug/(?P<slug>[^/.]+)')
    def by_slug(self, request, slug=None):
        """GET /api/collections/by-slug/<slug>/ — detail avec livres."""
        collection = get_object_or_404(Collection, slug=slug, is_active=True)
        serializer = CollectionDetailSerializer(collection, context={'request': request})
        return Response(serializer.data)