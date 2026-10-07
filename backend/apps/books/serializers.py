from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import Category, Author, Collection, Book, BookReview, ReviewLike

# Badge « Nouveau » : les N derniers livres ajoutés, s'ils ont moins de X jours
NEW_BOOKS_COUNT = 6
NEW_BOOKS_DAYS = 60


class CategorySerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour le modèle Category
    Transforme les catégories en JSON pour l'API
    """
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'created_at', 'updated_at']
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class CollectionSerializer(serializers.ModelSerializer):
    books_count = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = ['id', 'name', 'slug', 'description', 'cover_image', 'is_active', 'books_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_books_count(self, obj):
        return obj.books.count()


class CollectionDetailSerializer(CollectionSerializer):
    books = serializers.SerializerMethodField()

    class Meta(CollectionSerializer.Meta):
        fields = CollectionSerializer.Meta.fields + ['books']

    def get_books(self, obj):
        qs = obj.books.filter(available=True).select_related('category', 'author')
        return BookListSerializer(qs, many=True, context=self.context).data


class AuthorSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour le modèle Author
    Gère la transformation des auteurs en JSON
    Inclut l'URL de la photo si elle existe
    """
    
    # Champ calculé pour le nombre de livres de l'auteur
    books_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Author
        fields = [
            'id',
            'full_name',
            'biography',
            'photo',
            'slug',
            'books_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
    
    def get_books_count(self, obj):
        """Retourne le nombre de livres écrits par cet auteur"""
        return obj.books.count()


class BookListSerializer(serializers.ModelSerializer):
    """
    Sérialiseur optimisé pour la liste des livres
    Version allégée pour les performances (liste de catalogue)
    """

    # Nested serializers pour avoir les détails complets au lieu de simples IDs
    category = CategorySerializer(read_only=True)
    author = AuthorSerializer(read_only=True)

    # Champs calculés
    has_pdf = serializers.SerializerMethodField()
    has_excerpt = serializers.SerializerMethodField()
    is_new = serializers.SerializerMethodField()

    # === NOUVEAUX CHAMPS ===
    # Promotions et prix
    original_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        allow_null=True,
        read_only=True
    )
    has_discount = serializers.BooleanField(read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    discount_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    
    # Best-seller et notes
    is_bestseller = serializers.BooleanField(read_only=True)
    rating = serializers.DecimalField(
        max_digits=3,
        decimal_places=2,
        read_only=True
    )
    rating_count = serializers.IntegerField(read_only=True)
    
    # Formatage de la note (ex: "4.5/5")
    rating_display = serializers.SerializerMethodField()

    # Scoring & curation
    is_featured = serializers.BooleanField(read_only=True)
    published_date = serializers.DateField(read_only=True, allow_null=True)
    popularity_score = serializers.FloatField(read_only=True)
    trending_score = serializers.FloatField(read_only=True)

    class Meta:
        model = Book
        fields = [
            'id',
            'title',
            'slug',
            'reference',
            'description',
            'price',
            'original_price',
            'has_ebook',
            'ebook_price',
            'cover_image',
            'back_cover_image',
            'available',
            'category',
            'author',
            'created_at',
            # Promotions
            'has_discount',
            'discount_percentage',
            'discount_amount',
            # Popularite
            'is_bestseller',
            'is_featured',
            'rating',
            'rating_count',
            'rating_display',
            'published_date',
            'popularity_score',
            'trending_score',
            'has_pdf',
            'has_excerpt',
            'is_new',
        ]
        read_only_fields = ['id', 'slug', 'created_at']

    def get_has_pdf(self, obj):
        return bool(obj.pdf_file)

    def get_is_new(self, obj):
        """
        « Nouveau » seulement pour les vraies nouveautés : les NEW_BOOKS_COUNT
        derniers livres ajoutés, et depuis moins de NEW_BOOKS_DAYS jours.
        (Avec une règle « moins de 30 jours », tout le catalogue d'un
        lancement était marqué Nouveau et le badge ne voulait plus rien dire.)
        Calculé une seule fois par requête.
        """
        cache = self.context.setdefault('_new_book_ids', {})
        if 'ids' not in cache:
            since = timezone.now() - timedelta(days=NEW_BOOKS_DAYS)
            cache['ids'] = set(
                Book.objects.filter(created_at__gte=since)
                .order_by('-created_at')
                .values_list('id', flat=True)[:NEW_BOOKS_COUNT]
            )
        return obj.id in cache['ids']

    def get_has_excerpt(self, obj):
        return bool(obj.excerpt_pdf)

    def get_rating_display(self, obj):
        """Retourne la note formatée (ex: "4.5/5")"""
        if obj.rating and obj.rating > 0:
            return f"{obj.rating}/5"
        return "Pas encore noté"


class BookDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur complet pour le détail d'un livre
    Inclut toutes les informations nécessaires pour la page de détail
    """
    
    # Nested serializers pour les relations
    category = CategorySerializer(read_only=True)
    author = AuthorSerializer(read_only=True)
    collection = CollectionSerializer(read_only=True)
    excerpt_pdf_url = serializers.SerializerMethodField()
    
    # IDs pour la création/modification (write_only)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True
    )
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=Author.objects.all(),
        source='author',
        write_only=True
    )
    
    # Champs calculés
    is_available = serializers.BooleanField(read_only=True)
    has_pdf = serializers.SerializerMethodField()
    can_read = serializers.SerializerMethodField()
    
    # === NOUVEAUX CHAMPS ===
    # Promotions et prix
    original_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        allow_null=True,
        read_only=True
    )
    has_discount = serializers.BooleanField(read_only=True)
    discount_percentage = serializers.IntegerField(read_only=True)
    discount_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    
    # Best-seller et notes
    is_bestseller = serializers.BooleanField(read_only=True)
    rating = serializers.DecimalField(
        max_digits=3,
        decimal_places=2,
        read_only=True
    )
    rating_count = serializers.IntegerField(read_only=True)
    
    # Formatage de la note
    rating_display = serializers.SerializerMethodField()
    rating_stars = serializers.SerializerMethodField()
    
    class Meta:
        model = Book
        fields = [
            'id',
            'title',
            'slug',
            'reference',
            'description',
            'price',
            'original_price',
            'has_ebook',
            'ebook_price',
            'cover_image',
            'back_cover_image',
            'available',
            'is_available',
            'category',
            'category_id',
            'author',
            'author_id',
            'created_at',
            'updated_at',
            # Nouveaux champs
            'has_discount',
            'discount_percentage',
            'discount_amount',
            'is_bestseller',
            'rating',
            'rating_count',
            'rating_display',
            'rating_stars',
            'has_pdf',
            'can_read',
            # Details techniques (C4.1)
            'published_date',
            'page_count',
            'isbn',
            'language',
            'dimensions_width_cm',
            'dimensions_height_cm',
            'weight_g',
            # Collection et extrait (C4.2)
            'collection',
            'excerpt_pdf_url',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_has_pdf(self, obj):
        return bool(obj.pdf_file)

    def get_can_read(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        from .access import user_can_read_ebook
        return user_can_read_ebook(request.user, obj)

    def get_excerpt_pdf_url(self, obj):
        if obj.excerpt_pdf:
            request = self.context.get('request')
            url = f'/api/books/{obj.pk}/excerpt/'
            if request:
                return request.build_absolute_uri(url)
            return url
        return None

    def get_rating_display(self, obj):
        """Retourne la note formatée (ex: "4.5/5")"""
        if obj.rating and obj.rating > 0:
            return f"{obj.rating}/5 ({obj.rating_count} avis)"
        return "Pas encore noté"
    
    def get_rating_stars(self, obj):
        """Retourne les étoiles de notation pour l'affichage"""
        if not obj.rating or obj.rating == 0:
            return []
        
        rating = float(obj.rating)
        full_stars = int(rating)
        half_star = 1 if rating - full_stars >= 0.5 else 0
        empty_stars = 5 - full_stars - half_star
        
        return {
            'full': full_stars,
            'half': half_star,
            'empty': empty_stars,
            'value': rating
        }
    
    def validate_price(self, value):
        """Validation personnalisée du prix"""
        if value < 0:
            raise serializers.ValidationError("Le prix ne peut pas être négatif.")
        if value > 1000000:
            raise serializers.ValidationError("Le prix semble anormalement élevé.")
        return value
    
    def validate_reference(self, value):
        """Validation personnalisée de la référence"""
        if not value:
            return value
        if len(value) < 3:
            raise serializers.ValidationError("La référence doit contenir au moins 3 caractères.")
        return value.upper()


class BookCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la création et modification de livres
    Version simplifiée sans nested serializers.
    L'image de couverture et le PDF sont optionnels.
    """
    cover_image = serializers.ImageField(required=False, allow_null=True)
    back_cover_image = serializers.ImageField(required=False, allow_null=True)
    pdf_file = serializers.FileField(required=False, allow_null=True)
    excerpt_pdf = serializers.FileField(required=False, allow_null=True)
    reference = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    isbn = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    collection = serializers.PrimaryKeyRelatedField(queryset=Collection.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Book
        fields = [
            'title',
            'reference',
            'description',
            'price',
            'original_price',
            'has_ebook',
            'ebook_price',
            'cover_image',
            'back_cover_image',
            'pdf_file',
            'available',
            'is_bestseller',
            'rating',
            'rating_count',
            'category',
            'author',
            # Details techniques (C4.1)
            'page_count',
            'isbn',
            'language',
            'dimensions_width_cm',
            'dimensions_height_cm',
            'weight_g',
            # Collection et extrait (C4.2)
            'collection',
            'excerpt_pdf',
        ]

    def validate(self, data):
        """
        Validation globale des données
        Vérifie la cohérence entre les champs
        """
        # Vérifier que l'auteur et la catégorie existent
        if 'author' in data and not data['author']:
            raise serializers.ValidationError({
                'author': "Un livre doit avoir un auteur."
            })
        
        if 'category' in data and not data['category']:
            raise serializers.ValidationError({
                'category': "Un livre doit appartenir à une catégorie."
            })
        
        # Validation du prix d'origine vs prix actuel
        if 'original_price' in data and 'price' in data:
            if data['original_price'] is not None:
                if data['original_price'] <= 0:
                    raise serializers.ValidationError({
                        'original_price': "Le prix d'origine doit être positif."
                    })
                if data['price'] >= data['original_price']:
                    raise serializers.ValidationError({
                        'price': "Le prix en promotion doit être inférieur au prix d'origine."
                    })
        
        # Validation de la note
        if 'rating' in data:
            if data['rating'] < 0 or data['rating'] > 5:
                raise serializers.ValidationError({
                    'rating': "La note doit être comprise entre 0 et 5."
                })

        # Validation ebook
        has_ebook = data.get('has_ebook', getattr(self.instance, 'has_ebook', False) if self.instance else False)
        ebook_price = data.get('ebook_price')
        if has_ebook and 'ebook_price' in data and (ebook_price is None or ebook_price <= 0):
            raise serializers.ValidationError({
                'ebook_price': "Le prix ebook est requis et doit etre positif si l'ebook est active."
            })
        if not has_ebook and 'ebook_price' in data:
            data['ebook_price'] = None

        # Convertir isbn vide en None pour eviter les doublons unique
        if 'isbn' in data and not data['isbn']:
            data['isbn'] = None

        return data


class AuthorDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur détaillé pour un auteur
    Inclut la liste de ses livres
    """
    
    # Liste des livres de l'auteur (nested)
    books = BookListSerializer(many=True, read_only=True)
    books_count = serializers.SerializerMethodField()
    
    # Statistiques de l'auteur
    average_rating = serializers.SerializerMethodField()
    bestsellers_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Author
        fields = [
            'id',
            'full_name',
            'biography',
            'photo',
            'slug',
            'books',
            'books_count',
            'average_rating',
            'bestsellers_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
    
    def get_books_count(self, obj):
        """Retourne le nombre total de livres"""
        return obj.books.count()
    
    def get_average_rating(self, obj):
        """Retourne la note moyenne des livres de l'auteur"""
        books = obj.books.all()
        if books.exists():
            total_rating = sum(book.rating for book in books if book.rating)
            count = sum(1 for book in books if book.rating)
            return round(total_rating / count, 2) if count > 0 else 0
        return 0
    
    def get_bestsellers_count(self, obj):
        """Retourne le nombre de best-sellers de l'auteur"""
        return obj.books.filter(is_bestseller=True).count()


class CategoryDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur détaillé pour une catégorie
    Inclut la liste des livres de cette catégorie
    """
    
    # Liste des livres de la catégorie
    books = BookListSerializer(many=True, read_only=True)
    books_count = serializers.SerializerMethodField()
    
    # Statistiques de la catégorie
    average_rating = serializers.SerializerMethodField()
    bestsellers_count = serializers.SerializerMethodField()
    average_price = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'slug',
            'books',
            'books_count',
            'average_rating',
            'bestsellers_count',
            'average_price',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
    
    def get_books_count(self, obj):
        """Retourne le nombre de livres dans cette catégorie"""
        return obj.books.count()
    
    def get_average_rating(self, obj):
        """Retourne la note moyenne des livres de la catégorie"""
        books = obj.books.all()
        if books.exists():
            total_rating = sum(book.rating for book in books if book.rating)
            count = sum(1 for book in books if book.rating)
            return round(total_rating / count, 2) if count > 0 else 0
        return 0
    
    def get_bestsellers_count(self, obj):
        """Retourne le nombre de best-sellers dans cette catégorie"""
        return obj.books.filter(is_bestseller=True).count()
    
    def get_average_price(self, obj):
        """Retourne le prix moyen des livres de la catégorie"""
        books = obj.books.all()
        if books.exists():
            total_price = sum(book.price for book in books)
            return round(total_price / books.count(), 2)
        return 0


class BookReviewSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les avis sur les livres (avec photo profil, likes, réponses)."""
    user_display = serializers.SerializerMethodField()
    user_profile_image = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    user_has_liked = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = BookReview
        fields = [
            'id', 'user', 'user_display', 'user_profile_image',
            'book', 'parent', 'rating', 'comment',
            'likes_count', 'user_has_liked', 'replies',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'book', 'parent', 'created_at', 'updated_at']

    def get_user_display(self, obj):
        """Nom affiché de l'utilisateur (nom complet ou prénom)."""
        full_name = obj.user.get_full_name()
        if full_name and full_name.strip():
            return full_name.strip()
        if obj.user.first_name:
            return obj.user.first_name
        if obj.user.username:
            return obj.user.username
        return 'Anonyme'

    def get_user_profile_image(self, obj):
        """URL de la photo de profil (ou None)."""
        if obj.user.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.user.profile_image.url)
            return obj.user.profile_image.url
        return None

    def get_likes_count(self, obj):
        """Nombre de likes sur cet avis."""
        if hasattr(obj, '_likes_count'):
            return obj._likes_count
        return obj.likes.count()

    def get_user_has_liked(self, obj):
        """True si l'utilisateur connecté a liké cet avis."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if hasattr(obj, '_user_has_liked'):
            return obj._user_has_liked
        return obj.likes.filter(user=request.user).exists()

    def get_replies(self, obj):
        """Réponses imbriquées (uniquement pour les avis principaux)."""
        if obj.parent_id:
            return []
        replies = obj.replies.select_related('user').order_by('created_at')
        return BookReviewSerializer(replies, many=True, context=self.context).data


class BookReviewCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour créer/modifier un avis principal."""

    class Meta:
        model = BookReview
        fields = ['rating', 'comment']

    def validate_rating(self, value):
        if value is not None and (value < 1 or value > 5):
            raise serializers.ValidationError("La note doit être entre 1 et 5.")
        return value


class BookReviewReplySerializer(serializers.ModelSerializer):
    """Sérialiseur pour créer une réponse à un avis."""

    class Meta:
        model = BookReview
        fields = ['comment']

    def validate_comment(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le commentaire est requis.")
        return value.strip()


# Sérialiseur générique pour les statistiques (bonus)
class BookStatisticsSerializer(serializers.Serializer):
    """
    Sérialiseur pour les statistiques du catalogue
    """
    total_books = serializers.IntegerField()
    total_authors = serializers.IntegerField()
    total_categories = serializers.IntegerField()
    available_books = serializers.IntegerField()
    ebooks_count = serializers.IntegerField()
    paper_books_count = serializers.IntegerField()
    average_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    bestsellers_count = serializers.IntegerField()
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    books_with_discount = serializers.IntegerField()