"use client";

import { useMemo, useState } from "react";
import { ArchiveContentButton } from "@/features/editorial/archive-content-button";
import { EditContentForm } from "@/features/editorial/edit-content-form";
import { PublishButton } from "@/features/editorial/publish-button";
import { ImageUploadForm } from "@/features/media/image-upload-form";

export type EditorialContentStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type EditorialCatalogItem = {
  id: string;
  contentType: "dish" | "recipe";
  dishId: string | null;
  title: string;
  subtitle: string;
  description: string | null;
  status: EditorialContentStatus;
  imageUrl: string | null;
  imageAlt: string | null;
  imageAttribution: string | null;
  imageProvenance: string | null;
  imageLicense: string | null;
  source: { title: string; url: string | null } | null;
  href: string | null;
};

type EditorialCatalogProps = {
  canPublish: boolean;
  items: EditorialCatalogItem[];
};

type ContentFilter = "all" | "dish" | "recipe";
type StatusFilter = "all" | EditorialContentStatus;

const statusLabels: Record<EditorialContentStatus, string> = {
  DRAFT: "Brouillon",
  PENDING_REVIEW: "À vérifier",
  APPROVED: "Approuvé",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
};

function isContentFilter(value: string): value is ContentFilter {
  return value === "all" || value === "dish" || value === "recipe";
}

function isStatusFilter(value: string): value is StatusFilter {
  return (
    value === "all" ||
    Object.keys(statusLabels).some((status) => status === value)
  );
}

function EditorialItemDetails({
  canPublish,
  compact = false,
  item,
}: {
  canPublish: boolean;
  compact?: boolean;
  item: EditorialCatalogItem;
}) {
  const Heading = compact ? "h4" : "h3";

  return (
    <div
      className={`editorial-dish-copy${compact ? " editorial-associated-recipe-copy" : ""}`}
    >
      <div className="editorial-card-meta">
        <span
          className={`editorial-status-badge editorial-status-${item.status.toLowerCase()}`}
        >
          {statusLabels[item.status]}
        </span>
        <span className="editorial-content-type">
          {item.contentType === "dish" ? "Plat" : "Recette"}
        </span>
      </div>
      <div className="editorial-card-action-bar">
        <details className="editorial-card-action">
          <summary>Modifier le contenu</summary>
          <EditContentForm
            contentId={item.id}
            contentType={item.contentType}
            description={item.description}
            title={item.title}
          />
        </details>
        <details className="editorial-card-action">
          <summary>{item.imageUrl ? "Modifier la photo" : "Ajouter une photo"}</summary>
          <ImageUploadForm
            ownerId={item.id}
            ownerType={item.contentType}
          />
        </details>
        {canPublish && item.status !== "ARCHIVED" ? (
          <PublishButton
            contentId={item.id}
            contentTitle={item.title}
            contentType={item.contentType}
            isPublished={item.status === "PUBLISHED"}
          />
        ) : null}
        <ArchiveContentButton
          contentId={item.id}
          contentTitle={item.title}
          contentType={item.contentType}
          isArchived={item.status === "ARCHIVED"}
        />
        {item.status === "PUBLISHED" &&
        item.contentType === "recipe" &&
        item.href ? (
          <a
            className="editorial-preview-link"
            href={item.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            Voir la recette
          </a>
        ) : null}
      </div>
      <Heading>{item.title}</Heading>
      {!compact ? (
        <p className="editorial-card-subtitle">{item.subtitle}</p>
      ) : null}
      {item.description ? <p>{item.description}</p> : null}
      {!compact && item.imageAttribution && item.imageProvenance ? (
        <a
          className="editorial-dish-credit"
          href={item.imageProvenance}
          rel="noopener noreferrer"
          target="_blank"
        >
          {item.imageAttribution}
          {item.imageLicense ? ` · ${item.imageLicense}` : ""}
        </a>
      ) : !compact && item.imageUrl ? (
        <p className="editorial-credit-note">Crédit de l’image non renseigné</p>
      ) : null}
      {item.source?.url ? (
        <a
          href={item.source.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          Source du contenu : {item.source.title}
        </a>
      ) : item.source ? (
        <p>Source du contenu : {item.source.title}</p>
      ) : null}
    </div>
  );
}

function EditorialCatalogCard({
  canPublish,
  item,
}: {
  canPublish: boolean;
  item: EditorialCatalogItem;
}) {
  return (
    <article className="editorial-dish-card">
      {item.imageUrl ? (
        // Signed Neon URLs are branch-scoped and must load directly in the browser.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={item.imageAlt ?? item.title}
          className="editorial-dish-image"
          height={420}
          src={item.imageUrl}
          width={640}
        />
      ) : (
        <div className="editorial-image-placeholder">Visuel à ajouter</div>
      )}
      <EditorialItemDetails canPublish={canPublish} item={item} />
    </article>
  );
}

function EditorialDishGroup({
  canPublish,
  dish,
  recipes,
}: {
  canPublish: boolean;
  dish: EditorialCatalogItem;
  recipes: EditorialCatalogItem[];
}) {
  return (
    <article className="editorial-dish-card" key={`dish:${dish.id}`}>
      {dish.imageUrl ? (
        // Signed Neon URLs are branch-scoped and must load directly in the browser.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={dish.imageAlt ?? dish.title}
          className="editorial-dish-image"
          height={420}
          src={dish.imageUrl}
          width={640}
        />
      ) : (
        <div className="editorial-image-placeholder">Visuel à ajouter</div>
      )}
      <EditorialItemDetails canPublish={canPublish} item={dish} />
      {recipes.length ? (
        <section
          aria-label={`Recettes associées à ${dish.title}`}
          className="editorial-associated-recipes"
        >
          <h4>Recettes associées</h4>
          {recipes.map((recipe) => (
            <article
              className="editorial-associated-recipe"
              key={`recipe:${recipe.id}`}
            >
              <EditorialItemDetails
                canPublish={canPublish}
                compact
                item={recipe}
              />
            </article>
          ))}
        </section>
      ) : null}
    </article>
  );
}

export function EditorialCatalog({
  canPublish,
  items,
}: EditorialCatalogProps) {
  const [query, setQuery] = useState("");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    return items.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        `${item.title} ${item.subtitle} ${item.description ?? ""}`
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery);
      const matchesContent =
        contentFilter === "all" || item.contentType === contentFilter;
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      return matchesQuery && matchesContent && matchesStatus;
    });
  }, [contentFilter, items, query, statusFilter]);
  const catalogGroups = useMemo(() => {
    const dishes = filteredItems.filter((item) => item.contentType === "dish");
    const recipes = filteredItems.filter((item) => item.contentType === "recipe");
    const dishIds = new Set(dishes.map((dish) => dish.id));
    const recipesByDishId = new Map<string, EditorialCatalogItem[]>();
    const ungroupedRecipes: EditorialCatalogItem[] = [];

    recipes.forEach((recipe) => {
      if (recipe.dishId && dishIds.has(recipe.dishId)) {
        const group = recipesByDishId.get(recipe.dishId) ?? [];
        group.push(recipe);
        recipesByDishId.set(recipe.dishId, group);
      } else {
        ungroupedRecipes.push(recipe);
      }
    });

    return {
      dishes: dishes.map((dish) => ({
        dish,
        recipes: recipesByDishId.get(dish.id) ?? [],
      })),
      ungroupedRecipes,
    };
  }, [filteredItems]);

  return (
    <div className="editorial-catalog">
      <div className="editorial-catalog-controls">
        <label className="editorial-filter-field">
          <span>Rechercher</span>
          <input
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Nom d’un plat ou d’une recette"
            type="search"
            value={query}
          />
        </label>
        <label className="editorial-filter-field">
          <span>Type</span>
          <select
            onChange={(event) => {
              const { value } = event.currentTarget;
              if (isContentFilter(value)) setContentFilter(value);
            }}
            value={contentFilter}
          >
            <option value="all">Plats et recettes</option>
            <option value="dish">Plats</option>
            <option value="recipe">Recettes</option>
          </select>
        </label>
        <label className="editorial-filter-field">
          <span>Statut</span>
          <select
            onChange={(event) => {
              const { value } = event.currentTarget;
              if (isStatusFilter(value)) setStatusFilter(value);
            }}
            value={statusFilter}
          >
            <option value="all">Tous les statuts</option>
            <option value="DRAFT">Brouillons</option>
            <option value="PENDING_REVIEW">À vérifier</option>
            <option value="APPROVED">Approuvés</option>
            <option value="PUBLISHED">Publiés</option>
            <option value="ARCHIVED">Archivés</option>
          </select>
        </label>
      </div>

      <p className="editorial-catalog-count" aria-live="polite">
        {filteredItems.length} contenu{filteredItems.length > 1 ? "s" : ""}{" "}
        affiché{filteredItems.length > 1 ? "s" : ""} sur {items.length}
      </p>

      {filteredItems.length ? (
        <div className="editorial-dish-grid">
          {catalogGroups.dishes.map(({ dish, recipes }) => (
            <EditorialDishGroup
              canPublish={canPublish}
              dish={dish}
              key={dish.id}
              recipes={recipes}
            />
          ))}
          {catalogGroups.ungroupedRecipes.map((recipe) => (
            <EditorialCatalogCard
              canPublish={canPublish}
              item={recipe}
              key={`recipe:${recipe.id}`}
            />
          ))}
        </div>
      ) : (
        <p className="editorial-empty">
          Aucun contenu ne correspond à ces filtres.
        </p>
      )}
    </div>
  );
}
