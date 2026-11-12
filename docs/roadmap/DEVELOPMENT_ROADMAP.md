# Feuille de route de développement

La séquence ci-dessous s'appuie sur le plan MIJORA-PLAN et les décisions confirmées par le propriétaire. Les phases fonctionnelles ne sont pas réputées livrées par la seule présence de cette feuille de route.

## Phase 1 — Fondation technique

- Squelette Next.js App Router, TypeScript strict, lint et scripts reproductibles.
- PostgreSQL/Neon et Prisma avec schéma initial, migrations et configuration sans secrets.
- Authentification Better Auth, politique RBAC et abstractions d'e-mail; activation d'un fournisseur e-mail reportée.
- Contrats de validation Zod, conventions d'erreur et intégration des Route Handlers.
- Tests unitaires et d'interface, tests navigateur, GitHub Actions et documentation de démarrage.
- Vérification de l'accessibilité de base, des variables d'environnement et du comportement sans services externes configurés.

## Phase 2 — Catalogue et découverte

- Entités de plats, recettes, étapes, ingrédients, unités, synonymes, catégories et régions validées.
- Parcours public de découverte et recherche filtrée.
- Administration des ingrédients et flux de contenu à valider avant publication.
- Import de données uniquement depuis des sources autorisées et contrôlées.

## Phase 3 — Comptes et personnalisation

- Préférences, favoris et collections typés pour plats, recettes et ingrédients.
- Google OAuth après configuration approuvée.
- Vérification et nettoyage des accès, des sessions et des politiques de rétention.

## Phase 4 — Recherche par ingrédients et recommandations

- Sélection multi-ingrédients et recherche des recettes correspondantes.
- Classement déterministe, explications disponibles/manquants et filtres pertinents.
- Mesure par tests fonctionnels; intégration IA éventuelle seulement après validation distincte.

## Phase 5 — Administration et qualité éditoriale

- Gestion des utilisateurs, rôles, contributions, validation et audit.
- Conservation des sources, droits médias, historique éditorial et retrait de contenu.
- Contrôle de fusion et d'archivage des ingrédients.

## Phase 6 — Préparation de production

- Déploiement de l'application Next.js sur Vercel; connecter le dépôt, configurer les environnements, les secrets et le domaine de production.
- Choix et configuration du fournisseur d'e-mails; Neon Object Storage est retenu pour les images.
- Sécurité, accessibilité, performance mobile, sauvegarde/restauration et observabilité.
- Déploiement progressif, vérifications CI et procédures d'exploitation documentées.

## Dépendances et règles de séquencement

La fondation précède les modules métier. Le schéma relationnel validé précède les API de données; les contrats API et les permissions doivent être stabilisés avant tout travail parallèle d'interface et de services. L'authentification précède les favoris et les opérations admin. Le catalogue d'ingrédients est préalable aux parcours de recherche par ingrédients.

La décision d'hébergement Vercel est approuvée. La configuration des comptes et des déploiements, le fournisseur d'e-mail, la politique exacte de rétention, les contenus du catalogue et leur localisation restent à valider avant activation en production.
