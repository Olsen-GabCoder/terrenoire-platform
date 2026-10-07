import logging

from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model, update_session_auth_hash
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.core.mail import send_mail
from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView
from apps.core.throttling import RegisterThrottle, PasswordResetThrottle, PublicEndpointThrottle
from .tokens import revoke_user_tokens
from .serializers import (
    UserRegistrationSerializer,
    UserDetailSerializer,
    UserUpdateSerializer,
    PasswordChangeSerializer,
    UserListSerializer
)
from .token_serializers import EmailTokenObtainPairSerializer
from .password_reset_serializers import ForgotPasswordSerializer, ResetPasswordSerializer

logger = logging.getLogger(__name__)

User = get_user_model()


class EmailTokenObtainPairView(TokenObtainPairView):
    """
    Vue personnalisée pour permettre la connexion avec l'email ou le username.
    """
    serializer_class = EmailTokenObtainPairSerializer


class UserRegistrationView(generics.CreateAPIView):
    """
    Vue pour l'inscription d'un nouvel utilisateur.
    Accessible à tous (pas besoin d'être authentifié).
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegisterThrottle]

    def create(self, request, *args, **kwargs):
        """
        Surcharge pour personnaliser la réponse après création.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.perform_create(serializer)

        # Email de bienvenue (ne pas bloquer l'inscription si l'envoi échoue)
        try:
            from apps.core.email import send_welcome_registration
            send_welcome_registration(user)
        except Exception:
            pass

        # L'utilisateur est connecté directement : le frontend n'a plus à refaire
        # un login (qui échouait quand le nom d'utilisateur contenait des majuscules,
        # car il est enregistré en minuscules).
        from rest_framework_simplejwt.tokens import RefreshToken
        from .jwt_cookie_views import _set_auth_cookies
        from .tokens import add_session_claims
        refresh = add_session_claims(RefreshToken.for_user(user), user)
        access = str(refresh.access_token)

        headers = self.get_success_headers(serializer.data)
        response = Response(
            {
                'message': 'Inscription réussie !',
                'user': UserDetailSerializer(user, context=self.get_serializer_context()).data,
                'access': access,
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
            headers=headers
        )
        _set_auth_cookies(response, access, str(refresh))
        return response

    def perform_create(self, serializer):
        """Sauvegarde l'instance d'utilisateur"""
        return serializer.save()


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Vue pour récupérer et mettre à jour le profil de l'utilisateur connecté.
    Seul l'utilisateur authentifié peut accéder à son propre profil.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        """
        Retourne l'utilisateur actuellement authentifié.
        Pas besoin de passer l'ID dans l'URL.
        """
        return self.request.user

    def get_serializer_class(self):
        """
        Retourne le sérialiseur approprié selon la méthode HTTP.
        - GET : UserDetailSerializer (lecture complète)
        - PUT/PATCH : UserUpdateSerializer (mise à jour partielle)
        """
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserDetailSerializer

    def update(self, request, *args, **kwargs):
        """
        Surcharge pour personnaliser la réponse après mise à jour.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Retourne les données mises à jour avec le sérialiseur de détail
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(
            {
                'message': 'Profil mis à jour avec succès',
                'user': UserDetailSerializer(instance, context=self.get_serializer_context()).data
            }
        )


class ChangePasswordView(generics.UpdateAPIView):
    """
    Vue pour changer le mot de passe de l'utilisateur connecté.
    Nécessite l'ancien mot de passe pour des raisons de sécurité.
    """
    serializer_class = PasswordChangeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Retourne l'utilisateur actuellement authentifié"""
        return self.request.user

    def update(self, request, *args, **kwargs):
        """
        Surcharge pour changer le mot de passe et personnaliser la réponse.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Mettre à jour la session pour éviter la déconnexion
        update_session_auth_hash(request, user)

        # Les anciens jetons sont désormais refusés partout (autres appareils
        # déconnectés) : cet appareil reçoit une nouvelle paire de jetons.
        from rest_framework_simplejwt.tokens import RefreshToken
        from .jwt_cookie_views import _set_auth_cookies
        from .tokens import add_session_claims
        refresh = add_session_claims(RefreshToken.for_user(user), user)
        response = Response(
            {
                'message': 'Mot de passe changé avec succès',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_200_OK
        )
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


class UserListView(generics.ListAPIView):
    """
    Vue pour lister les utilisateurs (réservée aux administrateurs).
    Utilisation typique : panel d'administration.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None  # Ou utilisez PageNumberPagination selon vos besoins


class UserDetailAdminView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vue d'administration pour gérer un utilisateur spécifique.
    Permet de voir, modifier ou supprimer un utilisateur (soft delete).
    """
    queryset = User.objects.all()
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'id'

    def perform_destroy(self, instance):
        """
        Soft delete : désactive l'utilisateur au lieu de le supprimer.
        """
        instance.is_active = False
        instance.save()


class ForgotPasswordView(APIView):
    """
    Demande de réinitialisation du mot de passe.
    POST /api/users/forgot-password/ avec { "email": "user@example.com" }
    Envoie un email avec un lien de réinitialisation (même réponse si email inexistant, pour éviter l'enumération).
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower().strip()

        user = User.objects.filter(email__iexact=email).first()
        if user and user.is_active:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            frontend_url = settings.FRONTEND_URL.rstrip('/')
            reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"

            subject = "Réinitialisation de votre mot de passe — Terre Noire Éditions"
            message = (
                f"Bonjour,\n\n"
                f"Vous avez demandé la réinitialisation de votre mot de passe.\n\n"
                f"Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :\n{reset_url}\n\n"
                f"Ce lien expire dans 24 heures.\n\n"
                f"Si vous n'avez pas fait cette demande, ignorez cet email.\n\n"
                f"L'équipe Terre Noire Éditions"
            )
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception:
                # Même réponse que pour une adresse inconnue : une erreur 503
                # réservée aux comptes existants révélerait qui est client.
                logger.exception("password_reset.email_failed user=%s", user.pk)

        return Response({
            'message': "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."
        }, status=status.HTTP_200_OK)


def _notify_password_changed(user):
    try:
        from apps.core.email import send_password_changed
        send_password_changed(user)
    except Exception:
        pass


class ResetPasswordView(APIView):
    """
    Réinitialisation du mot de passe avec token.
    POST /api/users/reset-password/ avec { "uid": "...", "token": "...", "new_password": "..." }
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicEndpointThrottle]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {'message': 'Lien invalide ou expiré. Demandez un nouveau lien.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {'message': 'Lien invalide ou expiré. Demandez un nouveau lien.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        revoke_user_tokens(user)
        _notify_password_changed(user)
        return Response({'message': 'Mot de passe réinitialisé avec succès.'}, status=status.HTTP_200_OK)


class CheckAuthView(APIView):
    """
    Vue pour vérifier si l'utilisateur est authentifié.
    Utile pour le frontend pour vérifier l'état d'authentification.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Retourne les informations de l'utilisateur si authentifié.
        """
        return Response({
            'authenticated': True,
            'user': UserDetailSerializer(request.user, context={'request': request}).data
        })