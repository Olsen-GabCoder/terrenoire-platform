"""Permissions partagées entre les apps."""
from rest_framework.permissions import IsAdminUser, IsAuthenticatedOrReadOnly


class CatalogWritePermissionMixin:
    """
    Catalogue (livres, auteurs, catégories, collections) :
    - lecture publique ;
    - création / modification / suppression réservées aux administrateurs ;
    - les actions personnalisées (avis, likes, réponses...) restent ouvertes
      aux utilisateurs connectés.
    """
    ADMIN_ACTIONS = ('create', 'update', 'partial_update', 'destroy')

    def get_permissions(self):
        if self.action in self.ADMIN_ACTIONS:
            return [IsAdminUser()]
        return [IsAuthenticatedOrReadOnly()]
