"use client";

import { useRef } from "react";

export type CarouselDish = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string;
  recipe: { title: string; slug: string } | null;
};

type DishCarouselProps = {
  dishes: CarouselDish[];
};

export function DishCarousel({ dishes }: DishCarouselProps) {
  const track = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: -1 | 1) {
    const element = track.current;
    element?.scrollBy({
      left: direction * (element.clientWidth * 0.8),
      behavior: "smooth",
    });
  }

  return (
    <div className="dish-carousel">
      {dishes.length > 1 ? (
        <div className="dish-carousel-controls">
          <button
            aria-label="Plats précédents"
            onClick={() => scrollByCard(-1)}
            type="button"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            aria-label="Plats suivants"
            onClick={() => scrollByCard(1)}
            type="button"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
      <div
        aria-label="Plats publiés"
        className="dish-carousel-track"
        ref={track}
        role="region"
        tabIndex={0}
      >
        {dishes.map((dish, index) => (
          <article className="dish-tile" key={dish.id}>
            <div className="dish-tile-media">
              {dish.imageUrl ? (
                // Signed Neon URLs are branch-scoped and must load directly in the browser.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={dish.imageAlt}
                  height={640}
                  loading="lazy"
                  src={dish.imageUrl}
                  width={480}
                />
              ) : (
                <span className="dish-tile-placeholder">À découvrir</span>
              )}
              <span aria-hidden="true" className="dish-tile-index">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="dish-tile-copy">
              <h3>{dish.name}</h3>
              {dish.description ? <p>{dish.description}</p> : null}
              {dish.recipe ? (
                <a
                  className="public-recipe-link"
                  href={`/recettes/${dish.recipe.slug}`}
                >
                  Cuisiner ce plat <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <span className="public-dish-recipe-note">
                  Recette bientôt disponible
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
