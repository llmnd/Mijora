# Stratégie de test

## Objectifs

Les tests vérifient les comportements, invariants métier, permissions, contrats et parcours essentiels. Ils ne remplacent ni la revue éditoriale du contenu, ni la validation de la sécurité, ni les mesures de performance réelles.

## Niveaux

### Tests unitaires — Vitest

Tester les fonctions métier pures et les validations Zod : normalisation d'ingrédients, filtres, pagination, calculs et règles de permission. Utiliser des cas limites utiles et des données synthétiques non présentées comme contenu culinaire vérifié.

### Tests de composants — Vitest et Testing Library

Tester les composants accessibles à travers le DOM et les interactions clavier/utilisateur. Vérifier les états chargement, erreur, vide, validation et succès utiles au comportement. Éviter les tests d'implémentation interne et les snapshots volumineux.

### Tests d'intégration

Vérifier Route Handlers, services, repositories, schémas de requête/réponse, sessions et contrôle d'accès. Les tests qui utilisent PostgreSQL doivent se connecter à une base ou branche de test séparée; ne jamais utiliser les données de production. Vérifier les contraintes et migrations sur une base jetable avant livraison de changements de schéma.

### Tests de bout en bout — Playwright

Valider quelques parcours réalistes sur une application lancée localement : ouverture du catalogue public, recherche et navigation; authentification et parcours protégés dès qu'ils sont implémentés. Les tests doivent fonctionner sans compte de fournisseur payant ni envoi d'e-mail réel.

## Contrôles obligatoires

- Validation d'entrées invalides et d'erreurs HTTP cohérentes.
- Permissions pour `user`, `editor` et `admin`, y compris accès interdit et propriété des données.
- Cohérence des relations plat/recette/ingrédient, quantités et statuts éditoriaux.
- Absence de visibilité publique des contenus non publiés.
- Parcours clavier et noms accessibles pour les composants interactifs.
- Migrations rejouables dans un environnement isolé et vérification de génération Prisma.

## Exécution locale et CI

Les commandes principales sont `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e` et `npm run build`. GitHub Actions exécute les contrôles requis sur les changements; les tests E2E installent le navigateur Playwright prévu par la CI.

Une CI verte ne constitue pas une preuve de conformité éditoriale, de configuration de production, de restauration de sauvegarde ou de performance sur réseau mobile. Ces vérifications doivent être exécutées et documentées séparément avant lancement.

## Gestion des données de test

Aucun fait ou recette réel n'est fabriqué pour les tests. Les fixtures sont clairement synthétiques et exclues de tout seed de production. Les secrets, adresses personnelles et données de production ne sont pas utilisés. Les e-mails sont interceptés ou consignés uniquement en mode développement/test.
