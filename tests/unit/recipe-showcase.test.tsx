import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  RecipeShowcase,
  type ShowcaseRecipe,
} from "@/features/discovery/recipe-showcase";

const recipes: ShowcaseRecipe[] = [
  {
    id: "quick",
    title: "Yassa rapide",
    slug: "yassa-rapide",
    description: "Un repas rapide.",
    dishName: "Yassa",
    imageUrl: null,
    imageAlt: "Yassa",
    preparationTimeMinutes: 10,
    cookingTimeMinutes: 19,
    servings: 2,
  },
  {
    id: "boundary",
    title: "Mafé en une heure",
    slug: "mafe-une-heure",
    description: null,
    dishName: "Mafé",
    imageUrl: null,
    imageAlt: "Mafé",
    preparationTimeMinutes: 15,
    cookingTimeMinutes: 45,
    servings: 4,
  },
  {
    id: "unknown",
    title: "Thiakry",
    slug: "thiakry",
    description: null,
    dishName: "Thiakry",
    imageUrl: null,
    imageAlt: "Thiakry",
    preparationTimeMinutes: null,
    cookingTimeMinutes: null,
    servings: null,
  },
];

describe("recipe showcase", () => {
  it("filters by strict time limits and keeps unknown durations in the full list", async () => {
    const user = userEvent.setup();
    render(<RecipeShowcase recipes={recipes} />);

    expect(screen.getByRole("heading", { name: "Thiakry" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Moins de 30 min" }));

    expect(
      screen.getByRole("heading", { name: "Yassa rapide" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Mafé en une heure" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Thiakry" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Moins d’1 h" }));
    expect(
      screen.getByRole("heading", { name: "Yassa rapide" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Mafé en une heure" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Moins d’1 h 30" }));
    expect(
      screen.getByRole("heading", { name: "Mafé en une heure" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Thiakry" }),
    ).not.toBeInTheDocument();
  });

  it("shows a duration badge and recipe link for a recipe with an image", () => {
    const recipe = { ...recipes[0]!, imageUrl: "https://images.example/yassa" };
    render(<RecipeShowcase recipes={[recipe]} />);

    expect(screen.getByText("29 min")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Voir la recette Yassa rapide" }),
    ).toHaveAttribute("href", "/recettes/yassa-rapide");
    expect(screen.getByRole("img", { name: "Yassa" })).toHaveAttribute(
      "src",
      "https://images.example/yassa",
    );
  });
});
