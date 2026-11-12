import { connection } from "next/server";
import { ActionLink } from "@/components/ui/action-link";
import { SiteHeader } from "@/components/site-header";
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
      take: 6,
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
        images: {
          where: { status: "PUBLISHED" },
          orderBy: [{ position: "asc" }, { createdAt: "desc" }],
          take: 1,
          select: { storageKey: true, altText: true },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
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

  return (
    <main className="page-shell">
      <SiteHeader />

      <section aria-labelledby="hero-title" className="hero">
        <p className="eyebrow">Découverte culinaire · Sénégal</p>
        <h1 aria-label="L’inspiration pour ce que l’on cuisine." id="hero-title">
          L’inspiration pour
          <br />
          <span>ce que l’on cuisine.</span>
        </h1>
        <p className="hero-copy">
          Mijora explore les plats, les recettes et les ingrédients avec soin,
          pour vous aider à trouver votre prochaine idée de repas.
        </p>
        <ActionLink href={discoveryLink.href}>
          {discoveryLink.label} <span aria-hidden="true">↘</span>
        </ActionLink>
      </section>

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
          <p className="eyebrow">Une autre façon de chercher</p>
          <h2 id="approach-title">De l’envie à l’idée.</h2>
        </div>
        <p className="approach-copy">
          Parcourez des recettes reliées à leur plat, inspirez-vous des
          ingrédients et des étapes, puis cuisinez à votre rythme. Chaque
          contenu est vérifié avant publication.
        </p>
      </section>

      <footer className="site-footer" id="projet">
        <span className="footer-brand">mijora.</span>
        <p>Une plateforme de découverte culinaire en construction.</p>
      </footer>
    </main>
  );
}
