import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  dishFindUnique: vi.fn(),
  getSession: vi.fn(),
  hasPermission: vi.fn(),
  ingredientUpsert: vi.fn(),
  recipeCreate: vi.fn(),
  recipeFindUnique: vi.fn(),
  sourceCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  auth: { api: { getSession: routeMocks.getSession } },
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    dish: { findUnique: routeMocks.dishFindUnique },
    recipe: {
      create: routeMocks.recipeCreate,
      findUnique: routeMocks.recipeFindUnique,
    },
    $transaction: routeMocks.transaction,
  },
}));

vi.mock("@/server/policies/permissions", () => ({
  hasPermission: routeMocks.hasPermission,
}));

import { POST } from "@/app/api/v1/editorial/recipes/route";

function createRequest(body: unknown): Request {
  const request = new Request("https://mijora.example/api/v1/editorial/recipes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-test-origin": "https://mijora.example",
    },
    body: JSON.stringify(body),
  });
  const requestHeaders = request.headers;
  Object.defineProperty(request, "headers", {
    value: {
      get(name: string) {
        return name.toLowerCase() === "origin"
          ? requestHeaders.get("x-test-origin")
          : requestHeaders.get(name);
      },
    },
  });
  return request;
}

const validRecipe = {
  dishId: "dish-1",
  title: "Yassa au poulet",
  description: "Une recette familiale de poulet aux oignons et au citron.",
  servings: 4,
  preparationTimeMinutes: 20,
  cookingTimeMinutes: 45,
  ingredients: [
    { name: "Poulet", amount: "1 kg" },
    { name: "Oignons", amount: "4" },
  ],
  steps: [
    "Mariner le poulet dans le citron.",
    "Cuire le poulet avec les oignons.",
  ],
  sourceTitle: "Recette de référence",
  sourceUrl: "https://example.org/yassa",
  sourceFact: "Le yassa se prépare avec du citron et des oignons.",
};

describe("POST /api/v1/editorial/recipes", () => {
  beforeEach(() => {
    vi.stubEnv("BETTER_AUTH_URL", "https://mijora.example");
    routeMocks.dishFindUnique.mockResolvedValue({ id: "dish-1" });
    routeMocks.getSession.mockResolvedValue({
      user: { id: "editor-1", role: "editor" },
    });
    routeMocks.hasPermission.mockReturnValue(true);
    routeMocks.ingredientUpsert
      .mockResolvedValueOnce({ id: "ingredient-1" })
      .mockResolvedValueOnce({ id: "ingredient-2" });
    routeMocks.recipeCreate.mockResolvedValue({
      id: "recipe-1",
      title: validRecipe.title,
      slug: "yassa-au-poulet",
      dishId: "dish-1",
    });
    routeMocks.recipeFindUnique.mockResolvedValue(null);
    routeMocks.sourceCreate.mockResolvedValue({ id: "source-1" });
    routeMocks.transaction.mockImplementation(async (callback) =>
      callback({
        contentSource: { create: routeMocks.sourceCreate },
        ingredient: { upsert: routeMocks.ingredientUpsert },
        recipe: { create: routeMocks.recipeCreate },
      }),
    );
  });

  it("requires an authenticated editor", async () => {
    routeMocks.getSession.mockResolvedValue(null);

    const response = await POST(createRequest(validRecipe));

    expect(response.status).toBe(401);
    expect(routeMocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects duplicated normalized ingredients before database writes", async () => {
    const response = await POST(
      createRequest({
        ...validRecipe,
        ingredients: [
          { name: "Oignons", amount: "1" },
          { name: "Oignons", amount: "2" },
        ],
      }),
    );

    expect(response.status).toBe(400);
    expect(routeMocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a draft recipe with ingredient references, steps and source atomically", async () => {
    const response = await POST(createRequest(validRecipe));
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(routeMocks.recipeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdById: "editor-1",
          slug: "yassa-au-poulet",
          status: "DRAFT",
          sources: {
            create: {
              fact: validRecipe.sourceFact,
              sourceId: "source-1",
            },
          },
          ingredients: {
            create: expect.arrayContaining([
              expect.objectContaining({
                notes: "1 kg",
                ingredient: { connect: { id: "ingredient-1" } },
              }),
            ]),
          },
          steps: {
            create: [
              { position: 0, instruction: validRecipe.steps[0] },
              { position: 1, instruction: validRecipe.steps[1] },
            ],
          },
        }),
      }),
    );
    expect(result.data).toEqual({
      id: "recipe-1",
      title: "Yassa au poulet",
      slug: "yassa-au-poulet",
      dishId: "dish-1",
    });
  });
});
