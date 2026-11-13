import Link from "next/link";
import { connection } from "next/server";
import { ActionLink } from "@/components/ui/action-link";
import { Reveal, ThemeToggle } from "@/components/reveal";
import { SiteHeader } from "@/components/site-header";
import { DishCarousel } from "@/features/discovery/dish-carousel";
import { RecipeInspiration } from "@/features/discovery/recipe-inspiration";
import { RecipeShowcase } from "@/features/discovery/recipe-showcase";
import { PublicSearch } from "@/features/search/public-search";
import { createSignedImageUrl } from "@/lib/neon-object-storage";
import { prisma } from "@/server/db/client";

const HERO_IMAGE =
  "https://i.pinimg.com/736x/69/64/77/696477bc3b5b238a9529def5b1cfd11f.jpg";
const ATMOSPHERE_IMAGE =
  "https://i.pinimg.com/1200x/7f/c3/e9/7fc3e9fcf3ab983e3deeb40954be4ea4.jpg";

const THEME_SCRIPT = `try{var t=localStorage.getItem("mijora-theme");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}`;

const JOURNEY = [
  {
    n: "01",
    title: "Explorer",
    text: "Parcourez les plats du Sénégal et les histoires qui les accompagnent.",
  },
  {
    n: "02",
    title: "Choisir",
    text: "Filtrez par temps disponible ou par ingrédients que vous avez déjà.",
  },
  {
    n: "03",
    title: "Cuisiner",
    text: "Suivez une recette vérifiée, pas à pas, et partagez le repas.",
  },
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
      where: { status: "PUBLISHED", dish: { status: "PUBLISHED" } },
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
          imageUrl: image ? await createSignedImageUrl(image.storageKey) : null,
          imageAlt: image?.altText ?? dish.name,
        };
      }),
    ),
    Promise.all(
      recipes.map(async (recipe) => {
        const image = recipe.images[0];
        return {
          ...recipe,
          imageUrl: image ? await createSignedImageUrl(image.storageKey) : null,
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
  const heroImage = HERO_IMAGE;
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
  const showcaseRecipes = recipeCards.map((recipe) => ({
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
  const carouselDishes = dishCards.map((dish) => ({
    id: dish.id,
    name: dish.name,
    description: dish.description,
    imageUrl: dish.imageUrl,
    imageAlt: dish.imageAlt,
    recipe: dish.recipes[0] ?? null,
  }));

  return (
    <main className="page-shell homepage">
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <ThemeToggle />
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
            referrerPolicy="no-referrer"
            src={heroImage}
          />
        ) : null}
        <div className="hero-content">
          <p className="eyebrow hero-rise" style={{ animationDelay: "80ms" }}>
            Découverte culinaire · Sénégal
          </p>
          <h1 className="hero-rise" id="hero-title" style={{ animationDelay: "180ms" }}>
            Le goût des
            <br />
            <span>bonnes idées.</span>
          </h1>
          <p className="hero-copy hero-rise" style={{ animationDelay: "320ms" }}>
            Des plats qui racontent, des recettes pour se retrouver. Trouvez
            l’inspiration pour votre prochaine table.
          </p>
          <div className="hero-actions hero-rise" style={{ animationDelay: "460ms" }}>
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
            href={featuredRecipe ? `/recettes/${featuredRecipe.slug}` : "#plats"}
          >
            <span>À découvrir</span>
            <strong>{featuredTitle}</strong>
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
        <a aria-label="Descendre" className="hero-scroll-cue" href="#envie">
          <span />
        </a>
      </section>

      <div aria-hidden="true" className="flavor-marquee">
      </div>

      <div id="envie">
        <Reveal>
          <RecipeInspiration recipes={recipeIdeas} dishes={dishIdeas} />
        </Reveal>
      </div>

      <Reveal>
        <PublicSearch />
      </Reveal>

      {carouselDishes.length ? (
        <section
          aria-labelledby="dishes-title"
          className="public-recipes-section"
          id="plats"
        >
          <Reveal>
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
          </Reveal>
          <Reveal delay={120}>
            <DishCarousel dishes={carouselDishes} />
          </Reveal>
        </section>
      ) : null}

      <section
        aria-labelledby="recipes-title"
        className="public-recipes-section"
        id="recettes"
      >
        <Reveal>
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
        </Reveal>

        {recipeCards.length ? (
          <Reveal delay={100}>
            <RecipeShowcase recipes={showcaseRecipes} />
          </Reveal>
        ) : (
          <p className="catalogue-note">
            Les premières recettes arrivent bientôt. Aucun contenu non vérifié
            n’est publié.
          </p>
        )}
      </section>

      <section aria-labelledby="journey-title" className="journey">
        <Reveal>
          <p className="eyebrow">Comment ça marche</p>
          <h2 id="journey-title">De l’envie à l’assiette.</h2>
        </Reveal>
        <ol className="journey-steps">
          {JOURNEY.map((step, i) => (
            <li key={step.n}>
              <Reveal delay={i * 120}>
                <span className="journey-number">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <Reveal>
        <section
          aria-labelledby="approach-title"
          className="approach"
          id="approche"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            aria-hidden="true"
            className="approach-bg"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={ATMOSPHERE_IMAGE}
          />
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
          <a href="#">Retour en haut ↑</a>
        </nav>
        <p className="footer-credit">Pensé au Sénégal · Fait pour être partagé</p>
      </footer>
    </main>
  );
}