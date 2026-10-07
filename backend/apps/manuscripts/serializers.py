from rest_framework import serializers

from apps.users.phone import normalize_phone
from .models import Manuscript



def _file_content_matches_extension(uploaded):
    """Vérifie la signature (magic bytes) du fichier selon son extension."""
    import zipfile
    name = (getattr(uploaded, 'name', '') or '').lower()
    pos = uploaded.tell() if hasattr(uploaded, 'tell') else 0
    try:
        uploaded.seek(0)
        head = uploaded.read(8)
        if name.endswith('.pdf'):
            return head.startswith(b'%PDF-')
        if name.endswith('.doc'):
            return head == b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1'
        if name.endswith('.docx'):
            if not head.startswith(b'PK\x03\x04'):
                return False
            uploaded.seek(0)
            try:
                with zipfile.ZipFile(uploaded) as z:
                    return 'word/document.xml' in z.namelist()
            except zipfile.BadZipFile:
                return False
        return False
    finally:
        uploaded.seek(pos)

class ManuscriptSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la soumission de manuscrits
    Les auteurs peuvent soumettre leur manuscrit (PDF/DOCX)
    Le champ 'status' est en lecture seule (géré par l'admin)
    """
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Manuscript
        fields = [
            'id',
            'title',
            'author_name',
            'pen_name',
            'email',
            'phone_number',
            'country',
            'genre',
            'language',
            'page_count',
            'file',
            'file_url',
            'description',
            'terms_accepted',
            'status',
            'status_display',
            'submitted_at',
        ]
        read_only_fields = ['id', 'status', 'submitted_at']
    
    def get_file_url(self, obj):
        """Retourne l'URL complète du fichier manuscrit"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def validate_file(self, value):
        """Validation personnalisee du fichier (taille + type MIME)"""
        max_size = 10 * 1024 * 1024  # 10 MB

        if value.size > max_size:
            raise serializers.ValidationError(
                "Le fichier est trop volumineux. Taille maximale: 10 MB."
            )

        allowed_mime_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]
        content_type = getattr(value, 'content_type', None)
        if content_type and content_type not in allowed_mime_types:
            raise serializers.ValidationError(
                "Type de fichier non accepte. Seuls les fichiers PDF et Word (.doc, .docx) sont autorises."
            )

        # Le type déclaré par le navigateur et l'extension se falsifient
        # facilement : on vérifie aussi le contenu réel du fichier.
        if not _file_content_matches_extension(value):
            raise serializers.ValidationError(
                "Le contenu du fichier ne correspond pas à un document PDF ou Word valide."
            )

        return value
    
    def validate_email(self, value):
        """Validation personnalisée de l'email"""
        return value.lower()
    
    def validate_phone_number(self, value):
        """Numéro normalisé (E.164) : gabonais ou international."""
        try:
            phone = normalize_phone(value)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        if not phone:
            raise serializers.ValidationError("Le numéro de téléphone est requis.")
        return phone

    def validate_page_count(self, value):
        """Validation du nombre de pages"""
        if value is not None and (value < 1 or value > 10000):
            raise serializers.ValidationError(
                "Le nombre de pages doit être entre 1 et 10 000."
            )
        return value

    def validate_terms_accepted(self, value):
        """Validation de l'acceptation des conditions"""
        if value in (True, 'true', '1', 'on', 'yes'):
            return True
        raise serializers.ValidationError(
            "Vous devez accepter les conditions de soumission."
        )

    def validate(self, attrs):
        """Vérifier terms_accepted si absent (checkbox non cochée)"""
        terms = attrs.get('terms_accepted')
        if terms is None:
            terms = self.initial_data.get('terms_accepted')
        if terms not in (True, 'true', '1', 'on', 'yes'):
            raise serializers.ValidationError({
                'terms_accepted': ["Vous devez accepter les conditions de soumission."]
            })
        attrs['terms_accepted'] = True
        return attrs

    def validate_description(self, value):
        """Validation de la description (min 50 caractères)"""
        if len(value.strip()) < 50:
            raise serializers.ValidationError(
                "La description doit contenir au moins 50 caractères."
            )
        return value


class ManuscriptListSerializer(serializers.ModelSerializer):
    """
    Sérialiseur allégé pour la liste des manuscrits (admin)
    """
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Manuscript
        fields = [
            'id',
            'title',
            'author_name',
            'email',
            'status',
            'status_display',
            'submitted_at',
        ]
        read_only_fields = fields