import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import {
  EditorialContentWorkspace,
} from "@/features/editorial/editorial-content-workspace";
import {
  EditorialCatalog,
  type EditorialCatalogItem,
} from "@/features/editorial/editorial-catalog";
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

  const [
    dishes,
    ingredients,
    recipes,
    recentDishes,
    recentRecipes,
    draftDishCount,
    draftRecipeCount,
    publishedDishCount,
    publishedRecipeCount,
  ] = await Promise.all([
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
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        dish: { select: { id: true, name: true, status: true } },
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
    prisma.dish.count({ where: { status: "DRAFT" } }),
    prisma.recipe.count({ where: { status: "DRAFT" } }),
    prisma.dish.count({ where: { status: "PUBLISHED" } }),
    prisma.recipe.count({ where: { status: "PUBLISHED" } }),
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
  const catalogItems: EditorialCatalogItem[] = [
    ...dishPreviews.map((dish) => {
      const image = dish.images[0];
      const source = dish.sources[0]?.source;
      return {
        id: dish.id,
        contentType: "dish" as const,
        dishId: null,
        title: dish.name,
        subtitle: "Plat sénégalais",
        description: dish.description,
        status: dish.status,
        imageUrl: dish.imageUrl,
        imageAlt: image?.altText ?? null,
        imageAttribution: image?.attribution ?? null,
        imageProvenance: image?.provenance ?? null,
        imageLicense: image?.license ?? null,
        source: source ?? null,
        href: null,
      };
    }),
    ...recipePreviews.map((recipe) => {
      const image = recipe.images[0];
      const source = recipe.sources[0]?.source;
      return {
        id: recipe.id,
        contentType: "recipe" as const,
        dishId: recipe.dish.id,
        title: recipe.title,
        subtitle: `Plat · ${recipe.dish.name}`,
        description: recipe.description,
        status: recipe.status,
        imageUrl: recipe.imageUrl,
        imageAlt: image?.altText ?? null,
        imageAttribution: image?.attribution ?? null,
        imageProvenance: image?.provenance ?? null,
        imageLicense: image?.license ?? null,
        source: source ?? null,
        href:
          recipe.status === "PUBLISHED" ? `/recettes/${recipe.slug}` : null,
      };
    }),
  ];

  return (
    <main className="page-shell editorial-page">
      <SiteHeader />
      <section aria-labelledby="editorial-title" className="editorial-intro">
        <p className="eyebrow">Administration · Mijora</p>
        <h1 id="editorial-title">Votre catalogue, en toute simplicité.</h1>
        <p>
          Retrouvez vos contenus, recherchez par nom ou statut, puis publiez ou
          retirez-les de l’accueil. Les formulaires restent fermés jusqu’à ce
          que vous en ayez besoin.
        </p>
        <div className="editorial-overview" aria-label="Résumé du catalogue">
          <div className="editorial-overview-card">
            <span>Brouillons</span>
            <strong>{draftDishCount + draftRecipeCount}</strong>
            <small>plats et recettes à compléter</small>
          </div>
          <div className="editorial-overview-card">
            <span>En ligne</span>
            <strong>{publishedDishCount + publishedRecipeCount}</strong>
            <small>plats et recettes publiés</small>
          </div>
          <div className="editorial-overview-card">
            <span>À gérer</span>
            <strong>{catalogItems.length}</strong>
            <small>contenus récents affichés</small>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="catalog-title"
        className="editorial-catalog-section"
      >
        <div className="editorial-section-heading">
          <p className="eyebrow">Catalogue</p>
          <h2 id="catalog-title">Gérer les contenus</h2>
          <p>Les actions de publication sont réservées aux administrateurs.</p>
        </div>
        <EditorialCatalog canPublish={canPublish} items={catalogItems} />
      </section>

      <EditorialContentWorkspace
        initialDishes={dishes.map(({ id, name }) => ({ id, label: name }))}
        initialTargets={targets}
      />
    </main>
  );
}
