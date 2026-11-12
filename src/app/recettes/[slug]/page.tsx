import { connection } from "next/server";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createSignedImageUrl } from "@/lib/neon-object-storage";
import { prisma } from "@/server/db/client";

type RecipePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function RecipePage({ params }: RecipePageProps) {
  const { slug } = await params;
  await connection();

  const recipe = await prisma.recipe.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
      dish: { status: "PUBLISHED" },
    },
    select: {
      title: true,
      description: true,
      servings: true,
      preparationTimeMinutes: true,
      cookingTimeMinutes: true,
      dish: { select: { name: true } },
      ingredients: {
        orderBy: { position: "asc" },
        select: {
          notes: true,
          isOptional: true,
          ingredient: { select: { name: true } },
        },
      },
      steps: {
        orderBy: { position: "asc" },
        select: { instruction: true },
      },
      sources: {
        select: {
          fact: true,
          source: { select: { title: true, url: true } },
        },
      },
      images: {
        where: { status: "PUBLISHED" },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          storageKey: true,
          altText: true,
          attribution: true,
          provenance: true,
          license: true,
        },
      },
    },
  });

  if (!recipe) {
    notFound();
  }

  const image = recipe.images[0];
  const imageUrl = image ? await createSignedImageUrl(image.storageKey) : null;

  return (
    <main className="page-shell recipe-page">
      <SiteHeader />
      <article>
        <header className="recipe-header">
          <p className="eyebrow">{recipe.dish.name} · Recette Mijora</p>
          <h1>{recipe.title}</h1>
          {recipe.description ? (
            <p className="recipe-description">{recipe.description}</p>
          ) : null}
          <ul aria-label="Informations sur la recette" className="recipe-meta">
            {recipe.servings ? <li>{recipe.servings} portions</li> : null}
            {recipe.preparationTimeMinutes ? (
              <li>Préparation : {recipe.preparationTimeMinutes} min</li>
            ) : null}
            {recipe.cookingTimeMinutes ? (
              <li>Cuisson : {recipe.cookingTimeMinutes} min</li>
            ) : null}
          </ul>
        </header>

        {imageUrl && image ? (
          <figure className="recipe-hero-image">
            {/* Signed Neon URLs are branch-scoped and must load directly in the browser. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={image.altText ?? recipe.title}
              height={720}
              src={imageUrl}
              width={1080}
            />
            {image.attribution && image.provenance ? (
              <figcaption>
                <a
                  href={image.provenance}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {image.attribution} · {image.license}
                </a>
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <div className="recipe-content">
          <section aria-labelledby="ingredients-title">
            <h2 id="ingredients-title">Ingrédients</h2>
            <ul className="recipe-ingredients">
              {recipe.ingredients.map((item, index) => (
                <li key={`${item.ingredient.name}-${index}`}>
                  <span>{item.ingredient.name}</span>
                  {item.notes ? <span>{item.notes}</span> : null}
                  {item.isOptional ? <span>facultatif</span> : null}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="steps-title">
            <h2 id="steps-title">Préparation</h2>
            <ol className="recipe-steps">
              {recipe.steps.map((step, index) => (
                <li key={`${index}-${step.instruction}`}>
                  <span>{step.instruction}</span>
                </li>
              ))}
            </ol>
          </section>

          {recipe.sources.length ? (
            <section aria-labelledby="sources-title" className="recipe-sources">
              <h2 id="sources-title">Sources et références</h2>
              <ul>
                {recipe.sources.map(({ fact, source }) => (
                  <li key={`${source.title}-${source.url}`}>
                    {source.url ? (
                      <a
                        href={source.url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {source.title}
                      </a>
                    ) : (
                      source.title
                    )}
                    {fact ? <p>{fact}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </main>
  );
}
