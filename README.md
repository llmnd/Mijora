# Mijora

Mijora est une plateforme de découverte culinaire et d'inspiration pour aider chacun à savoir quoi cuisiner. Le lancement vise le Sénégal, avec une expérience mobile-first, éditoriale et accessible, pensée pour accueillir progressivement d'autres pays et cuisines.

## Vision

Relier les plats, les recettes, les ingrédients et leurs contextes grâce à un catalogue utile, fiable et traçable. La qualité éditoriale, le respect des droits d'auteur et l'authenticité priment sur le volume de contenu.

## Fonctionnalités prévues

- Découverte de plats, recettes et ingrédients, avec recherche et filtres.
- Recherche et suggestions de recettes à partir des ingrédients disponibles.
- Recettes liées à un plat, avec quantités, étapes et médias.
- Comptes, préférences, favoris et collections.
- Administration éditoriale avec rôles `user`, `editor` et `admin`.
- Suggestions déterministes et explicables; l'IA reste facultative.

Le périmètre détaillé et les exclusions du MVP sont décrits dans [docs/product/MVP_SCOPE.md](docs/product/MVP_SCOPE.md).

## Fondations techniques

- Next.js App Router, React et TypeScript strict.
- Monolithe modulaire avec Route Handlers Next.js pour l'API.
- PostgreSQL managé sur Neon et Prisma Migrate.
- Neon Object Storage S3-compatible pour les images (bucket privé `assets`).
- Better Auth pour l'authentification; RBAC appliqué côté serveur.
- Tailwind CSS et composants accessibles et réutilisables.
- Zod, Vitest, Testing Library et Playwright.
- GitHub Actions pour les vérifications continues.

Le frontend et le backend intégré seront hébergés ensemble sur Vercel dans un seul projet Next.js. PostgreSQL et les médias restent sur Neon; les e-mails transactionnels restent à choisir. Le stockage des médias utilise le bucket privé Neon `assets`; Cloudinary n'est pas utilisé. Voir [docs/architecture/ARCHITECTURE_DECISIONS.md](docs/architecture/ARCHITECTURE_DECISIONS.md).

## Démarrage local

Prérequis : Node.js 24 LTS (ou version compatible avec les moteurs déclarés), npm et une branche Neon de développement, ou une base PostgreSQL locale.

```powershell
npm install
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
# Lister les branches puis créer ou sélectionner une branche de développement :
neon branches list
neon checkout dev --create
neon env pull
# Compléter les variables d'authentification uniquement dans .env.local.
npm run db:validate
npm run db:generate
npm run dev
```

Les écrans de compte sont disponibles sur `/inscription`, `/connexion` et `/mot-de-passe-oublie`; le lien de réinitialisation ouvre `/reinitialiser-mot-de-passe`. La vérification e-mail est requise; en développement, les liens apparaissent dans le terminal Next.js. Les nouveaux comptes ont le rôle `user`; un administrateur doit attribuer `editor` ou `admin` séparément pour autoriser l'édition et l'upload média.

Le frontend et les Route Handlers backend s'exécutent dans le même serveur Next.js, par défaut sur `http://localhost:3000`; un seul port suffit et aucun script `dev:all` n'est nécessaire. Pour changer le port, utilisez `npm run dev -- -p 3001`.

En production, Vercel hébergera ce même projet Next.js : pages et Route Handlers `/api/v1` seront déployés ensemble. Le déploiement Vercel et ses variables d'environnement restent à configurer; ne connectez pas les déploiements Preview à la base de production.

`DATABASE_URL` sert aux connexions applicatives. Prisma privilégie `DIRECT_URL`, puis `DATABASE_URL_UNPOOLED` pour les migrations. Les variables `AWS_*` du stockage sont fournies par Neon; ne les copiez jamais dans Git. Ne lancez pas de migration locale contre la branche de production.

Les commandes Prisma qui modifient la base sont refusées si `NEON_BRANCH=production`. Un déblocage explicite exige `ALLOW_PRODUCTION_MIGRATIONS=true` après approbation d'une migration de production.

Commandes de validation :

```powershell
npm run lint
npm run typecheck
npm run test
npx playwright install chromium
npm run test:e2e
```

Appliquez les migrations locales avec `npm run db:migrate` après configuration d'une base de développement. Les migrations, le navigateur Playwright et les variables requises sont documentés dans [docs/README.md](docs/README.md) et dans les scripts du projet. Les informations de connexion et clés réelles restent dans les variables locales, jamais dans Git.

## Documentation

Commencez par [docs/README.md](docs/README.md) pour le catalogue documentaire, puis consultez la [vue d'ensemble produit](docs/product/PRODUCT_OVERVIEW.md), l'[architecture](docs/architecture/SYSTEM_ARCHITECTURE.md) et la [feuille de route](docs/roadmap/DEVELOPMENT_ROADMAP.md).

## État du projet

Le dépôt établit les fondations de Mijora V1. Aucun contenu culinaire de démonstration n'est inventé; les contenus publiés devront être sourcés, vérifiés et validés humainement.
