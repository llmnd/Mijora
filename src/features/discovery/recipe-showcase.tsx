"use client";

import { useMemo, useState } from "react";

export type ShowcaseRecipe = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  dishName: string;
  imageUrl: string | null;
  imageAlt: string;
  preparationTimeMinutes: number | null;
  cookingTimeMinutes: number | null;
  servings: number | null;
};

type RecipeShowcaseProps = {
  recipes: ShowcaseRecipe[];
};

const filters = [
  { id: "all", label: "Toutes", max: Number.POSITIVE_INFINITY },
  { id: "30", label: "Moins de 30 min", max: 30 },
  { id: "60", label: "Moins d’1 h", max: 60 },
  { id: "90", label: "Moins d’1 h 30", max: 90 },
] as const;

function totalTime(recipe: ShowcaseRecipe): number | null {
  if (
    recipe.preparationTimeMinutes === null &&
    recipe.cookingTimeMinutes === null
  ) {
    return null;
  }

  return (
    (recipe.preparationTimeMinutes ?? 0) +
    (recipe.cookingTimeMinutes ?? 0)
  );
}

export function RecipeShowcase({ recipes }: RecipeShowcaseProps) {
  const [filter, setFilter] =
    useState<(typeof filters)[number]["id"]>("all");
  const visibleRecipes = useMemo(() => {
    const maxTime =
      filters.find((option) => option.id === filter)?.max ??
      Number.POSITIVE_INFINITY;
    if (maxTime === Number.POSITIVE_INFINITY) {
      return recipes;
    }

    return recipes.filter((recipe) => {
      const duration = totalTime(recipe);
      return duration !== null && duration < maxTime;
    });
  }, [filter, recipes]);

  return (
    <div className="recipe-showcase">
      <div
        aria-label="Filtrer les recettes par durée"
        className="showcase-filters"
        role="group"
      >
        {filters.map((option) => (
          <button
            aria-pressed={filter === option.id}
            className="recipe-time-filter"
            key={option.id}
            onClick={() => setFilter(option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
        <p aria-live="polite" className="showcase-count">
          {visibleRecipes.length} recette
          {visibleRecipes.length === 1 ? "" : "s"}
        </p>
      </div>

      {visibleRecipes.length ? (
        <div className="public-recipe-grid">
          {visibleRecipes.map((recipe) => {
            const duration = totalTime(recipe);
            return (
              <article className="public-recipe-card" key={recipe.id}>
                <a
                  aria-label={`Voir la recette ${recipe.title}`}
                  className="recipe-card-media"
                  href={`/recettes/${recipe.slug}`}
                >
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
                  ) : (
                    <span aria-hidden="true" className="recipe-image-placeholder">
                      Visuel à venir
                    </span>
                  )}
                  {duration !== null ? (
                    <span className="recipe-time-badge">
                      {duration} min
                    </span>
                  ) : null}
                </a>
                <div className="public-recipe-copy">
                  <p className="public-recipe-dish">{recipe.dishName}</p>
                  <h3>
                    <a href={`/recettes/${recipe.slug}`}>{recipe.title}</a>
                  </h3>
                  {recipe.description ? <p>{recipe.description}</p> : null}
                  <ul aria-label="Informations sur la recette">
                    {recipe.preparationTimeMinutes !== null ? (
                      <li>
                        Préparation : {recipe.preparationTimeMinutes} min
                      </li>
                    ) : null}
                    {recipe.cookingTimeMinutes !== null ? (
                      <li>Cuisson : {recipe.cookingTimeMinutes} min</li>
                    ) : null}
                    {recipe.servings !== null ? (
                      <li>{recipe.servings} portions</li>
                    ) : null}
                  </ul>
                  <a
                    className="public-recipe-link"
                    href={`/recettes/${recipe.slug}`}
                  >
                    Voir la recette <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="catalogue-note">
          Aucune recette ne correspond à cette durée pour le moment.
        </p>
      )}
    </div>
  );
}
