import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  auditCreate: vi.fn(),
  dishFindUnique: vi.fn(),
  dishImageUpdateMany: vi.fn(),
  dishUpdate: vi.fn(),
  getSession: vi.fn(),
  hasPermission: vi.fn(),
  recipeFindUnique: vi.fn(),
  recipeImageUpdateMany: vi.fn(),
  recipeUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  auth: { api: { getSession: routeMocks.getSession } },
}));

vi.mock("@/server/db/client", () => ({
  prisma: { $transaction: routeMocks.transaction },
}));

vi.mock("@/server/policies/permissions", () => ({
  hasPermission: routeMocks.hasPermission,
}));

import { POST } from "@/app/api/v1/editorial/publish/route";

function createRequest(body: unknown): Request {
  const request = new Request("https://mijora.example/api/v1/editorial/publish", {
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

describe("POST /api/v1/editorial/publish", () => {
  beforeEach(() => {
    vi.stubEnv("BETTER_AUTH_URL", "https://mijora.example");
    routeMocks.getSession.mockResolvedValue({
      user: { id: "admin-1", role: "admin" },
    });
    routeMocks.hasPermission.mockReturnValue(true);
    routeMocks.dishFindUnique.mockResolvedValue({
      id: "dish-1",
      name: "Yassa",
      status: "DRAFT",
      description: "Un plat sénégalais de poulet aux oignons et au citron.",
      sources: [{ sourceId: "source-1" }],
    });
    routeMocks.dishUpdate.mockResolvedValue({});
    routeMocks.dishImageUpdateMany.mockResolvedValue({ count: 1 });
    routeMocks.recipeFindUnique.mockResolvedValue({
      id: "recipe-1",
      title: "Yassa au poulet",
      status: "DRAFT",
      description: "Une recette familiale de poulet aux oignons et au citron.",
      dish: { status: "PUBLISHED" },
      sources: [{ sourceId: "source-1" }],
      ingredients: [{ ingredientId: "ingredient-1" }],
      steps: [{ id: "step-1" }],
    });
    routeMocks.recipeUpdate.mockResolvedValue({});
    routeMocks.recipeImageUpdateMany.mockResolvedValue({ count: 1 });
    routeMocks.auditCreate.mockResolvedValue({});
    routeMocks.transaction.mockImplementation(async (callback) =>
      callback({
        adminAuditLog: { create: routeMocks.auditCreate },
        dish: {
          findUnique: routeMocks.dishFindUnique,
          update: routeMocks.dishUpdate,
        },
        dishImage: { updateMany: routeMocks.dishImageUpdateMany },
        recipe: {
          findUnique: routeMocks.recipeFindUnique,
          update: routeMocks.recipeUpdate,
        },
        recipeImage: { updateMany: routeMocks.recipeImageUpdateMany },
      }),
    );
  });

  it("denies editors who lack publish permission", async () => {
    routeMocks.hasPermission.mockReturnValue(false);

    const response = await POST(
      createRequest({ contentType: "dish", contentId: "dish-1" }),
    );

    expect(response.status).toBe(403);
    expect(routeMocks.transaction).not.toHaveBeenCalled();
  });

  it("publishes the dish, its non-archived images and an audit record atomically", async () => {
    const response = await POST(
      createRequest({ contentType: "dish", contentId: "dish-1" }),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.data).toEqual({ id: "dish-1", status: "PUBLISHED" });
    expect(routeMocks.dishUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "dish-1" },
        data: expect.objectContaining({ status: "PUBLISHED" }),
      }),
    );
    expect(routeMocks.dishImageUpdateMany).toHaveBeenCalledWith({
      where: {
        dishId: "dish-1",
        status: { in: ["DRAFT", "PENDING_REVIEW", "APPROVED"] },
      },
      data: { status: "PUBLISHED" },
    });
    expect(routeMocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: "admin-1",
          action: "editorial.publish",
          targetType: "dish",
          targetId: "dish-1",
        }),
      }),
    );
  });

  it("does not publish a dish without its required source", async () => {
    routeMocks.dishFindUnique.mockResolvedValue({
      id: "dish-1",
      name: "Yassa",
      status: "DRAFT",
      description: "Un plat sénégalais de poulet aux oignons et au citron.",
      sources: [],
    });

    const response = await POST(
      createRequest({ contentType: "dish", contentId: "dish-1" }),
    );

    expect(response.status).toBe(409);
    expect(routeMocks.dishUpdate).not.toHaveBeenCalled();
    expect(routeMocks.auditCreate).not.toHaveBeenCalled();
  });

  it("publishes a ready recipe and its public image", async () => {
    const response = await POST(
      createRequest({ contentType: "recipe", contentId: "recipe-1" }),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.data).toEqual({ id: "recipe-1", status: "PUBLISHED" });
    expect(routeMocks.recipeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "recipe-1" },
        data: expect.objectContaining({ status: "PUBLISHED" }),
      }),
    );
    expect(routeMocks.recipeImageUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          recipeId: "recipe-1",
          status: { in: ["DRAFT", "PENDING_REVIEW", "APPROVED"] },
        },
        data: { status: "PUBLISHED" },
      }),
    );
    expect(routeMocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "editorial.publish",
          targetType: "recipe",
          targetId: "recipe-1",
        }),
      }),
    );
  });

  it("keeps a recipe private while its associated dish is unpublished", async () => {
    routeMocks.recipeFindUnique.mockResolvedValue({
      id: "recipe-1",
      title: "Yassa au poulet",
      status: "DRAFT",
      description: "Une recette familiale de poulet aux oignons et au citron.",
      dish: { status: "DRAFT" },
      sources: [{ sourceId: "source-1" }],
      ingredients: [{ ingredientId: "ingredient-1" }],
      steps: [{ id: "step-1" }],
    });

    const response = await POST(
      createRequest({ contentType: "recipe", contentId: "recipe-1" }),
    );

    expect(response.status).toBe(409);
    expect(routeMocks.recipeUpdate).not.toHaveBeenCalled();
    expect(routeMocks.auditCreate).not.toHaveBeenCalled();
  });
});
