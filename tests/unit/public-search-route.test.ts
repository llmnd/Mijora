import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  createSignedImageUrl: vi.fn(),
  dishFindMany: vi.fn(),
  recipeFindMany: vi.fn(),
}));

vi.mock("@/lib/neon-object-storage", () => ({
  createSignedImageUrl: routeMocks.createSignedImageUrl,
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    dish: { findMany: routeMocks.dishFindMany },
    recipe: { findMany: routeMocks.recipeFindMany },
  },
}));

import { GET } from "@/app/api/v1/search/route";

function createRequest(query?: string): Request {
  const url = new URL("https://mijora.example/api/v1/search");
  if (query !== undefined) {
    url.searchParams.set("q", query);
  }
  return new Request(url);
}

describe("GET /api/v1/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.dishFindMany.mockResolvedValue([
      {
        id: "dish-1",
        name: "Yassa",
        slug: "yassa",
        description: "Poulet aux oignons et au citron.",
        images: [{ storageKey: "dishes/published.jpg", altText: "Yassa prêt" }],
      },
      {
        id: "dish-2",
        name: "Yassa végétal",
        slug: "yassa-vegetal",
        description: null,
        images: [],
      },
    ]);
    routeMocks.recipeFindMany.mockResolvedValue([
      {
        id: "recipe-1",
        title: "Yassa au poulet",
        slug: "yassa-au-poulet",
        description: "Une recette familiale.",
        dish: { name: "Yassa" },
        images: [{ storageKey: "recipes/published.jpg", altText: null }],
      },
    ]);
    routeMocks.createSignedImageUrl.mockImplementation(
      async (key: string) => `https://images.example/${key}`,
    );
  });

  it.each([
    ["missing", undefined],
    ["too short", " a "],
    ["too long", "a".repeat(81)],
  ])("returns a JSON 400 for a %s query", async (_label, query) => {
    const response = await GET(createRequest(query));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_QUERY",
        message: "Query must be between 2 and 80 characters.",
      },
    });
    expect(routeMocks.dishFindMany).not.toHaveBeenCalled();
    expect(routeMocks.recipeFindMany).not.toHaveBeenCalled();
  });

  it("searches only published content and returns the public result shape", async () => {
    const response = await GET(createRequest("  yAsSa  "));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(routeMocks.dishFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "PUBLISHED",
          OR: [
            { name: { contains: "yAsSa", mode: "insensitive" } },
            { description: { contains: "yAsSa", mode: "insensitive" } },
          ],
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 6,
      }),
    );
    expect(routeMocks.recipeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "PUBLISHED",
          dish: { status: "PUBLISHED" },
          OR: [
            { title: { contains: "yAsSa", mode: "insensitive" } },
            { description: { contains: "yAsSa", mode: "insensitive" } },
          ],
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 6,
      }),
    );

    const dishQuery = routeMocks.dishFindMany.mock.calls[0][0];
    const recipeQuery = routeMocks.recipeFindMany.mock.calls[0][0];
    expect(dishQuery.select.images).toEqual(
      expect.objectContaining({
        where: { status: "PUBLISHED" },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        take: 1,
      }),
    );
    expect(recipeQuery.select.images).toEqual(
      expect.objectContaining({
        where: { status: "PUBLISHED" },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        take: 1,
      }),
    );

    expect(result).toEqual({
      data: {
        dishes: [
          {
            id: "dish-1",
            name: "Yassa",
            slug: "yassa",
            description: "Poulet aux oignons et au citron.",
            imageUrl: "https://images.example/dishes/published.jpg",
            imageAlt: "Yassa prêt",
          },
          {
            id: "dish-2",
            name: "Yassa végétal",
            slug: "yassa-vegetal",
            description: null,
            imageUrl: null,
            imageAlt: "Yassa végétal",
          },
        ],
        recipes: [
          {
            id: "recipe-1",
            title: "Yassa au poulet",
            slug: "yassa-au-poulet",
            description: "Une recette familiale.",
            dishName: "Yassa",
            imageUrl: "https://images.example/recipes/published.jpg",
            imageAlt: "Yassa au poulet",
          },
        ],
      },
    });
    expect(routeMocks.createSignedImageUrl).toHaveBeenCalledTimes(2);
  });
});
