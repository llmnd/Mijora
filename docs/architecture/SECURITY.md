# Sécurité

Ce document fixe les contrôles de fondation; les paramètres d'exploitation définitifs seront vérifiés avant tout déploiement public.

## Identité et accès

- Better Auth gère les comptes e-mail/mot de passe, les sessions, la vérification d'adresse et les réinitialisations.
- L'inscription publique attribue uniquement le rôle `user`; aucun rôle transmis par le navigateur n'est accepté comme autorisation.
- La vérification d'adresse est exigée avant connexion. En développement, les liens sont écrits dans le terminal; aucun fournisseur e-mail réel n'est configuré.
- La demande de réinitialisation ne révèle pas si l'adresse existe; le nouveau mot de passe nécessite un jeton valide et une confirmation concordante.
- Google OAuth est prévu mais désactivé jusqu'à approbation et configuration de ses secrets.
- Les rôles initiaux sont `user`, `editor` et `admin`; les permissions sont contrôlées côté serveur et au niveau de chaque action.
- Vérifier la propriété de chaque collection et favori; ne pas se fier à un identifiant fourni dans le corps d'une requête.
- Séparer les permissions éditoriales de gestion des utilisateurs/rôles et appliquer le moindre privilège.
- Les cookies de session de production doivent être sécurisés, HTTP-only et correctement limités à l'origine; les protections CSRF/origine suivent les mécanismes supportés par Better Auth.

| Rôle | Permissions de départ |
| --- | --- |
| `user` | Catalogue public, préférences et collections propres. |
| `editor` | Capacités utilisateur, création/modification et soumission de contenu éditorial. |
| `admin` | Toutes les opérations, y compris revue/publication, comptes, rôles et paramètres. |

Cette séparation de workflow est une politique initiale de moindre privilège; confirmer si les éditeurs doivent également approuver ou publier du contenu avant d'activer l'administration métier.

## Secrets et environnements

- Les secrets (Better Auth, connexions DB, e-mail, OAuth) sont injectés par variables d'environnement et ne sont ni commités ni affichés.
- `.env.local` et les fichiers `.env*` réels sont ignorés par Git; `.env.example` ne contient que des valeurs vides ou non sensibles.
- Les bases Neon de développement, test et production sont séparées.
- Toute valeur manquante requise en production provoque une erreur explicite; ne pas fournir de fallback qui ressemble à une configuration opérationnelle.

## E-mails de sécurité

Vérification d'adresse, réinitialisation de mot de passe et notifications pertinentes utilisent une interface d'envoi indépendante du fournisseur.

En développement, l'adaptateur doit rester en mode test/journalisation, sans envoi réel. En production, la configuration doit être explicite, les erreurs visibles et les tentatives contrôlées; le fournisseur n'est pas encore choisi. Ne jamais journaliser mots de passe, cookies ou secrets. Les liens de récupération/vérification doivent être limités dans le temps et ne pas permettre de redirection arbitraire.

## Entrées, API et abus

- Valider avec Zod tout paramètre externe; limiter longueur, nombre d'éléments et taille de corps.
- Appliquer des limites de débit aux flux de connexion, inscription, récupération, recherche et mutations d'administration.
- Normaliser les erreurs sans divulguer SQL, chemins internes, configuration ou existence d'un compte.
- Protéger les Route Handlers par autorisation serveur, méthodes autorisées et politique d'origine.
- Toute future intégration IA doit rester facultative, sans divulgation de données personnelles non autorisée, avec quotas et délais de réponse explicites.

Le mécanisme et les seuils de rate limiting, ainsi que l'observabilité de production, doivent être confirmés en fonction de l'hébergement retenu.

## Images et contenu

- Accepter uniquement formats, tailles et types de contenu autorisés; vérifier le contenu réel avant stockage.
- Le téléversement média accepte JPEG, PNG, WebP et AVIF, limité à 10 Mio; le serveur vérifie la signature binaire et les crédits obligatoires.
- Stocker les images dans le bucket privé Neon `assets`; utiliser des clés opaques, des URL signées de courte durée et des credentials exclusivement côté serveur.
- Réserver le téléversement aux rôles `editor` et `admin`, vérifier la session et l'origine de la requête.
- Récupérer `AWS_*` par l'environnement de la branche Neon; ne jamais journaliser, exposer au navigateur ou versionner ces credentials.
- Ne pas supprimer ni remplacer les buckets de production sans revue; les médias et leurs lignes de base se branchent avec Neon.
- Ne jamais accepter une URL arbitraire comme preuve d'un droit d'usage.
- Conserver licence, attribution, provenance et statut de validation; prévoir un retrait rapide.
- Empêcher toute publication éditoriale sans validation humaine et sans droits documentés.

## Données personnelles, logs et audit

Ne collecter que les données nécessaires. Ne pas enregistrer d'historique de recherche, prompts ou données personnelles brutes tant que consentement, finalité et durée de rétention n'ont pas été approuvés. Expurger les journaux; conserver les événements administratifs nécessaires à la traçabilité sans mots de passe, tokens ou données sensibles.

La durée de conservation exacte, les obligations de suppression/export et les exigences de résidence des données restent à confirmer avant production.

## Livraison et réponse aux incidents

Les dépendances sont verrouillées et mises à jour avec revue. La CI valide lint, types et tests. Les migrations sont relues et appliquées à un environnement non-production avant production. Les procédures de sauvegarde/restauration, gestion des incidents, rotation des secrets et réponse aux réclamations médias doivent être documentées avant lancement.
