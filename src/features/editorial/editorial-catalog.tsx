"use client";

import { useMemo, useState } from "react";
import { PublishButton } from "@/features/editorial/publish-button";

export type EditorialContentStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export type EditorialCatalogItem = {
  id: string;
  contentType: "dish" | "recipe";
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
          {filteredItems.map((item) => (
            <article
              className="editorial-dish-card"
              key={`${item.contentType}:${item.id}`}
            >
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
                <div className="editorial-image-placeholder">
                  Visuel à ajouter
                </div>
              )}
              <div className="editorial-dish-copy">
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
                <h3>{item.title}</h3>
                <p className="editorial-card-subtitle">{item.subtitle}</p>
                {item.description ? <p>{item.description}</p> : null}
                {item.imageAttribution && item.imageProvenance ? (
                  <a
                    className="editorial-dish-credit"
                    href={item.imageProvenance}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {item.imageAttribution}
                    {item.imageLicense ? ` · ${item.imageLicense}` : ""}
                  </a>
                ) : item.imageUrl ? (
                  <p className="editorial-credit-note">
                    Crédit de l’image non renseigné
                  </p>
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
                <div className="editorial-card-actions">
                  {canPublish && item.status !== "ARCHIVED" ? (
                    <PublishButton
                      contentId={item.id}
                      contentTitle={item.title}
                      contentType={item.contentType}
                      isPublished={item.status === "PUBLISHED"}
                    />
                  ) : item.status === "PUBLISHED" && item.href ? (
                    <a
                      className="editorial-preview-link"
                      href={item.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Voir la recette
                    </a>
                  ) : canPublish ? (
                    <span className="editorial-publish-note">Archivé</span>
                  ) : (
                    <span className="editorial-publish-note">
                      En attente d’un administrateur
                    </span>
                  )}
                  {item.status === "PUBLISHED" &&
                  item.contentType === "recipe" &&
                  canPublish ? (
                    <a
                      className="editorial-preview-link"
                      href={item.href ?? undefined}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Prévisualiser
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
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
