import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const homeMocks = vi.hoisted(() => ({
  createSignedImageUrl: vi.fn(),
  dishFindMany: vi.fn(),
  recipeFindMany: vi.fn(),
}));

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));
import HomePage from "@/app/page";

vi.mock("@/components/site-header", () => ({
  SiteHeader: () => (
    <header>
      <nav aria-label="Navigation principale" />
    </header>
  ),
}));

vi.mock("@/lib/neon-object-storage", () => ({
  createSignedImageUrl: homeMocks.createSignedImageUrl,
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    dish: { findMany: homeMocks.dishFindMany },
    recipe: { findMany: homeMocks.recipeFindMany },
  },
}));

beforeEach(() => {
  homeMocks.dishFindMany.mockResolvedValue([]);
  homeMocks.recipeFindMany.mockResolvedValue([]);
  homeMocks.createSignedImageUrl.mockResolvedValue("https://images.example/signed");
});

describe("home page", () => {
  it("introduces Mijora and explains when no verified recipe is published", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /le goût des bonnes idées/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/aucun plat ni recette n’est publié pour le moment/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Navigation principale" }),
    ).toBeInTheDocument();
  });

  it("shows links to published recipes for visitors", async () => {
    homeMocks.recipeFindMany.mockResolvedValue([
      {
        id: "recipe-1",
        title: "Yassa au poulet",
        slug: "yassa-au-poulet",
        description: "Poulet mariné au citron et aux oignons.",
        preparationTimeMinutes: 20,
        cookingTimeMinutes: 45,
        servings: 4,
        dish: { name: "Yassa" },
        ingredients: [
          {
            isOptional: false,
            ingredient: { id: "onion", name: "Oignon" },
          },
        ],
        images: [
          {
            storageKey: "recipes/image.jpg",
            altText: "Yassa servi dans un plat",
          },
        ],
      },
    ]);

    render(await HomePage());

    expect(
      screen.getByRole("link", { name: "Voir la recette" }),
    ).toHaveAttribute("href", "/recettes/yassa-au-poulet");
    expect(
      screen.getByRole("heading", { name: "Yassa au poulet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Yassa servi dans un plat" }),
    ).toHaveAttribute("src", "https://images.example/signed");
    expect(homeMocks.recipeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PUBLISHED", dish: { status: "PUBLISHED" } },
        select: expect.objectContaining({
          ingredients: {
            orderBy: { position: "asc" },
            select: {
              isOptional: true,
              ingredient: { select: { id: true, name: true } },
            },
          },
        }),
        take: 12,
      }),
    );
  });

  it("shows a published dish on the homepage even when it has no published recipe", async () => {
    const user = userEvent.setup();
    homeMocks.dishFindMany.mockResolvedValue([
      {
        id: "dish-1",
        name: "Ceebu jën",
        description: "Riz au poisson accompagné de légumes.",
        images: [
          {
            storageKey: "dishes/ceebu-jen.jpg",
            altText: "Ceebu jën servi avec ses légumes",
          },
        ],
        recipes: [],
      },
    ]);

    render(await HomePage());

    expect(
      screen.getByRole("heading", { name: "Les plats à découvrir." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ceebu jën" })).toBeInTheDocument();
    expect(
      screen.getByText("Riz au poisson accompagné de légumes."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("La recette détaillée arrive bientôt."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Découvrir le catalogue" }),
    ).toHaveAttribute("href", "#plats");
    expect(
      screen.getByRole("img", { name: "Ceebu jën servi avec ses légumes" }),
    ).toHaveAttribute("src", "https://images.example/signed");
    const suggestionButton = screen.getByRole("button", {
      name: "Trouver une idée",
    });
    expect(suggestionButton).toBeEnabled();
    await user.click(suggestionButton);
    expect(
      screen.getByRole("link", { name: "Découvrir ce plat" }),
    ).toHaveAttribute("href", "#plats");
    expect(
      screen.getByText(/recette détaillée de ce plat n’est pas encore disponible/i),
    ).toBeInTheDocument();
    expect(homeMocks.dishFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PUBLISHED" },
        take: 12,
      }),
    );
  });
});
