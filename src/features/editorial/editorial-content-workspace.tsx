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
    <>
      <section
        aria-labelledby="create-dish-title"
        className="editorial-media-section"
      >
        <h2 id="create-dish-title">Créer un plat</h2>
        <DishCreateForm onCreated={addDish} />
      </section>

      <section
        aria-labelledby="create-recipe-title"
        className="editorial-media-section"
      >
        <h2 id="create-recipe-title">Créer une recette</h2>
        {dishes.length === 0 ? (
          <p className="editorial-empty">
            Créez d’abord un plat pour pouvoir lui associer une recette.
          </p>
        ) : (
          <RecipeCreateForm dishes={dishes} onCreated={addRecipe} />
        )}
      </section>

      <section
        aria-labelledby="media-title"
        className="editorial-media-section"
      >
        <h2 id="media-title">Ajouter une image</h2>
        <EditorialMediaWorkspace targets={targets} />
      </section>
    </>
  );
}
