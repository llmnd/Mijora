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
  recipeUpdateMany: vi.fn(),
  revalidatePath: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: routeMocks.revalidatePath,
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

import { POST } from "@/app/api/v1/editorial/archive/route";

function createRequest(body: unknown): Request {
  const request = new Request("https://mijora.example/api/v1/editorial/archive", {
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

describe("POST /api/v1/editorial/archive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BETTER_AUTH_URL", "https://mijora.example");
    routeMocks.getSession.mockResolvedValue({
      user: { id: "editor-1", role: "editor" },
    });
    routeMocks.hasPermission.mockReturnValue(true);
    routeMocks.dishFindUnique.mockResolvedValue({
      id: "dish-1",
      name: "Yassa",
      status: "PUBLISHED",
      recipes: [
        {
          id: "recipe-1",
          title: "Yassa au poulet",
          slug: "yassa-au-poulet",
          status: "PUBLISHED",
        },
      ],
    });
    routeMocks.recipeFindUnique.mockResolvedValue({
      id: "recipe-1",
      title: "Yassa au poulet",
      slug: "yassa-au-poulet",
      status: "PUBLISHED",
    });
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
          updateMany: routeMocks.recipeUpdateMany,
        },
        recipeImage: { updateMany: routeMocks.recipeImageUpdateMany },
      }),
    );
  });

  it("requires editorial edit permission", async () => {
    routeMocks.hasPermission.mockReturnValue(false);

    const response = await POST(
      createRequest({
        contentId: "dish-1",
        contentType: "dish",
        action: "archive",
      }),
    );

    expect(response.status).toBe(403);
    expect(routeMocks.transaction).not.toHaveBeenCalled();
  });

  it("archives a dish and withdraws its published recipes and images atomically", async () => {
    const response = await POST(
      createRequest({
        contentId: "dish-1",
        contentType: "dish",
        action: "archive",
      }),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.data).toEqual({ id: "dish-1", status: "ARCHIVED" });
    expect(routeMocks.dishUpdate).toHaveBeenCalledWith({
      where: { id: "dish-1" },
      data: { status: "ARCHIVED", publishedAt: null },
    });
    expect(routeMocks.recipeUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["recipe-1"] } },
      data: { status: "DRAFT", publishedAt: null },
    });
    expect(routeMocks.dishImageUpdateMany).toHaveBeenCalledWith({
      where: { dishId: "dish-1", status: "PUBLISHED" },
      data: { status: "DRAFT" },
    });
    expect(routeMocks.recipeImageUpdateMany).toHaveBeenCalledWith({
      where: { recipeId: { in: ["recipe-1"] }, status: "PUBLISHED" },
      data: { status: "DRAFT" },
    });
    expect(routeMocks.auditCreate).toHaveBeenCalledOnce();
    expect(routeMocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(routeMocks.revalidatePath).toHaveBeenCalledWith(
      "/recettes/yassa-au-poulet",
    );
  });

  it("restores a dish as draft without republishing its recipes", async () => {
    routeMocks.dishFindUnique.mockResolvedValue({
      id: "dish-1",
      name: "Yassa",
      status: "ARCHIVED",
      recipes: [
        {
          id: "recipe-1",
          title: "Yassa au poulet",
          slug: "yassa-au-poulet",
          status: "DRAFT",
        },
      ],
    });

    const response = await POST(
      createRequest({
        contentId: "dish-1",
        contentType: "dish",
        action: "restore",
      }),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.data).toEqual({ id: "dish-1", status: "DRAFT" });
    expect(routeMocks.dishUpdate).toHaveBeenCalledWith({
      where: { id: "dish-1" },
      data: { status: "DRAFT", publishedAt: null },
    });
    expect(routeMocks.recipeUpdateMany).not.toHaveBeenCalled();
    expect(routeMocks.dishImageUpdateMany).not.toHaveBeenCalled();
    expect(routeMocks.recipeImageUpdateMany).not.toHaveBeenCalled();
  });

  it("restores an archived recipe to draft and revalidates its public route", async () => {
    routeMocks.recipeFindUnique.mockResolvedValue({
      id: "recipe-1",
      title: "Yassa au poulet",
      slug: "yassa-au-poulet",
      status: "ARCHIVED",
    });

    const response = await POST(
      createRequest({
        contentId: "recipe-1",
        contentType: "recipe",
        action: "restore",
      }),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.data).toEqual({ id: "recipe-1", status: "DRAFT" });
    expect(routeMocks.recipeUpdate).toHaveBeenCalledWith({
      where: { id: "recipe-1" },
      data: { status: "DRAFT", publishedAt: null },
    });
    expect(routeMocks.revalidatePath).toHaveBeenCalledWith(
      "/recettes/yassa-au-poulet",
    );
  });
});
