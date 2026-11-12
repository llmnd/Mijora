# Définition of Done

Un changement est terminé lorsqu'il satisfait les critères applicables ci-dessous et que les résultats sont rapportés sans exagérer ce qui a été exécuté.

## Fonctionnel et architecture

- Le comportement répond au périmètre approuvé et ne contourne pas les règles métier.
- Les modules restent cohérents; les accès DB sont côté serveur et les validations sont appliquées aux frontières.
- Les changements compatibles sont additive-first; toute décision d'architecture nouvelle est documentée.
- Aucun dossier vide ni abstraction prématurée n'est ajouté.

## Qualité et accessibilité

- TypeScript strict, lint et build passent.
- Les tests pertinents couvrent le comportement introduit ou corrigé.
- L'interface est mobile-first, utilisable au clavier et compréhensible avec les états de chargement, erreur et absence de résultats nécessaires.
- Les médias sont optimisés et leurs droits/provenance sont conservés.

## Données, sécurité et vie privée

- Les permissions sont appliquées côté serveur; les rôles ne sont pas acceptés depuis l'entrée utilisateur comme preuve d'accès.
- Les entrées externes sont validées, les erreurs ne divulguent pas d'informations sensibles et les secrets restent hors du dépôt.
- Le schéma et la migration sont cohérents, relisibles et testés dans un environnement non-production.
- Les données personnelles et journaux sont minimisés; aucune rétention non approuvée n'est activée.
- Aucun contenu culinaire, récit, prix, valeur nutritionnelle, photo ou attribution n'est inventé.
- Aucun service externe ou abonnement payant n'est activé sans approbation.

## Documentation et livraison

- Les contrats, variables d'environnement, migrations ou procédures touchées sont documentés.
- Les nouvelles variables sont indiquées dans `.env.example` sans valeur secrète.
- Les commandes de test réellement exécutées et leurs résultats sont consignés.
- La CI est verte ou toute limitation connue est explicitement rapportée.
- La revue Concord cite les fichiers, tests, décisions, risques, blocages et suites; aucun push/commit n'est effectué sans accord explicite.
