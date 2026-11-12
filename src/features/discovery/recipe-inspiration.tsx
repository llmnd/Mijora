"use client";

import Link from "next/link";
import { useState } from "react";

export type RecipeIdea = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  dishName: string;
  imageUrl: string | null;
  imageAlt: string;
  preparationTimeMinutes: number | null;
  cookingTimeMinutes: number | null;
  ingredients: RecipeIngredientIdea[];
  isDishOnly?: boolean;
};

export type RecipeIngredientIdea = {
  id: string;
  name: string;
  isOptional: boolean;
};

type TimeFilter = "all" | "quick" | "medium" | "long";

type RecipeInspirationProps = {
  recipes: RecipeIdea[];
  dishes?: RecipeIdea[];
};

function getTotalTime(recipe: RecipeIdea): number | null {
  if (
    recipe.preparationTimeMinutes === null ||
    recipe.cookingTimeMinutes === null
  ) {
    return null;
  }

  return recipe.preparationTimeMinutes + recipe.cookingTimeMinutes;
}

function matchesTimeFilter(recipe: RecipeIdea, filter: TimeFilter): boolean {
  if (filter === "all") {
    return true;
  }

  const totalTime = getTotalTime(recipe);
  if (totalTime === null) {
    return false;
  }

  if (filter === "quick") {
    return totalTime <= 30;
  }
  if (filter === "medium") {
    return totalTime > 30 && totalTime <= 60;
  }
  return totalTime > 60;
}

function getClosestTimeCandidates(
  recipes: RecipeIdea[],
  filter: TimeFilter,
): RecipeIdea[] {
  const timedRecipes = recipes
    .map((recipe) => ({ recipe, totalTime: getTotalTime(recipe) }))
    .filter(
      (item): item is { recipe: RecipeIdea; totalTime: number } =>
        item.totalTime !== null,
    );

  if (timedRecipes.length === 0) {
    return recipes;
  }

  if (filter === "quick") {
    return timedRecipes
      .sort((left, right) => left.totalTime - right.totalTime)
      .map(({ recipe }) => recipe);
  }

  if (filter === "medium") {
    return timedRecipes
      .sort(
        (left, right) =>
          Math.abs(left.totalTime - 45) - Math.abs(right.totalTime - 45),
      )
      .map(({ recipe }) => recipe);
  }

  const longRecipes = timedRecipes.filter(({ totalTime }) => totalTime > 60);
  const closestRecipes =
    longRecipes.length > 0
      ? longRecipes.sort((left, right) => left.totalTime - right.totalTime)
      : timedRecipes.sort((left, right) => right.totalTime - left.totalTime);
  return closestRecipes.map(({ recipe }) => recipe);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

function parseIngredients(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,;\n]+|\s+et\s+/iu)
        .map((ingredient) => ingredient.trim())
        .filter((ingredient) => normalizeText(ingredient).length >= 2),
    ),
  );
}

function ingredientMatches(query: string, ingredientName: string): boolean {
  const normalizedQuery = normalizeText(query);
  const normalizedName = normalizeText(ingredientName);
  return (
    normalizedName.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedName)
  );
}

function containsMention(text: string, query: string): boolean {
  return normalizeText(text).includes(normalizeText(query));
}

const timeFilters: { id: TimeFilter; label: string }[] = [
  { id: "all", label: "Peu importe" },
  { id: "quick", label: "30 min max" },
  { id: "medium", label: "Jusqu’à 1 h" },
  { id: "long", label: "J’ai le temps" },
];

export function RecipeInspiration({
  recipes,
  dishes = [],
}: RecipeInspirationProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [ingredientInput, setIngredientInput] = useState("");
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>(
    [],
  );
  const [suggestion, setSuggestion] = useState<RecipeIdea | null>(null);
  const [suggestionIsFallback, setSuggestionIsFallback] = useState(false);
  const [suggestionOutsideTime, setSuggestionOutsideTime] = useState(false);
  const ideas = recipes.length > 0 ? recipes : dishes;
  const timeCandidates = ideas.filter((recipe) =>
    matchesTimeFilter(recipe, timeFilter),
  );
  const recommendationCandidates =
    timeCandidates.length > 0
      ? timeCandidates
      : getClosestTimeCandidates(ideas, timeFilter);
  const availableIngredients = Array.from(
    new Map(
      ideas
        .flatMap((recipe) => recipe.ingredients)
        .map((ingredient) => [ingredient.id, ingredient]),
    ).values(),
  ).sort((left, right) => left.name.localeCompare(right.name, "fr"));
  const selectedIngredients = availableIngredients.filter((ingredient) =>
    selectedIngredientIds.includes(ingredient.id),
  );
  const requestedIngredients = Array.from(
    new Map(
      [...parseIngredients(ingredientInput), ...selectedIngredients.map(({ name }) => name)]
        .map((ingredient) => [normalizeText(ingredient), ingredient]),
    ).values(),
  );
  const hasIngredientQuery = requestedIngredients.length > 0;
  const matchedRecipes = recommendationCandidates
    .map((recipe) => {
      const matchedIngredients =
        recipe.ingredients.length > 0
          ? recipe.ingredients.filter((ingredient) =>
              requestedIngredients.some((query) =>
                ingredientMatches(query, ingredient.name),
              ),
            )
          : [];
      const mentionedIngredients =
        recipe.ingredients.length > 0
          ? []
          : requestedIngredients.filter((query) =>
              containsMention(
                `${recipe.title} ${recipe.dishName} ${recipe.description ?? ""}`,
                query,
              ),
            );

      return {
        recipe,
        matchedIngredients,
        mentionedIngredients,
        score: new Set([
          ...matchedIngredients.flatMap((ingredient) =>
            requestedIngredients
              .filter((query) => ingredientMatches(query, ingredient.name))
              .map(normalizeText),
          ),
          ...mentionedIngredients.map(normalizeText),
        ]).size,
      };
    })
    .filter(
      ({ score }) => requestedIngredients.length === 0 || score > 0,
    );
  const highestMatchScore = Math.max(
    0,
    ...matchedRecipes.map(({ score }) => score),
  );
  const bestCandidates =
    !hasIngredientQuery
      ? recommendationCandidates
      : matchedRecipes
          .filter(({ score }) => score === highestMatchScore)
          .map(({ recipe }) => recipe);
  const suggestionCandidates =
    hasIngredientQuery && matchedRecipes.length === 0
      ? recommendationCandidates
      : bestCandidates;
  const filteredIngredients = availableIngredients.filter((ingredient) =>
    ingredient.name
      .toLocaleLowerCase("fr")
      .includes(ingredientInput.trim().toLocaleLowerCase("fr")),
  );
  const suggestionMatch = suggestion
    ? matchedRecipes.find(({ recipe }) => recipe.id === suggestion.id)
    : undefined;
  const missingIngredients = suggestionMatch
    ? suggestionMatch.recipe.ingredients.filter(
        (ingredient) =>
          !ingredient.isOptional &&
          !suggestionMatch.matchedIngredients.some(
            (matched) => matched.id === ingredient.id,
          ),
      )
    : [];

  function chooseSuggestion() {
    const alternatives = suggestionCandidates.filter(
      (recipe) => recipe.id !== suggestion?.id,
    );
    const choices =
      alternatives.length > 0 ? alternatives : suggestionCandidates;
    const selected = choices[0] ?? null;
    setSuggestion(selected);
    setSuggestionIsFallback(
      selected !== null &&
        hasIngredientQuery &&
        matchedRecipes.length === 0,
    );
    setSuggestionOutsideTime(
      selected !== null &&
        timeCandidates.length === 0 &&
        getTotalTime(selected) !== null,
    );
  }

  function updateIngredients(value: string) {
    setIngredientInput(value);
    setSuggestion(null);
    setSuggestionIsFallback(false);
    setSuggestionOutsideTime(false);
  }

  function selectTimeFilter(filter: TimeFilter) {
    setTimeFilter(filter);
    setSuggestion(null);
    setSuggestionIsFallback(false);
    setSuggestionOutsideTime(false);
  }

  function toggleIngredient(ingredientId: string) {
    setSelectedIngredientIds((selected) =>
      selected.includes(ingredientId)
        ? selected.filter((id) => id !== ingredientId)
        : [...selected, ingredientId],
    );
    setSuggestion(null);
    setSuggestionIsFallback(false);
    setSuggestionOutsideTime(false);
  }

  function selectRecipeIngredients(recipe: RecipeIdea) {
    setIngredientInput("");
    setSelectedIngredientIds(
      recipe.ingredients
        .filter((ingredient) => !ingredient.isOptional)
        .map((ingredient) => ingredient.id),
    );
    setSuggestion(null);
    setSuggestionIsFallback(false);
    setSuggestionOutsideTime(false);
  }

  const suggestionMatchedIngredients =
    suggestionMatch?.matchedIngredients ?? [];
  const suggestionLabel = suggestionIsFallback
    ? "Une idée du catalogue à vérifier"
    : suggestionOutsideTime
      ? "Une recette hors de votre temps habituel"
      : "Votre idée du moment";

  return (
    <section
      aria-labelledby="inspiration-title"
      className="recipe-inspiration"
      id="inspiration"
    >
      <div className="recipe-inspiration-intro">
        <p className="eyebrow">On vous donne une idée</p>
        <h2 id="inspiration-title">Vous ne savez pas quoi cuisiner&nbsp;?</h2>
        <p>
          Dites-nous ce qu’il y a dans votre cuisine et combien de temps vous
          avez. On cherche parmi les recettes publiées.
        </p>
      </div>

      <div className="recipe-inspiration-controls">
        <div className="recipe-pantry-input">
          <label htmlFor="recipe-pantry-ingredients">
            Quels ingrédients avez-vous&nbsp;?
          </label>
          <input
            autoComplete="off"
            id="recipe-pantry-ingredients"
            list="recipe-pantry-suggestions"
            onChange={(event) => updateIngredients(event.target.value)}
            placeholder="Ex. poulet, oignons, citron"
            type="text"
            value={ingredientInput}
          />
          {availableIngredients.length > 0 ? (
            <datalist id="recipe-pantry-suggestions">
              {filteredIngredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.name} />
              ))}
            </datalist>
          ) : null}
          <p>Écrivez plusieurs ingrédients, séparés par des virgules.</p>
        </div>

        {availableIngredients.length > 0 ? (
          <details className="recipe-ingredient-picker">
            <summary>
              Choisir dans le catalogue
              {selectedIngredientIds.length > 0
                ? ` (${selectedIngredientIds.length} sélectionné${selectedIngredientIds.length > 1 ? "s" : ""})`
                : ""}
            </summary>
            <div className="recipe-ingredient-picker-content">
              <div
                aria-label="Ingrédients disponibles"
                className="recipe-ingredient-options"
                role="group"
              >
                {availableIngredients.map((ingredient) => (
                  <button
                    aria-pressed={selectedIngredientIds.includes(
                      ingredient.id,
                    )}
                    className="recipe-time-filter"
                    key={ingredient.id}
                    onClick={() => toggleIngredient(ingredient.id)}
                    type="button"
                  >
                    {ingredient.name}
                  </button>
                ))}
              </div>
              {selectedIngredientIds.length > 0 ? (
                <button
                  className="recipe-ingredient-clear"
                  onClick={() => {
                    setSelectedIngredientIds([]);
                    setSuggestion(null);
                    setSuggestionIsFallback(false);
                    setSuggestionOutsideTime(false);
                  }}
                  type="button"
                >
                  Effacer la sélection du catalogue
                </button>
              ) : null}
            </div>
          </details>
        ) : null}

        <div
          aria-label="Temps disponible"
          className="recipe-time-filters"
          role="group"
        >
          {timeFilters.map((filter) => (
            <button
              aria-pressed={timeFilter === filter.id}
              className="recipe-time-filter"
              key={filter.id}
              onClick={() => selectTimeFilter(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button
          className="recipe-suggest-button"
          disabled={recommendationCandidates.length === 0}
          onClick={chooseSuggestion}
          type="button"
        >
          {hasIngredientQuery && matchedRecipes.length === 0
            ? "Proposer une idée à vérifier"
            : recipes.length === 0 && dishes.length > 0
              ? "Trouver une idée"
              : "Trouver une recette"}
          <span aria-hidden="true">↗</span>
        </button>
      </div>

      <div aria-live="polite" className="recipe-suggestion" role="status">
        {suggestion ? (
          <article className="recipe-suggestion-card">
            {suggestion.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={suggestion.imageAlt} src={suggestion.imageUrl} />
            ) : null}
            <div className="recipe-suggestion-copy">
              <p className="recipe-suggestion-label">
                {suggestion.isDishOnly ? "Plat à découvrir" : suggestionLabel}
              </p>
              <p className="recipe-suggestion-dish">{suggestion.dishName}</p>
              <h3>{suggestion.title}</h3>
              {suggestion.description ? (
                <p className="recipe-suggestion-description">
                  {suggestion.description}
                </p>
              ) : null}
              {suggestion.isDishOnly ? (
                <p className="recipe-suggestion-disclaimer">
                  La recette détaillée de ce plat n’est pas encore disponible.
                </p>
              ) : null}
              {suggestionOutsideTime ? (
                <p className="recipe-suggestion-disclaimer">
                  Aucune recette ne correspond exactement à ce temps. Voici
                  une autre recette publiée à explorer.
                </p>
              ) : null}
              {getTotalTime(suggestion) !== null ? (
                <p className="recipe-suggestion-time">
                  Environ {getTotalTime(suggestion)} min
                </p>
              ) : null}
              {suggestionIsFallback ? (
                <p className="recipe-suggestion-disclaimer">
                  Les ingrédients saisis ne figurent pas dans les détails des
                  recettes disponibles. Vérifiez la liste avant de cuisiner.
                </p>
              ) : null}
              {suggestionMatch &&
              suggestionMatch.matchedIngredients.length > 0 ? (
                <>
                  <p className="recipe-suggestion-time">
                    Contient{" "}
                    {suggestionMatchedIngredients
                      .map((ingredient) => ingredient.name)
                      .join(", ")}
                    .
                  </p>
                  {missingIngredients.length > 0 ? (
                    <p className="recipe-suggestion-description">
                      Autres ingrédients requis :{" "}
                      {missingIngredients
                        .map((ingredient) => ingredient.name)
                        .join(", ")}
                      .
                    </p>
                  ) : null}
                </>
              ) : null}
              {suggestionMatch &&
              suggestionMatch.mentionedIngredients.length > 0 ? (
                <p className="recipe-suggestion-disclaimer">
                  {suggestionMatch.mentionedIngredients.join(", ")} apparaît
                  dans le titre ou la description. Vérifiez les ingrédients
                  avant de cuisiner.
                </p>
              ) : null}
              {suggestion.slug ? (
                <Link
                  className="public-recipe-link"
                  href={`/recettes/${suggestion.slug}`}
                >
                  Voir la recette <span aria-hidden="true">↗</span>
                </Link>
              ) : (
                <a className="public-recipe-link" href="#plats">
                  Découvrir ce plat <span aria-hidden="true">↗</span>
                </a>
              )}
              {suggestion.ingredients.length > 0 ? (
                <button
                  className="recipe-ingredient-reset"
                  onClick={() => selectRecipeIngredients(suggestion)}
                  type="button"
                >
                  J’ai les ingrédients de cette recette
                </button>
              ) : null}
            </div>
          </article>
        ) : ideas.length === 0 ? (
          <p className="recipe-inspiration-message">
            Aucun plat ni recette n’est publié pour le moment.
          </p>
        ) : hasIngredientQuery && matchedRecipes.length === 0 ? (
          <p className="recipe-inspiration-message">
            Je ne trouve pas de correspondance vérifiable avec ces ingrédients.
            Vous pouvez découvrir une recette publiée
            {timeCandidates.length === 0
              ? " proche du temps choisi"
              : ""}
            , puis vérifier sa liste.
          </p>
        ) : timeCandidates.length === 0 ? (
          <p className="recipe-inspiration-message">
            Aucune recette ne correspond exactement à ce temps. On vous
            proposera une autre recette publiée à explorer.
          </p>
        ) : (
          <p className="recipe-inspiration-message">
            {bestCandidates.length}{" "}
            {bestCandidates.length === 1
              ? "recette correspondante"
              : "recettes correspondantes"}
            {hasIngredientQuery
              ? " parmi les ingrédients indiqués."
              : " dans le catalogue."}
          </p>
        )}
      </div>
    </section>
  );
}
