import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  RecipeInspiration,
  type RecipeIdea,
} from "@/features/discovery/recipe-inspiration";

const recipes: RecipeIdea[] = [
  {
    id: "quick-recipe",
    title: "Yassa rapide",
    slug: "yassa-rapide",
    description: "Une idée rapide pour le soir.",
    dishName: "Yassa",
    imageUrl: null,
    imageAlt: "Yassa",
    preparationTimeMinutes: 15,
    cookingTimeMinutes: 10,
    ingredients: [
      { id: "chicken", name: "Poulet", isOptional: false },
      { id: "onion", name: "Oignon", isOptional: false },
      { id: "lemon", name: "Citron", isOptional: false },
    ],
  },
  {
    id: "slow-recipe",
    title: "Mafé mijoté",
    slug: "mafe-mijote",
    description: "Une recette à prendre son temps.",
    dishName: "Mafé",
    imageUrl: null,
    imageAlt: "Mafé",
    preparationTimeMinutes: 20,
    cookingTimeMinutes: 55,
    ingredients: [
      { id: "peanut", name: "Arachide", isOptional: false },
      { id: "onion", name: "Oignon", isOptional: false },
    ],
  },
  {
    id: "unknown-time",
    title: "Thieboudienne",
    slug: "thieboudienne",
    description: null,
    dishName: "Ceebu jën",
    imageUrl: null,
    imageAlt: "Ceebu jën",
    preparationTimeMinutes: null,
    cookingTimeMinutes: null,
    ingredients: [
      { id: "fish", name: "Poisson", isOptional: false },
      { id: "rice", name: "Riz", isOptional: false },
      { id: "onion", name: "Oignon", isOptional: false },
    ],
  },
];

describe("recipe inspiration", () => {
  it("suggests only a recipe within the selected time budget", async () => {
    const user = userEvent.setup();
    render(<RecipeInspiration recipes={recipes} />);

    await user.click(screen.getByRole("button", { name: "30 min max" }));
    await user.click(screen.getByRole("button", { name: "Trouver une recette" }));

    expect(
      await screen.findByRole("heading", { name: "Yassa rapide" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Environ 25 min")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Voir la recette" }),
    ).toHaveAttribute("href", "/recettes/yassa-rapide");
  });

  it("explains when no published recipe matches the chosen time", async () => {
    const user = userEvent.setup();
    render(<RecipeInspiration recipes={recipes} />);

    await user.click(screen.getByRole("button", { name: "Jusqu’à 1 h" }));

    expect(
      screen.getByText(/Aucune recette ne correspond exactement à ce temps/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Trouver une recette" }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: "Trouver une recette" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Yassa rapide" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Voici une autre recette publiée à explorer/),
    ).toBeInTheDocument();
  });

  it("matches free-form ingredient input and ranks by number of matches", async () => {
    const user = userEvent.setup();
    render(<RecipeInspiration recipes={recipes} />);

    await user.type(
      screen.getByLabelText(/Quels ingrédients avez-vous/),
      "oignons, citron",
    );
    await user.click(
      screen.getByRole("button", { name: "Trouver une recette" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Yassa rapide" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Contient Oignon, Citron.")).toBeInTheDocument();
    expect(
      screen.getByText("Autres ingrédients requis : Poulet."),
    ).toBeInTheDocument();
  });

  it("accepts free-form ingredients with no catalog and qualifies a fallback idea", async () => {
    const user = userEvent.setup();
    const recipesWithoutIngredients = recipes.map((recipe) => ({
      ...recipe,
      description:
        recipe.id === "quick-recipe"
          ? "Une recette au poulet pour le soir."
          : recipe.description,
      ingredients: [],
    }));
    render(<RecipeInspiration recipes={recipesWithoutIngredients} />);

    await user.type(
      screen.getByLabelText(/Quels ingrédients avez-vous/),
      "tomate, riz",
    );
    expect(
      screen.getByRole("button", { name: "Proposer une idée à vérifier" }),
    ).toBeEnabled();
    expect(
      screen.getByText(/Je ne trouve pas de correspondance vérifiable/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Proposer une idée à vérifier" }),
    );

    expect(
      await screen.findByText(/Vérifiez la liste avant de cuisiner/),
    ).toBeInTheDocument();
  });

  it("suggests a published dish when no recipe is available", async () => {
    const user = userEvent.setup();
    const dish = {
      ...recipes[0],
      id: "dish-only",
      title: "Ceebu jën",
      slug: null,
      dishName: "Ceebu jën",
      description: "Un plat publié du catalogue.",
      ingredients: [],
      isDishOnly: true,
    };
    render(<RecipeInspiration recipes={[]} dishes={[dish]} />);

    expect(
      screen.getByRole("button", { name: "Trouver une idée" }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: "Trouver une idée" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Ceebu jën" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/recette détaillée de ce plat n’est pas encore disponible/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Découvrir ce plat" }),
    ).toHaveAttribute("href", "#plats");
  });

  it("uses a mention in the recipe description only as an unverified hint", async () => {
    const user = userEvent.setup();
    const recipesWithoutIngredients = recipes.map((recipe) => ({
      ...recipe,
      description:
        recipe.id === "quick-recipe"
          ? "Une recette au poulet pour le soir."
          : recipe.description,
      ingredients: [],
    }));
    render(<RecipeInspiration recipes={recipesWithoutIngredients} />);

    await user.type(
      screen.getByLabelText(/Quels ingrédients avez-vous/),
      "Poulet",
    );
    await user.click(
      screen.getByRole("button", { name: "Trouver une recette" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Yassa rapide" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/apparaît dans le titre ou la description/),
    ).toBeInTheDocument();
  });

  it("lets users use a suggested recipe's ingredients as a new selection", async () => {
    const user = userEvent.setup();
    render(<RecipeInspiration recipes={recipes} />);

    await user.click(
      screen.getByRole("button", { name: "Trouver une recette" }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: "J’ai les ingrédients de cette recette",
      }),
    );

    expect(
      screen.getByText("Choisir dans le catalogue (3 sélectionnés)"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Trouver une recette" }),
    );
    expect(
      screen.getByText("Contient Poulet, Oignon, Citron."),
    ).toBeInTheDocument();
  });
});
