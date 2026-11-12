# Contrats API

## Conventions

- Backend intégré aux Route Handlers Next.js; préfixe métier versionné `/api/v1`.
- JSON UTF-8 et validation Zod des paramètres, query strings et corps de requête.
- Erreurs homogènes : `{ "error": { "code": "...", "message": "...", "requestId": "...", "fields": {} } }`.
- Codes HTTP cohérents (2xx succès, 400 entrée invalide, 401 non authentifié, 403 interdit, 404 absent, 409 conflit, 429 limité, 5xx erreur non exposée).
- Pagination par curseur pour les listes; filtres combinables et tri autorisé par la ressource.
- Les données non publiées et informations privées ne sont jamais accessibles par une route publique.
- Le contrat est stabilisé avant le développement parallèle de l'interface et des services.

Les formes exactes de chaque schéma seront dérivées des types métier validés. Ce document fixe les responsabilités et conventions, pas des exemples de données culinaires.

## Ressources prévues

| Ressource | Routes initiales | Accès |
| --- | --- | --- |
| Authentification | `/api/v1/auth/*` (Better Auth) | Public pour les flux de compte; limites anti-abus à appliquer. |
| Plats | `GET /api/v1/dishes`, `GET /api/v1/dishes/:slug` | Lecture publique des éléments publiés. |
| Recettes | `GET /api/v1/recipes`, `GET /api/v1/recipes/:slug` | Lecture publique des éléments publiés. |
| Ingrédients | `GET /api/v1/ingredients`, `GET /api/v1/ingredients/:slug` | Lecture publique des ingrédients publiés. |
| Régions et pays | `GET /api/v1/countries`, `GET /api/v1/regions`, `GET /api/v1/regions/:slug/dishes` | Lecture publique du référentiel vérifié. |
| Recherche | `GET /api/v1/search` | Lecture publique; query bornée et validée. |
| Correspondance | `POST /api/v1/recommendations` | Entrée structurée, réponse explicable et déterministe. |
| Favoris | `/api/v1/favorites` | Utilisateur authentifié; cibles typées plat/recette/ingrédient. |
| Collections | `/api/v1/collections` | Utilisateur authentifié; accès limité au propriétaire. |
| Profil/préférences | `/api/v1/users/me` | Utilisateur authentifié, données personnelles minimisées. |
| Administration | `/api/v1/admin/*` | `editor` ou `admin` selon l'opération; mutations auditées. |
| Création éditoriale | `POST /api/v1/editorial/dishes` | Session `editor` ou `admin`; plat créé en brouillon avec une source obligatoire. |
| Recettes éditoriales | `POST /api/v1/editorial/recipes` | Session `editor` ou `admin`; recette, ingrédients, étapes et source créés en brouillon dans une transaction. |
| Publication éditoriale | `POST /api/v1/editorial/publish` | Session `admin`; publie un plat ou une recette prête, publie ses images non archivées et écrit un audit. |
| Médias éditoriaux | `POST /api/v1/media` | Session `editor` ou `admin`; image liée à un plat, une recette ou un ingrédient existant. |
| Recherche publique | `GET /api/v1/search?q=...` | Public; recherche bornée sur les plats et recettes publiés uniquement. |

Les routes de création, modification, validation, publication, fusion et archivage sont privées. L'édition de contenu relève de `editor`; la gestion des comptes, rôles et paramètres est réservée à `admin`.

### Création et publication d'une recette

`POST /api/v1/editorial/recipes` reçoit un JSON avec le plat associé, le titre, la description originale, les portions, les durées optionnelles, les ingrédients et quantités en texte, les étapes, ainsi que le titre, l'URL HTTPS et le fait vérifié de la source. Une session disposant de `editorial:create` est requise. La recette, les références aux ingrédients, les étapes et la source sont créées dans une transaction au statut `DRAFT`.

`POST /api/v1/editorial/publish` reçoit `{ "contentType": "dish" | "recipe", "contentId": "..." }`. La route exige `editorial:publish`, valide que le contenu est prêt, met à jour son statut et `publishedAt`, publie ses images non archivées et ajoute une entrée d'audit dans la même transaction. Une recette ne peut pas être publiée tant que son plat n'est pas publié, ou si elle ne possède pas de source, d'ingrédient et d'étape. Les recettes publiées et leur détail sont accessibles publiquement sur l'accueil et `/recettes/:slug`; les brouillons restent privés.

### Recherche publique du catalogue

`GET /api/v1/search?q=...` accepte une requête textuelle de 2 à 80 caractères après suppression des espaces de bord. La recherche insensible à la casse porte sur les noms/titres et descriptions des plats et recettes publiés. Les recettes associées à un plat non publié ne sont jamais renvoyées. La réponse contient jusqu'à six résultats par type; les images publiées sont servies par URL signée temporaire. Une requête absente ou invalide retourne `400` avec `{ "error": { "code": "...", "message": "..." } }`.

### Téléversement média

`POST /api/v1/media` reçoit un formulaire `multipart/form-data` avec `file`, `ownerType`, `ownerId`, `kind`, `creator`, `provenance`, `license` et les champs optionnels `attribution`, `usageTerms`, `altText`. Les types acceptés sont JPEG, PNG, WebP et AVIF, avec une limite de 10 Mio par fichier. Le serveur vérifie la signature réelle du fichier, la session, l'origine et l'existence de la cible. Le contenu est enregistré dans le bucket Neon privé `assets`; la ligne d'image reste au statut `DRAFT`.

La réponse `201` contient l'identifiant de l'image, sa clé d'objet et une URL de lecture signée valable 15 minutes. Les credentials de stockage et les clés d'objet ne sont jamais acceptés du client comme données d'autorisation.

### Création d'un plat

`POST /api/v1/editorial/dishes` reçoit un JSON avec le nom, une description rédigée originalement, le titre et l'URL HTTPS d'une source, ainsi qu'un fait vérifié dans cette source. La route exige une session disposant de `editorial:create`; le plat et sa référence bibliographique sont créés dans une transaction. Le statut initial est `DRAFT`, et un nom déjà utilisé entraîne `409`.

## Recherche et recommandations

La recherche d'ingrédients accepte une sélection multiple d'identifiants ou de termes normalisés. Les recettes renvoyées sont publiées et incluent les ingrédients présents et manquants afin que la correspondance soit compréhensible.

`POST /api/v1/recommendations` peut recevoir les ingrédients disponibles ainsi que les filtres validés par le MVP (temps, portions, régime ou localité). Chaque filtre est optionnel. Ne jamais fabriquer prix, nutrition ou disponibilité. Les suggestions contiennent une raison de correspondance et les ingrédients concernés; le classement initial est déterministe.

## Authentification et autorisation

Better Auth expose ses flux sous `/api/v1/auth/*`. Les routes privées utilisent la session serveur et vérifient la permission avant de lire ou modifier la ressource. Un identifiant de rôle fourni par le client n'est jamais une preuve d'autorisation.

Les erreurs ne doivent pas révéler si une adresse e-mail existe. Les mutations admin/éditoriales incluent l'identité de l'acteur dans l'audit; les tokens et mots de passe n'y figurent jamais.

## Contrats de sortie et évolution

Les réponses publiques ne comprennent que les champs approuvés et publiés. Les listes fournissent un curseur opaque `nextCursor` (nullable) et une indication de continuation. Les tris sont limités à des champs autorisés.

Une évolution incompatible nécessite un nouveau préfixe de version. Les champs optionnels peuvent être ajoutés de manière additive après mise à jour des types, tests et documentation. Les schémas Zod et la documentation publique doivent rester alignés.
