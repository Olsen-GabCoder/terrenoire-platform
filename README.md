# Terre Noire Éditions

Site vitrine et e-commerce pour la maison d'édition Terre Noire Éditions (Port-Gentil, Gabon).

- **Backend** : Django 5 + Django REST Framework (API), MySQL en dev / PostgreSQL en prod
- **Frontend** : React 19 + Vite 7

## Démarrer en local

Voir le **[GUIDE_PROJET.md](GUIDE_PROJET.md)** pour les instructions détaillées (environnement, migrations, lancer backend et frontend).

En résumé :

```bash
# Backend
cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py runserver

# Frontend (autre terminal)
cd frontend && npm install && npm run dev
```

Configurer `backend/.env` (copier depuis `backend/.env.example`) avec la base MySQL et, si besoin, SMTP et Cloudinary.

## Versions

Version actuelle : voir le fichier [`VERSION`](VERSION) ; historique dans le
**[CHANGELOG.md](CHANGELOG.md)**.

Pour publier une nouvelle version :

1. choisir le numéro (correctif, mineur ou majeur, voir le CHANGELOG) ;
2. le reporter dans `VERSION` **et** dans `frontend/package.json` (un test vérifie qu'ils sont identiques) ;
3. ajouter l'entrée correspondante en tête du `CHANGELOG.md` ;
4. pousser sur `main`, puis marquer la version : `git tag -a vX.Y.Z -m "Version X.Y.Z"` et `git push origin vX.Y.Z`.

## Structure

| Dossier   | Rôle |
|----------|------|
| `backend/` | API Django (livres, commandes, utilisateurs, manuscrits, etc.) |
| `frontend/` | Application React (catalogue, panier, compte, admin) |

- Déploiement backend : **backend/DEPLOYMENT.md**
- Déploiement frontend : **frontend/DEPLOYMENT.md**
- Création admin sans shell : **backend/docs/CREATE_ADMIN.md**
- Cloudinary (images) : **backend/docs/CLOUDINARY.md**
