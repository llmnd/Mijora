import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const pageMocks = vi.hoisted(() => ({
  createSignedImageUrl: vi.fn(),
  recipeFindFirst: vi.fn(),
}));

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/components/site-header", () => ({
  SiteHeader: () => <header />,
}));

vi.mock("@/lib/neon-object-storage", () => ({
  createSignedImageUrl: pageMocks.createSignedImageUrl,
}));

vi.mock("@/server/db/client", () => ({
  prisma: { recipe: { findFirst: pageMocks.recipeFindFirst } },
}));

import RecipePage from "@/app/recettes/[slug]/page";

describe("public recipe page", () => {
  it("shows ingredients, steps, sources and image credits only for the published recipe", async () => {
    pageMocks.recipeFindFirst.mockResolvedValue({
      title: "Yassa au poulet",
      description: "Poulet mariné au citron et aux oignons.",
      servings: 4,
      preparationTimeMinutes: 20,
      cookingTimeMinutes: 45,
      dish: { name: "Yassa" },
      ingredients: [
        {
          notes: "1 kg",
          isOptional: false,
          ingredient: { name: "Poulet" },
        },
      ],
      steps: [{ instruction: "Mariner le poulet dans le citron." }],
      sources: [
        {
          fact: "Le yassa se prépare avec du citron et des oignons.",
          source: { title: "Source culinaire", url: "https://example.org/yassa" },
        },
      ],
      images: [
        {
          storageKey: "recipes/image.jpg",
          altText: "Yassa au poulet",
          attribution: "Photographe",
          provenance: "https://example.org/image",
          license: "CC BY 4.0",
        },
      ],
    });
    pageMocks.createSignedImageUrl.mockResolvedValue(
      "https://images.example/signed",
    );

    render(await RecipePage({ params: Promise.resolve({ slug: "yassa-au-poulet" }) }));

    expect(
      screen.getByRole("heading", { name: "Yassa au poulet", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Poulet")).toBeInTheDocument();
    expect(screen.getByText("1 kg")).toBeInTheDocument();
    expect(
      screen.getByText("Mariner le poulet dans le citron."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Source culinaire" }),
    ).toHaveAttribute("href", "https://example.org/yassa");
    expect(
      screen.getByRole("link", { name: "Photographe · CC BY 4.0" }),
    ).toHaveAttribute("href", "https://example.org/image");
    expect(pageMocks.recipeFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: "yassa-au-poulet",
          status: "PUBLISHED",
          dish: { status: "PUBLISHED" },
        },
      }),
    );
  });
});
