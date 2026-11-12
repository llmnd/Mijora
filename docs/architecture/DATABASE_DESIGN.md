# Conception de la base de données

## Principes

- PostgreSQL managé sur Neon; Prisma ORM et Prisma Migrate.
- Modèle internationalisable dès le départ : pays, régions, localités, langues et appellations locales.
- Relations explicites avec clés étrangères; pas de référence polymorphe non contrainte.
- Slugs et relations de jointure uniques; index ciblés sur les filtres réellement utilisés.
- Sources et droits de médias traçables; pas de données de démonstration culinaires inventées.
- Suppressions et archivages explicites, notamment pour le contenu et l'audit.

## Modèle métier

### Géographie et catalogue

- `Country` est identifié par un code ISO unique.
- `Region` appartient à un pays; `Locality` appartient à une région.
- `Dish` représente un plat et peut exister sans recette publiée.
- `Recipe` appartient à exactement un `Dish`; un plat peut avoir plusieurs recettes.
- `DishRegion` associe explicitement les plats aux régions validées.
- `Category` et `DishCategory` permettent le classement sans coder une région comme une catégorie.

### Recettes et ingrédients

- `Ingredient` est une entité de catalogue administrable indépendamment, avec nom, slug, statut et description éventuelle.
- `IngredientAlias` relie des synonymes/appellations à un ingrédient avec leur locale, pour permettre la recherche multilingue et locale sans fabriquer de traductions.
- `MeasurementUnit` conserve les unités normalisées; la conversion automatique ne doit pas être supposée avant définition des règles.
- `RecipeIngredient` relie une recette à un ingrédient avec quantité décimale, unité, notes, caractère facultatif et ordre.
- `RecipeStep` conserve l'ordre des instructions.
- Les recettes portent un statut éditorial; une recette non publiée n'est pas visible dans le catalogue public.

### Identité et personnalisation

Better Auth possède le schéma `User`, `Session`, `Account` et `Verification`. Le profil utilisateur étend l'identité avec les champs et relations nécessaires, sans dupliquer les secrets d'authentification.

Les rôles initiaux sont `user`, `editor` et `admin`. Les préférences et restrictions sont relationnelles afin de pouvoir les modifier sans stocker des tableaux opaques.

Pour préserver les clés étrangères, les favoris et éléments de collection utilisent des relations typées distinctes vers `Dish`, `Recipe` et `Ingredient` (plutôt qu'un couple `targetType/targetId` sans contrainte). Les contraintes d'unicité empêchent les doublons par utilisateur et par cible.

### Sources, images et audit

Les sources sont rattachées explicitement aux contenus qu'elles documentent et conservent titre, auteur/organisme, URL ou référence, date de consultation, faits concernés et notes de validation. Les faits sensibles peuvent nécessiter plusieurs sources.

Chaque image conserve sa provenance, son créateur, sa licence ou autorisation, ses obligations d'attribution et ses conditions d'utilisation. Les octets sont stockés dans le bucket privé Neon Object Storage `assets`; PostgreSQL conserve seulement la clé d'objet et les métadonnées éditoriales. Une URL signée temporaire permet la lecture sans exposer de credential S3. L'URL ou la clé ne justifie pas à elle seule les droits de publication.

Les événements admin et éditoriaux conservent acteur, action, cible, date et métadonnées expurgées. L'audit est append-only côté application; aucune donnée sensible ou secret ne doit y être copié.

## Contraintes et index

- Unicité des codes pays, slugs par entité et alias normalisés par locale.
- Unicité des jointures `DishRegion`, `DishCategory` et `RecipeIngredient`.
- Unicité par utilisateur/cible pour chaque type de favori et d'élément de collection.
- Clés étrangères explicites et stratégie de suppression cohérente; préférer l'archivage pour les contenus publiés/audités.
- Index sur slugs, statuts, clés étrangères, noms/alias normalisés, relations de recherche et dates de tri.
- Index composites conçus à partir des requêtes d'exploration et de recherche réellement utilisées; vérifier avec des mesures plutôt que multiplier les index.

## Migrations et environnements

Les modifications de schéma passent par Prisma Migrate et une migration versionnée relue. Les environnements de développement, tests et production utilisent des bases ou branches Neon distinctes. Les secrets de connexion sont injectés par variables; aucune migration ne doit être appliquée à la production depuis un poste sans procédure et approbation.

Le schéma initial ne crée aucun contenu culinaire fictif. La politique de durée de conservation des historiques, événements de recommandation et données personnelles reste à définir avant d'enregistrer ces données.
