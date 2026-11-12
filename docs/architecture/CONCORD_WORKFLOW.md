# Workflow Concord

## Rôle de Concord

Concord coordonne les tâches, les périmètres, les propriétaires et les handoffs. Le dépôt demeure la source durable du produit et de ses décisions : les exigences, contrats et décisions approuvées doivent être versionnés dans `docs/`. La disponibilité de Concord ou de son stockage local ne doit pas être nécessaire pour comprendre ou construire le projet.

## Workspace Mijora

Le workspace Concord a été inspecté au début de la Phase 1 et résout vers le dépôt `C:\Users\bmd-tech\Desktop\Mijora`. Il ne pointe pas vers l'ancien dossier `Desktop\MCP`; aucune reconnexion ou réinitialisation n'a été nécessaire. Les fichiers locaux `.concord` sont ignorés par Git et ne remplacent pas la documentation du dépôt.

Les tâches de planification `MIJORA-PLAN`, `MIJORA-SCOPE`, `MIJORA-ARCH`, `MIJORA-DATA`, `MIJORA-API`, `MIJORA-UX` et `MIJORA-PHASE1` ont été consultées. Elles sont clôturées comme livrables de planification. Les choix explicitement approuvés depuis sont consignés dans les tâches Phase 1 et dans les documents versionnés.

## Cycle d'une tâche

1. Inspecter le workspace et les tâches existantes avant de proposer un travail.
2. Créer/réclamer une tâche avec un objectif borné, un parent, un propriétaire, des modules/domaines et des fichiers attendus précis.
3. Vérifier les chevauchements; séquencer les changements qui touchent un même fichier ou dossier partagé.
4. Enregistrer décisions, hypothèses, blocages et progrès dans Concord; répercuter les décisions durables dans le dépôt.
5. Avant clôture, inspecter les tests et livrables puis enregistrer les fichiers changés, commandes, risques et suites.

## Propriété et parallélisation

- Le propriétaire produit valide les décisions de produit, contenu, données personnelles et fournisseurs.
- Le coordinateur technique possède les fichiers racine, contrats transverses, configuration et intégration tant qu'aucun autre agent n'est effectivement connecté.
- Un futur propriétaire data/backend doit être attribué à `prisma/`, `src/server/` et aux Route Handlers métier.
- Un futur propriétaire frontend doit être attribué aux pages/features UI; les composants de navigation partagés ont un seul propriétaire.
- QA/revue indépendante peut valider les tests sans être fictivement assignée avant présence Concord.

Les modifications du schéma Prisma, API publiques, authentification, CI et composants partagés sont séquencées ou explicitement attribuées; ne pas supposer que plusieurs agents disposent du même filesystem.

## État de la Phase 1

L'audit initial a trouvé le workspace correspondant au dépôt, branche `main`, remote `origin` inchangé et README initial. Les autres fichiers de configuration présents avant le travail sont préservés. Aucun push ou commit n'est autorisé sans approbation distincte du propriétaire.
