# Architecture système

## Décisions structurantes

Mijora V1 est un **monolithe modulaire** : une application Next.js App Router, un catalogue de domaines métier et une base PostgreSQL. Il n'y a pas de microservices ni d'API Node séparée. Les Route Handlers Next.js exposent les endpoints HTTP versionnés; les règles métier restent hors des contrôleurs.

Les Server Components sont le choix par défaut. Les composants client sont réservés aux interactions navigateur. Les interfaces partagées doivent être accessibles, réutilisables et adaptées à une expérience éditoriale mobile-first.

## Couches et responsabilités

| Zone | Responsabilité |
| --- | --- |
| `src/app` | Routes, layouts, pages, loading/error boundaries et Route Handlers. |
| `src/components` | Composants d'interface partagés, sans règles métier spécifiques. |
| `src/features` | Capacités métier isolées (catalogue, recherche, comptes, favoris, administration) lorsqu'elles sont implémentées. |
| `src/server` | Services métier, repositories, policies/RBAC et accès DB côté serveur. |
| `src/lib` | Validation et intégrations techniques, notamment stockage média et e-mail. |
| `prisma` | Modèle relationnel, migrations et configuration Prisma. |
| `tests` | Tests unitaires, d'intégration et navigateur. |

Ne pas créer de dossiers vides pour préfigurer tous les domaines. Les dépendances vont des routes vers les services et des services vers les contrats/repositories; les services ne dépendent pas de composants React.

## Domaines métier

- **Discovery/catalogue :** plats, recettes, régions, catégories, statut de publication et sources.
- **Ingredients :** catalogue, alias localisés, unités et relations quantitatives aux recettes.
- **Search/recommendations :** filtres et correspondance déterministe; aucune IA n'est requise.
- **Identity/profile :** Better Auth, préférences et sessions.
- **Favorites/collections :** relations typées vers plats, recettes et ingrédients.
- **Editorial/admin :** contributions, validation, publication, gestion des rôles et audit.
- **Platform integrations :** base de données, e-mail et images derrière des adaptateurs.

Les domaines ne doivent pas accéder directement aux tables d'un autre domaine sans passer par des interfaces ou services explicites lorsque des invariants métier sont en jeu.

## Données et intégrations

PostgreSQL est la base relationnelle. Neon est le fournisseur approuvé pour le PostgreSQL managé; les bases/branches de développement, test et production doivent rester distinctes. Prisma ORM et Prisma Migrate assurent l'accès et les migrations. Les URLs et secrets sont injectés depuis l'environnement.

Neon Object Storage héberge les médias dans le bucket privé `assets`, déclaré dans `neon.ts` et provisionné sur la branche `production`. L'application utilise l'API S3 avec le endpoint et les credentials propres à la branche, garde seulement la clé d'objet dans PostgreSQL, et génère des URL signées pour lire les images. `AWS_*` est injecté par `neon env pull`; aucun credential n'est exposé au navigateur. Les objets suivent le versionnement par branche de Neon. Cloudinary n'est pas utilisé. L'adaptateur d'envoi d'e-mails reste indépendant et aucun fournisseur n'est encore choisi.

L'authentification du code applicatif est basée sur Better Auth. Neon Managed Auth est activé sur la branche `production`, mais n'est pas branché à l'application; ne pas confondre ces deux intégrations ni migrer l'identité implicitement. Les permissions sont appliquées côté serveur, au niveau des actions et données, et non uniquement en masquant des boutons. Les fonctionnalités de Google OAuth seront ajoutées après configuration séparée.

## Validation et erreurs

Les données HTTP externes sont validées avec Zod à la frontière. Les services retournent des résultats métier typés; les Route Handlers convertissent les erreurs en réponses HTTP cohérentes. Les erreurs ne doivent pas divulguer secrets, tokens, données personnelles ou détails internes. Les logs sont structurés et minimisés.

## Exécution et qualité

Le projet cible Node.js et une CI GitHub Actions. Le build, le lint, le contrôle TypeScript et les tests constituent la vérification minimale d'une modification. Le fournisseur d'hébergement et le fournisseur d'e-mails restent à confirmer; l'intégration de stockage utilise Neon Object Storage.
