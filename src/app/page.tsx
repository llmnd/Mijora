import Link from "next/link";
import { connection } from "next/server";
import { ActionLink } from "@/components/ui/action-link";
import { SiteHeader } from "@/components/site-header";
import { RecipeInspiration } from "@/features/discovery/recipe-inspiration";
import { PublicSearch } from "@/features/search/public-search";
import { createSignedImageUrl } from "@/lib/neon-object-storage";
import { prisma } from "@/server/db/client";

export default async function HomePage() {
  await connection();

  const [dishes, recipes] = await Promise.all([
    prisma.dish.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        name: true,
        description: true,
        images: {
          where: { status: "PUBLISHED" },
          orderBy: [{ position: "asc" }, { createdAt: "desc" }],
          take: 1,
          select: { storageKey: true, altText: true },
        },
        recipes: {
          where: { status: "PUBLISHED" },
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: { title: true, slug: true },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
    prisma.recipe.findMany({
      where: {
        status: "PUBLISHED",
        dish: { status: "PUBLISHED" },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        preparationTimeMinutes: true,
        cookingTimeMinutes: true,
        servings: true,
        dish: { select: { name: true } },
        ingredients: {
          orderBy: { position: "asc" },
          select: {
            isOptional: true,
            ingredient: { select: { id: true, name: true } },
          },
        },
        images: {
          where: { status: "PUBLISHED" },
          orderBy: [{ position: "asc" }, { createdAt: "desc" }],
          take: 1,
          select: { storageKey: true, altText: true },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ]);

  const [dishCards, recipeCards] = await Promise.all([
    Promise.all(
      dishes.map(async (dish) => {
        const image = dish.images[0];
        return {
          ...dish,
          imageUrl: image
            ? await createSignedImageUrl(image.storageKey)
            : null,
          imageAlt: image?.altText ?? dish.name,
        };
      }),
    ),
    Promise.all(
      recipes.map(async (recipe) => {
        const image = recipe.images[0];
        return {
          ...recipe,
          imageUrl: image
            ? await createSignedImageUrl(image.storageKey)
            : null,
          imageAlt: image?.altText ?? recipe.title,
        };
      }),
    ),
  ]);
  const discoveryLink = dishCards.length
    ? { href: "#plats", label: "Découvrir les plats" }
    : recipeCards.length
      ? { href: "#recettes", label: "Découvrir les recettes" }
      : { href: "#approche", label: "Découvrir la démarche" };
  const featuredRecipe = recipeCards[0];
  const featuredDish = dishCards[0];
  const heroImage = featuredRecipe?.imageUrl ?? featuredDish?.imageUrl;
  const featuredTitle = featuredRecipe?.title ?? featuredDish?.name;
  const recipeIdeas = recipeCards.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    slug: recipe.slug,
    description: recipe.description,
    dishName: recipe.dish.name,
    imageUrl: recipe.imageUrl,
    imageAlt: recipe.imageAlt,
    preparationTimeMinutes: recipe.preparationTimeMinutes,
    cookingTimeMinutes: recipe.cookingTimeMinutes,
    ingredients: recipe.ingredients.map(({ ingredient, isOptional }) => ({
      id: ingredient.id,
      name: ingredient.name,
      isOptional,
    })),
  }));
  const dishIdeas = dishCards.map((dish) => ({
    id: dish.id,
    title: dish.name,
    slug: null,
    description: dish.description,
    dishName: dish.name,
    imageUrl: dish.imageUrl,
    imageAlt: dish.imageAlt,
    preparationTimeMinutes: null,
    cookingTimeMinutes: null,
    ingredients: [],
    isDishOnly: true,
  }));

  return (
    <main className="page-shell homepage">
      <SiteHeader />

      <section aria-labelledby="hero-title" className="hero">
        {heroImage ? (
          // Signed Neon URLs are branch-scoped and must load directly in the browser.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            aria-hidden="true"
            className="hero-image"
            fetchPriority="high"
            src={heroImage}
          />
        ) : null}
        <div className="hero-content">
          <p className="eyebrow">Découverte culinaire · Sénégal</p>
          <h1 id="hero-title">
            Le goût des
            <br />
            <span>bonnes idées.</span>
          </h1>
          <p className="hero-copy">
            Des plats qui racontent, des recettes pour se retrouver. Trouvez
            l’inspiration pour votre prochaine table.
          </p>
          <div className="hero-actions">
            <ActionLink href={discoveryLink.href}>
              Découvrir le catalogue <span aria-hidden="true">↗</span>
            </ActionLink>
            <a className="hero-text-link" href="#recherche">
              Trouver une idée <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
        {featuredTitle ? (
          <a
            className="hero-feature"
            href={
              featuredRecipe ? `/recettes/${featuredRecipe.slug}` : "#plats"
            }
          >
            <span>À découvrir</span>
            <strong>{featuredTitle}</strong>
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </section>

      <RecipeInspiration recipes={recipeIdeas} dishes={dishIdeas} />

      <PublicSearch />

      {dishCards.length ? (
        <section
          aria-labelledby="dishes-title"
          className="public-recipes-section"
          id="plats"
        >
          <div className="public-recipes-heading">
            <div>
              <p className="eyebrow">Découvrir</p>
              <h2 id="dishes-title">Les plats à découvrir.</h2>
            </div>
            <p>
              Explorez les plats sénégalais et leurs histoires, puis retrouvez
              les recettes disponibles pour les cuisiner.
            </p>
          </div>
          <div className="public-recipe-grid">
            {dishCards.map((dish) => {
              const recipe = dish.recipes[0];
              return (
                <article className="public-recipe-card" key={dish.id}>
                  {dish.imageUrl ? (
                    // Signed Neon URLs are branch-scoped and must load directly in the browser.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={dish.imageAlt}
                      className="public-recipe-image"
                      height={480}
                      loading="lazy"
                      src={dish.imageUrl}
                      width={720}
                    />
                  ) : null}
                  <div className="public-recipe-copy">
                    <p className="public-recipe-dish">Plat à découvrir</p>
                    <h3>{dish.name}</h3>
                    {dish.description ? <p>{dish.description}</p> : null}
                    {recipe ? (
                      <a
                        className="public-recipe-link"
                        href={`/recettes/${recipe.slug}`}
                      >
                        Cuisiner : {recipe.title}{" "}
                        <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <p className="public-dish-recipe-note">
                        La recette détaillée arrive bientôt.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section
        aria-labelledby="recipes-title"
        className="public-recipes-section"
        id="recettes"
      >
        <div className="public-recipes-heading">
          <div>
            <p className="eyebrow">À cuisiner</p>
            <h2 id="recipes-title">Des idées pour votre table.</h2>
          </div>
          <p>
            Des recettes partagées pour découvrir les cuisines du Sénégal et
            trouver l’inspiration.
          </p>
        </div>

        {recipeCards.length ? (
          <div className="public-recipe-grid">
            {recipeCards.map((recipe) => (
              <article className="public-recipe-card" key={recipe.id}>
                {recipe.imageUrl ? (
                  // Signed Neon URLs are branch-scoped and must load directly in the browser.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={recipe.imageAlt}
                    className="public-recipe-image"
                    height={480}
                    loading="lazy"
                    src={recipe.imageUrl}
                    width={720}
                  />
                ) : null}
                <div className="public-recipe-copy">
                  <p className="public-recipe-dish">{recipe.dish.name}</p>
                  <h3>
                    <a href={`/recettes/${recipe.slug}`}>{recipe.title}</a>
                  </h3>
                  {recipe.description ? <p>{recipe.description}</p> : null}
                  <ul aria-label="Informations sur la recette">
                    {recipe.preparationTimeMinutes ? (
                      <li>Préparation : {recipe.preparationTimeMinutes} min</li>
                    ) : null}
                    {recipe.cookingTimeMinutes ? (
                      <li>Cuisson : {recipe.cookingTimeMinutes} min</li>
                    ) : null}
                    {recipe.servings ? <li>{recipe.servings} portions</li> : null}
                  </ul>
                  <a
                    className="public-recipe-link"
                    href={`/recettes/${recipe.slug}`}
                  >
                    Voir la recette <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="catalogue-note">
            Les premières recettes arrivent bientôt. Aucun contenu non vérifié
            n’est publié.
          </p>
        )}
      </section>

      <section
        aria-labelledby="approach-title"
        className="approach"
        id="approche"
      >
        <div className="approach-heading">
          <p className="eyebrow">Notre intention</p>
          <h2 id="approach-title">La cuisine nous rapproche.</h2>
        </div>
        <p className="approach-copy">
          Mijora célèbre les cuisines du Sénégal et celles qui viendront
          ensuite. Des histoires, des plats et des recettes soigneusement
          vérifiés, pour transmettre le goût de cuisiner et de partager.
        </p>
      </section>

      <footer className="site-footer" id="projet">
        <div className="footer-identity">
          <Link aria-label="Mijora, accueil" className="footer-brand" href="/">
            mijora.
          </Link>
          <p>Les cuisines d’ici, les idées à partager.</p>
        </div>
        <nav aria-label="Navigation de pied de page" className="footer-links">
          <a href="#plats">Les plats</a>
          <a href="#recettes">Les recettes</a>
          <a href="#approche">Notre intention</a>
        </nav>
        <p className="footer-credit">Pensé au Sénégal · Fait pour être partagé</p>
      </footer>
    </main>
  );
}
