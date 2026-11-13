import Link from "next/link";
import { connection } from "next/server";
import { ActionLink } from "@/components/ui/action-link";
import { Reveal } from "@/components/reveal";
import { SiteHeader } from "@/components/site-header";
import {
  DishCarousel,
  type CarouselDish,
} from "@/features/discovery/dish-carousel";
import { RecipeInspiration } from "@/features/discovery/recipe-inspiration";
import {
  RecipeShowcase,
  type ShowcaseRecipe,
} from "@/features/discovery/recipe-showcase";
import { PublicSearch } from "@/features/search/public-search";
import { createSignedImageUrl } from "@/lib/neon-object-storage";
import { prisma } from "@/server/db/client";

const flavorNames = [
  "Ceebu jën",
  "Yassa",
  "Mafé",
  "Dibi",
  "Thiakry",
  "Bissap",
  "Pastels",
  "Soupou kandia",
];

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
  const carouselDishes: CarouselDish[] = dishCards.map((dish) => ({
    id: dish.id,
    name: dish.name,
    description: dish.description,
    imageUrl: dish.imageUrl,
    imageAlt: dish.imageAlt,
    recipe: dish.recipes[0] ?? null,
  }));
  const showcaseRecipes: ShowcaseRecipe[] = recipeCards.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    slug: recipe.slug,
    description: recipe.description,
    dishName: recipe.dish.name,
    imageUrl: recipe.imageUrl,
    imageAlt: recipe.imageAlt,
    preparationTimeMinutes: recipe.preparationTimeMinutes,
    cookingTimeMinutes: recipe.cookingTimeMinutes,
    servings: recipe.servings,
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
    <main className="page-shell homepage" id="top">
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
          <p className="eyebrow hero-rise">Découverte culinaire · Sénégal</p>
          <h1 className="hero-rise" id="hero-title">
            Le goût des
            <br />
            <span>bonnes idées.</span>
          </h1>
          <p className="hero-copy hero-rise">
            Des plats qui racontent, des recettes pour se retrouver. Trouvez
            l’inspiration pour votre prochaine table.
          </p>
          <div className="hero-actions hero-rise">
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
        <a
          aria-label="Défiler vers les idées de recettes"
          className="hero-scroll-cue"
          href="#inspiration"
        >
          <span aria-hidden="true" />
        </a>
      </section>

      <section aria-label="Saveurs du Sénégal" className="flavor-marquee">
        <div className="flavor-marquee-track">
          {[0, 1].map((copy) => (
            <div
              aria-hidden={copy === 1}
              className="flavor-marquee-group"
              key={copy}
            >
              {flavorNames.map((name) => (
                <span key={`${copy}-${name}`}>
                  {name}
                  <i>✦</i>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <Reveal className="homepage-reveal">
        <RecipeInspiration recipes={recipeIdeas} dishes={dishIdeas} />
      </Reveal>

      <Reveal className="homepage-reveal">
        <PublicSearch />
      </Reveal>

      {carouselDishes.length ? (
        <Reveal className="homepage-reveal">
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
            <DishCarousel dishes={carouselDishes} />
          </section>
        </Reveal>
      ) : null}

      <Reveal className="homepage-reveal">
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

          {showcaseRecipes.length ? (
            <RecipeShowcase recipes={showcaseRecipes} />
          ) : (
            <p className="catalogue-note">
              Les premières recettes arrivent bientôt. Aucun contenu non
              vérifié n’est publié.
            </p>
          )}
        </section>
      </Reveal>

      <Reveal className="homepage-reveal">
        <section aria-labelledby="journey-title" className="journey">
          <div>
            <p className="eyebrow">De l’envie à l’assiette</p>
            <h2 id="journey-title">Une idée, quelques ingrédients, et c’est parti.</h2>
          </div>
          <ol className="journey-steps">
            <li>
              <span aria-hidden="true" className="journey-number">01</span>
              <h3>Explorer</h3>
              <p>Parcourez des plats et des recettes ancrés dans les cuisines d’ici.</p>
            </li>
            <li>
              <span aria-hidden="true" className="journey-number">02</span>
              <h3>Choisir</h3>
              <p>Indiquez vos ingrédients et votre temps pour trouver une piste.</p>
            </li>
            <li>
              <span aria-hidden="true" className="journey-number">03</span>
              <h3>Cuisiner</h3>
              <p>Suivez une recette, adaptez-la et partagez un bon moment.</p>
            </li>
          </ol>
        </section>
      </Reveal>

      <Reveal className="homepage-reveal">
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
      </Reveal>

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
          <a href="#top">Retour en haut ↑</a>
        </nav>
        <p className="footer-credit">Pensé au Sénégal · Fait pour être partagé</p>
      </footer>
    </main>
  );
}
