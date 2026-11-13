"use client";

import { useMemo, useState } from "react";
import { ImageUploadForm } from "@/features/media/image-upload-form";
import type { MediaOwnerType } from "@/features/media/types";

export type EditorialMediaTarget = {
  id: string;
  label: string;
  ownerType: MediaOwnerType;
};

type EditorialMediaWorkspaceProps = {
  targets: EditorialMediaTarget[];
};

type Filter = "all" | MediaOwnerType;

const ownerTypeLabels: Record<MediaOwnerType, string> = {
  dish: "Plat",
  ingredient: "Ingrédient",
  recipe: "Recette",
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "dish", label: "Plats" },
  { id: "recipe", label: "Recettes" },
  { id: "ingredient", label: "Ingrédients" },
];

const keyOf = (target: EditorialMediaTarget) =>
  `${target.ownerType}:${target.id}`;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function EditorialMediaWorkspace({
  targets,
}: EditorialMediaWorkspaceProps) {
  const [selectedKey, setSelectedKey] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: targets.length,
      dish: 0,
      ingredient: 0,
      recipe: 0,
    };
    for (const target of targets) result[target.ownerType] += 1;
    return result;
  }, [targets]);

  const visibleTargets = useMemo(() => {
    const q = normalize(query);
    return targets.filter(
      (target) =>
        (filter === "all" || target.ownerType === filter) &&
        (!q || normalize(target.label).includes(q)),
    );
  }, [targets, filter, query]);

  const selectedTarget = targets.find((target) => keyOf(target) === selectedKey);

  if (!targets.length) {
    return (
      <div className="editorial-workspace">
        <p className="editorial-empty">
          Créez d’abord un plat, un ingrédient ou une recette pour y associer
          une image.
        </p>
      </div>
    );
  }

  return (
    <div className="editorial-workspace media-workspace">
      <section aria-labelledby="media-step-1" className="media-step">
        <header className="media-step-header">
          <span aria-hidden="true" className="media-step-number">
            1
          </span>
          <h3 id="media-step-1">Choisir le contenu</h3>
        </header>

        {selectedTarget ? (
          <div className="media-selected">
            <div>
              <span className="media-type-badge" data-type={selectedTarget.ownerType}>
                {ownerTypeLabels[selectedTarget.ownerType]}
              </span>
              <strong>{selectedTarget.label}</strong>
            </div>
            <button
              className="media-link-button"
              onClick={() => setSelectedKey("")}
              type="button"
            >
              Changer
            </button>
          </div>
        ) : (
          <>
            <div
              aria-label="Filtrer par type de contenu"
              className="media-filters"
              role="group"
            >
              {FILTERS.map((item) => (
                <button
                  aria-pressed={filter === item.id}
                  className="media-chip"
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  type="button"
                >
                  {item.label}
                  <span>{counts[item.id]}</span>
                </button>
              ))}
            </div>

            <label className="media-search">
              <span className="visually-hidden-label">Rechercher un contenu</span>
              <input
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Rechercher par nom…"
                type="search"
                value={query}
              />
            </label>

            <p aria-live="polite" className="media-count">
              {visibleTargets.length} contenu
              {visibleTargets.length > 1 ? "s" : ""}
            </p>

            {visibleTargets.length ? (
              <ul className="media-target-list">
                {visibleTargets.map((target) => (
                  <li key={keyOf(target)}>
                    <button
                      className="media-target"
                      onClick={() => setSelectedKey(keyOf(target))}
                      type="button"
                    >
                      <span className="media-type-badge" data-type={target.ownerType}>
                        {ownerTypeLabels[target.ownerType]}
                      </span>
                      <span className="media-target-label">{target.label}</span>
                      <span aria-hidden="true" className="media-target-arrow">
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="editorial-empty">
                Aucun contenu ne correspond à cette recherche.
              </p>
            )}
          </>
        )}
      </section>

      <section
        aria-labelledby="media-step-2"
        className="media-step"
        data-disabled={selectedTarget ? undefined : "true"}
      >
        <header className="media-step-header">
          <span aria-hidden="true" className="media-step-number">
            2
          </span>
          <h3 id="media-step-2">Ajouter l’image</h3>
        </header>
        {selectedTarget ? (
          <ImageUploadForm
            key={selectedKey}
            ownerId={selectedTarget.id}
            ownerType={selectedTarget.ownerType}
          />
        ) : (
          <p className="media-hint">
            Sélectionnez d’abord un plat, un ingrédient ou une recette.
          </p>
        )}
      </section>
    </div>
  );
}