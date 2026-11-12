# Périmètre du MVP

## Inclus

### Découverte et catalogue

- Accueil éditorial et exploration mobile-first des plats et recettes publiés.
- Filtres et recherche textuelle, avec pagination et états vides/erreur.
- Catalogue d'ingrédients avec recherche, autocomplétion, sélection multiple, synonymes et appellations locales.
- Recherche de recettes par ingrédients; les résultats distinguent ingrédients disponibles et manquants.
- Fiche plat pouvant exister sans recette; chaque recette appartient à un seul plat et un plat peut référencer plusieurs recettes.
- Recette avec portions, durées si connues, ingrédients, quantités, unités, notes, caractère facultatif et étapes ordonnées.

### Comptes et personnalisation

- Inscription et connexion par e-mail/mot de passe; vérification d'adresse, récupération du mot de passe et sessions sécurisées.
- Google OAuth prévu comme fournisseur extensible, mais activation ultérieure après configuration et approbation.
- Préférences, favoris et collections pour les plats, recettes et ingrédients.
- Historique de recherche minimisé et soumis à une politique de consentement et de rétention avant son activation.

### Édition et administration

- Rôles `user`, `editor`, `admin`, contrôlés côté serveur.
- Les éditeurs gèrent les plats, recettes, ingrédients et médias culinaires soumis à validation.
- Les administrateurs gèrent également les utilisateurs, les rôles et les paramètres.
- Workflow de contenu : brouillon, en attente de validation, validé, publié, archivé.
- Fusion des doublons d'ingrédients, archivage, attribution des contributions et audit des opérations sensibles.

### Recommandations

- Correspondance déterministe fondée sur les ingrédients et les contraintes disponibles.
- Explication des correspondances et des ingrédients manquants; aucun score ne doit être présenté comme une mesure de qualité culinaire.
- IA facultative, sans dépendance de fonctionnement ni publication automatique.

## Exclusions initiales

- Pages éditoriales individuelles pour chaque ingrédient (après le MVP).
- Publication automatique ou rédaction factuelle par IA.
- Prix, nutrition ou récits sans sources adaptées et validation.
- Données de lancement non vérifiées et contenus générés artificiellement pour remplir le catalogue.
- Microservices, API Node séparée ou activation de fournisseurs payants sans décision du propriétaire.
- Analytique nominative ou conservation d'historiques avant définition et approbation de la rétention.

## Gouvernance du contenu

Les sources doivent conserver titre, auteur ou organisme, URL/référence, date de consultation et faits concernés. Les sujets historiques, culturels ou régionaux sensibles nécessitent des sources recoupées; l'incertitude doit être signalée.

Pour chaque image, conserver le créateur, la provenance, la licence ou autorisation, les conditions d'utilisation et l'attribution requise. Distinguer photographie, illustration et image générée; prévoir un retrait en cas de réclamation.

Les recettes sont contrôlées avant publication pour leurs ingrédients, quantités, étapes et cohérence. Conserver l'identité du contributeur et du validateur ainsi que les dates et l'historique des modifications.

## Critères d'acceptation produit

- Le catalogue public reste consultable sans compte.
- La recherche d'ingrédients et la sélection multiple permettent de filtrer les recettes publiées.
- Une recette ne peut pas exister sans son plat parent; un plat peut exister sans recette.
- Les actions privées et d'administration respectent les rôles côté serveur.
- Les éléments sans provenance ou validation ne sont pas publiables.
- Les parcours essentiels sont utilisables sur mobile, au clavier, et exposent des états de chargement, d'erreur et de résultats vides.

Les détails de stockage, des API et des tests sont définis dans les documents d'architecture associés.
