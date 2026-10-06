# backend/apps/users/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour l'inscription d'un nouvel utilisateur.
    Gère la création sécurisée avec hachage du mot de passe.
    """
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Mot de passe (minimum 8 caractères)"
    )
    
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Confirmez votre mot de passe"
    )
    
    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'phone_number',  # ✅ OPTIONNEL
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True},
            'phone_number': {'required': False, 'allow_blank': True},  # ✅ CORRECTION ICI
        }
    
    def validate_email(self, value):
        """
        Vérifie que l'email n'est pas déjà utilisé
        """
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError(
                "Un compte avec cet email existe déjà."
            )
        return value.lower()
    
    def validate_username(self, value):
        """
        Vérifie que le nom d'utilisateur n'est pas déjà pris
        """
        if User.objects.filter(username=value.lower()).exists():
            raise serializers.ValidationError(
                "Ce nom d'utilisateur est déjà pris."
            )
        return value.lower()
    
    def validate_phone_number(self, value):
        """
        Vérifie que le numéro de téléphone n'est pas déjà utilisé (si fourni)
        """
        # ✅ CORRECTION : Accepter les valeurs vides
        if not value or value.strip() == '':
            return None  # Retourner None si vide
        
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "Ce numéro de téléphone est déjà associé à un compte."
            )
        return value
    
    def validate_password(self, value):
        """
        Valide le mot de passe selon les règles Django
        """
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """
        Vérifie que les deux mots de passe correspondent
        """
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Les mots de passe ne correspondent pas."
            })
        return attrs
    
    def create(self, validated_data):
        """
        Crée un nouvel utilisateur avec le mot de passe haché
        """
        # Retirer password_confirm car ce n'est pas un champ du modèle
        validated_data.pop('password_confirm')
        
        # ✅ CORRECTION : Gérer phone_number optionnel
        phone_number = validated_data.pop('phone_number', None)
        
        # Créer l'utilisateur avec create_user (hache automatiquement le mot de passe)
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
        )
        
        # ✅ Ajouter phone_number seulement s'il est fourni
        if phone_number:
            user.phone_number = phone_number
            user.save()
        
        return user


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour afficher et mettre à jour le profil utilisateur.
    Les champs sensibles (username, email) sont en lecture seule.
    """
    
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    full_address = serializers.CharField(read_only=True)
    has_complete_profile = serializers.BooleanField(read_only=True)
    profile_image = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'profile_image',
            'phone_number',
            'address',
            'city',
            'country',
            'full_address',
            'has_complete_profile',
            'receive_newsletter',
            'date_joined',
            'last_login',
            'is_staff',
            'is_superuser',
        ]
        read_only_fields = [
            'id',
            'username',
            'email',
            'date_joined',
            'last_login',
            'is_staff',
            'is_superuser',
        ]
    
    def get_profile_image(self, obj):
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None
    
    def validate_phone_number(self, value):
        """
        Vérifie que le nouveau numéro n'est pas déjà utilisé par un autre utilisateur
        """
        # ✅ CORRECTION : Accepter les valeurs vides
        if not value or value.strip() == '':
            return None
        
        user = self.context['request'].user
        if User.objects.filter(phone_number=value).exclude(id=user.id).exists():
            raise serializers.ValidationError(
                "Ce numéro de téléphone est déjà utilisé par un autre compte."
            )
        return value


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la mise à jour du profil utilisateur.
    Permet de modifier uniquement les informations de profil.
    """
    
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'profile_image',
            'phone_number',
            'address',
            'city',
            'country',
            'receive_newsletter',
        ]
    
    def validate_phone_number(self, value):
        """
        Vérifie que le nouveau numéro n'est pas déjà utilisé
        """
        # ✅ CORRECTION : Accepter les valeurs vides
        if not value or value.strip() == '':
            return None
        
        user = self.instance
        if User.objects.filter(phone_number=value).exclude(id=user.id).exists():
            raise serializers.ValidationError(
                "Ce numéro de téléphone est déjà utilisé."
            )
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """
    Sérialiseur pour le changement de mot de passe.
    Nécessite l'ancien mot de passe pour des raisons de sécurité.
    """
    
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate_old_password(self, value):
        """
        Vérifie que l'ancien mot de passe est correct
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError(
                "L'ancien mot de passe est incorrect."
            )
        return value
    
    def validate_new_password(self, value):
        """
        Valide le nouveau mot de passe
        """
        try:
            validate_password(value, self.context['request'].user)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
    
    def validate(self, attrs):
        """
        Vérifie que les deux nouveaux mots de passe correspondent
        """
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "Les mots de passe ne correspondent pas."
            })
        return attrs
    
    def save(self, **kwargs):
        """
        Change le mot de passe de l'utilisateur
        """
        from .tokens import revoke_user_tokens
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        revoke_user_tokens(user)
        return user


class UserListSerializer(serializers.ModelSerializer):
    """
    Sérialiseur simplifié pour lister les utilisateurs (admin).
    """
    
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'full_name',
            'phone_number',
            'city',
            'is_active',
            'date_joined',
        ]
        read_only_fields = fields