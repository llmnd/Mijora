import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import {
  EditorialContentWorkspace,
} from "@/features/editorial/editorial-content-workspace";
import { PublishButton } from "@/features/editorial/publish-button";
import type { EditorialMediaTarget } from "@/features/media/editorial-media-workspace";
import type { MediaOwnerType } from "@/features/media/types";
import { createSignedImageUrl } from "@/lib/neon-object-storage";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import { hasPermission } from "@/server/policies/permissions";

export default async function EditorialPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/connexion");
  }
  if (!hasPermission(session.user.role, "editorial:edit")) {
    redirect("/");
  }

  const [dishes, ingredients, recipes, recentDishes, recentRecipes] = await Promise.all([
    prisma.dish.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.ingredient.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.recipe.findMany({
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.dish.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        sources: {
          take: 1,
          select: { source: { select: { title: true, url: true } } },
        },
        images: {
          orderBy: [{ position: "asc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            storageKey: true,
            altText: true,
            license: true,
            attribution: true,
            provenance: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.recipe.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        dish: { select: { name: true, status: true } },
        sources: {
          take: 1,
          select: { source: { select: { title: true, url: true } } },
        },
        images: {
          orderBy: [{ position: "asc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            storageKey: true,
            altText: true,
            license: true,
            attribution: true,
            provenance: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const targets: EditorialMediaTarget[] = [
    ...dishes.map(({ id, name }) => ({
      id,
      label: name,
      ownerType: "dish" as const satisfies MediaOwnerType,
    })),
    ...ingredients.map(({ id, name }) => ({
      id,
      label: name,
      ownerType: "ingredient" as const satisfies MediaOwnerType,
    })),
    ...recipes.map(({ id, title }) => ({
      id,
      label: title,
      ownerType: "recipe" as const satisfies MediaOwnerType,
    })),
  ];

  const dishPreviews = await Promise.all(
    recentDishes.map(async (dish) => {
      const image = dish.images[0];
      return {
        ...dish,
        imageUrl: image
          ? await createSignedImageUrl(image.storageKey)
          : null,
      };
    }),
  );
  const recipePreviews = await Promise.all(
    recentRecipes.map(async (recipe) => {
      const image = recipe.images[0];
      return {
        ...recipe,
        imageUrl: image
          ? await createSignedImageUrl(image.storageKey)
          : null,
      };
    }),
  );
  const canPublish = hasPermission(session.user.role, "editorial:publish");

  return (
    <main className="page-shell editorial-page">
      <SiteHeader />
      <section aria-labelledby="editorial-title" className="editorial-intro">
        <p className="eyebrow">Contribution · Mijora</p>
        <h1 id="editorial-title">Espace éditorial</h1>
        <p>
          Créez des plats et des recettes, ajoutez des visuels correctement
          crédités, puis publiez les contenus vérifiés sur l’accueil.
        </p>
      </section>

      <section
        aria-labelledby="catalog-title"
        className="editorial-media-section"
      >
        <h2 id="catalog-title">Contenus récents</h2>
        {dishPreviews.length || recipePreviews.length ? (
          <div className="editorial-dish-grid">
            {dishPreviews.map((dish) => {
              const image = dish.images[0];
              const source = dish.sources[0]?.source;

              return (
                <article className="editorial-dish-card" key={dish.id}>
                  {image && dish.imageUrl ? (
                    // Signed Neon URLs are branch-scoped and must load directly in the browser.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={image.altText ?? dish.name}
                      className="editorial-dish-image"
                      height={420}
                      src={dish.imageUrl}
                      width={640}
                    />
                  ) : null}
                  <div className="editorial-dish-copy">
                    <p className="editorial-dish-status">
                      {dish.status === "DRAFT" ? "Brouillon" : dish.status}
                    </p>
                    <h3>{dish.name}</h3>
                    {dish.description ? <p>{dish.description}</p> : null}
                    {image?.attribution && image.provenance ? (
                      <a
                        className="editorial-dish-credit"
                        href={image.provenance}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {image.attribution} · {image.license}
                      </a>
                    ) : null}
                    {source?.url ? (
                      <a
                        href={source.url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Source : {source.title}
                      </a>
                    ) : null}
                    {dish.status === "PUBLISHED" ? (
                      <p className="editorial-published-status">
                        Plat publié · prêt pour les recettes publiques
                      </p>
                    ) : canPublish ? (
                      <PublishButton contentId={dish.id} contentType="dish" />
                    ) : (
                      <p className="editorial-publish-note">
                        En attente de publication par un administrateur.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
            {recipePreviews.map((recipe) => {
              const image = recipe.images[0];
              const source = recipe.sources[0]?.source;

              return (
                <article className="editorial-dish-card" key={recipe.id}>
                  {image && recipe.imageUrl ? (
                    // Signed Neon URLs are branch-scoped and must load directly in the browser.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={image.altText ?? recipe.title}
                      className="editorial-dish-image"
                      height={420}
                      src={recipe.imageUrl}
                      width={640}
                    />
                  ) : null}
                  <div className="editorial-dish-copy">
                    <p className="editorial-dish-status">
                      {recipe.status === "DRAFT" ? "Brouillon" : recipe.status}
                    </p>
                    <h3>{recipe.title}</h3>
                    <p>Plat : {recipe.dish.name}</p>
                    {recipe.description ? <p>{recipe.description}</p> : null}
                    {image?.attribution && image.provenance ? (
                      <a
                        className="editorial-dish-credit"
                        href={image.provenance}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {image.attribution} · {image.license}
                      </a>
                    ) : null}
                    {source?.url ? (
                      <a
                        href={source.url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Source : {source.title}
                      </a>
                    ) : null}
                    {recipe.status === "PUBLISHED" ? (
                      <a href={`/recettes/${recipe.slug}`}>
                        Voir la recette publiée
                      </a>
                    ) : canPublish ? (
                      <PublishButton contentId={recipe.id} contentType="recipe" />
                    ) : (
                      <p className="editorial-publish-note">
                        En attente de publication par un administrateur.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="editorial-empty">
            Aucun plat enregistré pour le moment.
          </p>
        )}
      </section>

      <EditorialContentWorkspace
        initialDishes={dishes.map(({ id, name }) => ({ id, label: name }))}
        initialTargets={targets}
      />
    </main>
  );
}
