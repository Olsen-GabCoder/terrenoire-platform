# Journal des versions

Toutes les évolutions notables du site Terre Noire Éditions sont consignées ici,
de la plus récente à la plus ancienne.

La numérotation suit le principe **MAJEUR.MINEUR.CORRECTIF** (ex. `1.4.2`) :

- **CORRECTIF** (`1.0.0` → `1.0.1`) : correction d'un défaut, sans changement visible pour l'usage ;
- **MINEUR** (`1.0.1` → `1.1.0`) : nouveauté ou amélioration visible, compatible avec l'existant ;
- **MAJEUR** (`1.4.2` → `2.0.0`) : refonte ou changement profond du fonctionnement.

Le numéro en vigueur est écrit dans le fichier [`VERSION`](VERSION). Il est affiché
en bas de chaque page du site, dans le tableau de bord administrateur et renvoyé
par l'API (`/api/health/`).

---

## [1.0.0] — 2026-10-07 · Lancement officiel

Première version publique de la plateforme.

### Pour les lecteurs
- Catalogue complet : recherche, filtres par catégorie, format et disponibilité.
- Fiches livres : prix papier et ebook, extrait à lire en ligne, avis, livres associés.
- Collections et pages auteurs.
- Liste d'envie, panier et commande en trois étapes (panier, livraison, paiement).
- Paiement mobile : Airtel Money, Moov Money et BambooPay.
- Liseuse en ligne protégée pour les ebooks achetés.
- Espace client : bibliothèque d'ebooks, suivi des commandes, factures, paramètres.
- Soumission de manuscrits avec suivi éditorial.
- Newsletter, page contact, FAQ, livraison et pages légales (CGV, confidentialité, cookies).

### Pour l'équipe
- Tableau de bord administrateur : livres, auteurs, collections, commandes,
  manuscrits, utilisateurs, codes promo, newsletter, messages et réglages.

### Qualité et sécurité
- Design unifié, pensé d'abord pour le mobile.
- Sessions révoquées au changement de mot de passe, politique de sécurité du
  contenu, contrôle des fichiers envoyés, limitation des tentatives abusives.
- Numéro de version visible ; un onglet resté ouvert pendant une mise en ligne
  propose d'actualiser au lieu d'afficher une erreur.

---

*Avant la version 1.0.0 : phase de conception et de développement (mai à
octobre 2026), sans numéro de version.*
