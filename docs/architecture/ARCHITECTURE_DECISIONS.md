# Décisions d'architecture

Ce registre distingue les décisions approuvées des propositions et questions reportées. Une proposition ne doit pas être transformée en dépendance fournisseur ou en engagement de production sans validation.

## Décisions approuvées

### ADR-001 — Monolithe modulaire Next.js

- **Statut :** approuvé.
- **Décision :** Next.js App Router, React et TypeScript strict; les Route Handlers Next.js servent le backend intégré sous `/api/v1`.
- **Conséquence :** pas d'API Node séparée ni de microservices dans la V1. La logique métier est séparée des handlers.

### ADR-002 — PostgreSQL managé et Prisma

- **Statut :** approuvé.
- **Décision :** PostgreSQL sur Neon, Prisma ORM et Prisma Migrate. Utiliser des connexions/configurations d'environnement distinctes pour le développement, les tests et la production.
- **Conséquence :** aucune URL de base ni secret dans le code ou Git; utiliser une couche d'accès aux données côté serveur.

### ADR-003 — Identité et rôles

- **Statut :** approuvé.
- **Décision :** Better Auth pour email/mot de passe, vérification d'adresse, récupération et sessions sécurisées. Les rôles de départ sont `user`, `editor`, `admin`; les politiques restent extensibles. Google OAuth est prévu, mais son activation est ultérieure.
- **Conséquence :** protéger les routes et opérations côté serveur et appliquer le principe du moindre privilège. Neon Managed Auth a été activé sur la branche `production` par l'initialisation Neon, mais n'est pas relié au code Mijora; l'application continue d'utiliser son instance Better Auth et son schéma actuels. Aucune migration d'identité n'est implicite.

### ADR-004 — Données culinaires et publication

- **Statut :** approuvé.
- **Décision :** séparer `Dish`, `Recipe` et `Ingredient`; un plat peut exister sans recette, une recette appartient à un plat, un plat peut avoir plusieurs recettes et les ingrédients sont mutualisés.
- **Conséquence :** les quantités/unités sont portées par la relation recette-ingrédient. Contenu soumis à validation humaine, traçabilité des sources et droits médias. Pas de publication automatique par IA.

### ADR-005 — Recherche et IA

- **Statut :** approuvé.
- **Décision :** découverte et recommandations initiales déterministes et explicables. L'IA est facultative.
- **Conséquence :** le catalogue et la recherche restent utilisables sans service IA; toute fonctionnalité IA future nécessite consentement, minimisation et politique de conservation définie.

## Propositions provisoires et questions reportées

### ADR-006 — Hébergement et services gérés

- **Statut :** hébergement Vercel et stockage d'images Neon approuvés; fournisseur d'e-mail à confirmer.
- **Décision :** déployer l'application Next.js App Router sur Vercel dans un seul projet. L'interface et les Route Handlers `/api/v1` sont livrés ensemble; aucune API backend séparée n'est créée. PostgreSQL et l'authentification Better Auth restent gérés par l'application avec Neon/PostgreSQL; les images restent dans Neon Object Storage.
- **Conséquences :** utiliser le runtime Node.js pour les handlers et intégrations serveur concernés. Configurer les variables d'environnement de production dans Vercel, notamment l'URL publique de l'application, la connexion PostgreSQL et les credentials du bucket. Ne jamais embarquer de secret dans le bundle client. Les déploiements Preview ne doivent pas recevoir les credentials ni les données de production par défaut.
- **Mise en œuvre reportée :** connecter le dépôt GitHub au projet Vercel, configurer les environnements et le domaine de production, puis vérifier auth, lecture/écriture en base, upload d'image et URL de callback Better Auth. Cette décision ne crée aucun compte, projet, domaine ni abonnement.
- **E-mail :** les e-mails restent en mode de test/journalisation jusqu'au choix explicite d'un fournisseur transactionnel et la configuration de son domaine.

- **Stockage média :** Neon Object Storage S3-compatible pour les médias, avec le bucket privé `assets` déclaré dans `neon.ts` et provisionné sur la branche `production`. L'application conserve les clés d'objet dans PostgreSQL et utilise des URL signées pour les lectures; les identifiants S3 restent côté serveur dans l'environnement.
- **Non retenu :** Cloudinary n'est pas utilisé. Aucun objet ni bucket n'est supprimé par cette décision.
- **À décider :** fournisseur transactionnel, domaine d'envoi et exigences opérationnelles. Ne créer aucun compte ni abonnement sans approbation.
- **Note de conservation :** le bucket `mijora`, également présent sur `production`, n'est pas le bucket déclaré par `neon.ts` et reste intact; l'application utilise `assets`.

### ADR-007 — Google OAuth

- **Statut :** reporté.
- **Décision :** prévoir une architecture extensible; ne pas activer OAuth ni stocker de secret client avant choix du fournisseur et configuration approuvée.

### ADR-008 — Conservation des données

- **Statut :** à définir.
- **Question :** durée, consentement et suppression de l'historique de recherche, des journaux de recommandation et des données personnelles.
- **Approche jusqu'à décision :** ne pas activer de collecte persistante d'historique ni de prompts/données personnelles brutes.

## Mise à jour du registre

Toute modification d'une décision approuvée requiert une justification, une évaluation des impacts produit/sécurité/données et la mise à jour des contrats/API et schéma associés.
