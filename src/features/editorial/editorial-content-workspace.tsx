"use client";

import { useState } from "react";
import { DishCreateForm } from "@/features/editorial/dish-create-form";
import { RecipeCreateForm } from "@/features/editorial/recipe-create-form";
import {
  EditorialMediaWorkspace,
  type EditorialMediaTarget,
} from "@/features/media/editorial-media-workspace";

type DishOption = {
  id: string;
  label: string;
};

type EditorialContentWorkspaceProps = {
  initialTargets: EditorialMediaTarget[];
  initialDishes: DishOption[];
};

export function EditorialContentWorkspace({
  initialTargets,
  initialDishes,
}: EditorialContentWorkspaceProps) {
  const [targets, setTargets] = useState(initialTargets);
  const [dishes, setDishes] = useState(initialDishes);

  function addDish(dish: { id: string; name: string }) {
    setTargets((current) => [
      { id: dish.id, label: dish.name, ownerType: "dish" },
      ...current,
    ]);
    setDishes((current) => [
      { id: dish.id, label: dish.name },
      ...current,
    ]);
  }

  function addRecipe(recipe: {
    id: string;
    title: string;
    slug: string;
  }) {
    setTargets((current) => [
      { id: recipe.id, label: recipe.title, ownerType: "recipe" },
      ...current,
    ]);
  }

  return (
    <section aria-labelledby="editorial-tools-title" className="editorial-tools">
      <div className="editorial-section-heading">
        <p className="eyebrow">Actions rapides</p>
        <h2 id="editorial-tools-title">Faire évoluer le catalogue</h2>
        <p>Ouvrez uniquement l’action dont vous avez besoin.</p>
      </div>
      <div className="editorial-tool-grid">
        <details className="editorial-tool-panel">
          <summary>
            <span className="editorial-tool-title">Créer un plat</span>
            <span className="editorial-tool-description">
              Ajouter un nouveau plat au catalogue
            </span>
          </summary>
          <div className="editorial-tool-content">
            <DishCreateForm onCreated={addDish} />
          </div>
        </details>

        <details className="editorial-tool-panel">
          <summary>
            <span className="editorial-tool-title">Créer une recette</span>
            <span className="editorial-tool-description">
              Associer une recette à un plat existant
            </span>
          </summary>
          <div className="editorial-tool-content">
            {dishes.length === 0 ? (
              <p className="editorial-empty">
                Créez d’abord un plat pour pouvoir lui associer une recette.
              </p>
            ) : (
              <RecipeCreateForm dishes={dishes} onCreated={addRecipe} />
            )}
          </div>
        </details>

        <details className="editorial-tool-panel">
          <summary>
            <span className="editorial-tool-title">Ajouter une image</span>
            <span className="editorial-tool-description">
              Choisir un contenu et téléverser son visuel
            </span>
          </summary>
          <div className="editorial-tool-content">
            <EditorialMediaWorkspace targets={targets} />
          </div>
        </details>
      </div>
    </section>
  );
}
