"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  publicSearchErrorSchema,
  publicSearchQuerySchema,
  publicSearchResponseSchema,
  type PublicSearchResponse,
} from "@/features/search/contracts";

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; results: PublicSearchResponse["data"] };

function getErrorMessage(value: unknown): string | undefined {
  const parsed = publicSearchErrorSchema.safeParse(value);
  return parsed.success ? parsed.data.error.message : undefined;
}

export function PublicSearch() {
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>({
    status: "idle",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQuery = publicSearchQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      setSearchState({
        status: "error",
        message:
          query.trim().length < 2
            ? "Saisissez au moins 2 caractères pour lancer la recherche."
            : "La recherche ne peut pas dépasser 80 caractères.",
      });
      return;
    }

    setSearchState({ status: "loading" });

    try {
      const response = await fetch(
        `/api/v1/search?q=${encodeURIComponent(parsedQuery.data)}`,
        { headers: { accept: "application/json" } },
      );
      const result: unknown = await response.json();

      if (!response.ok) {
        setSearchState({
          status: "error",
          message:
            getErrorMessage(result) ??
            "La recherche n’a pas pu aboutir. Réessayez.",
        });
        return;
      }

      const parsedResponse = publicSearchResponseSchema.safeParse(result);
      if (!parsedResponse.success) {
        setSearchState({
          status: "error",
          message: "La réponse reçue est inattendue. Réessayez plus tard.",
        });
        return;
      }

      setSearchState({
        status: "success",
        results: parsedResponse.data.data,
      });
    } catch {
      setSearchState({
        status: "error",
        message: "Impossible de joindre le serveur. Vérifiez votre connexion.",
      });
    }
  }

  const hasResults =
    searchState.status === "success" &&
    (searchState.results.dishes.length > 0 ||
      searchState.results.recipes.length > 0);

  return (
    <section
      aria-busy={searchState.status === "loading"}
      aria-labelledby="public-search-title"
      className="public-search-section"
      id="recherche"
    >
      <div className="public-search-heading">
        <div>
          <p className="eyebrow">À vous de choisir</p>
          <h2 id="public-search-title">Une idée en tête&nbsp;?</h2>
        </div>
        <p>
          Recherchez un plat ou une recette pour trouver l’inspiration et
          passer en cuisine.
        </p>
      </div>

      <form className="public-search-form" onSubmit={handleSubmit}>
        <label className="public-search-field" htmlFor="public-search-query">
          Rechercher un plat ou une recette
        </label>
        <div className="public-search-controls">
          <input
            autoComplete="off"
            id="public-search-query"
            maxLength={80}
            minLength={2}
            name="q"
            onChange={(event) => setQuery(event.target.value)}
            required
            type="search"
            value={query}
          />
          <button
            className="public-search-submit"
            disabled={searchState.status === "loading"}
            type="submit"
          >
            {searchState.status === "loading" ? "Recherche…" : "Rechercher"}
          </button>
        </div>
      </form>

      {searchState.status === "loading" ? (
        <p aria-live="polite" className="public-search-message" role="status">
          Recherche en cours…
        </p>
      ) : null}
      {searchState.status === "error" ? (
        <p aria-live="assertive" className="public-search-message search-error" role="alert">
          {searchState.message}
        </p>
      ) : null}
      {searchState.status === "success" && !hasResults ? (
        <p aria-live="polite" className="public-search-message" role="status">
          Aucun plat ni recette ne correspond à votre recherche.
        </p>
      ) : null}

      {searchState.status === "success" && hasResults ? (
        <div aria-live="polite" className="public-search-results">
          <h3>Résultats de recherche</h3>
          {searchState.results.dishes.length ? (
            <section aria-labelledby="search-dishes-title">
              <h4 id="search-dishes-title">Plats</h4>
              <div className="public-search-grid">
                {searchState.results.dishes.map((dish) => (
                  <article className="public-search-card" key={dish.id}>
                    {dish.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={dish.imageAlt} src={dish.imageUrl} />
                    ) : null}
                    <div className="public-search-card-copy">
                      <h5>{dish.name}</h5>
                      {dish.description ? <p>{dish.description}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {searchState.results.recipes.length ? (
            <section aria-labelledby="search-recipes-title">
              <h4 id="search-recipes-title">Recettes</h4>
              <div className="public-search-grid">
                {searchState.results.recipes.map((recipe) => (
                  <article className="public-search-card" key={recipe.id}>
                    {recipe.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={recipe.imageAlt} src={recipe.imageUrl} />
                    ) : null}
                    <div className="public-search-card-copy">
                      <p className="public-search-dish">{recipe.dishName}</p>
                      <h5>
                        <Link href={`/recettes/${recipe.slug}`}>
                          {recipe.title}
                        </Link>
                      </h5>
                      {recipe.description ? <p>{recipe.description}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
