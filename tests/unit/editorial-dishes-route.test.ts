import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  dishCreate: vi.fn(),
  dishFindUnique: vi.fn(),
  getSession: vi.fn(),
  hasPermission: vi.fn(),
  sourceCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  auth: { api: { getSession: routeMocks.getSession } },
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    dish: {
      create: routeMocks.dishCreate,
      findUnique: routeMocks.dishFindUnique,
    },
    $transaction: routeMocks.transaction,
  },
}));

vi.mock("@/server/policies/permissions", () => ({
  hasPermission: routeMocks.hasPermission,
}));

import { POST } from "@/app/api/v1/editorial/dishes/route";

function createRequest(
  body: unknown,
  origin = "https://mijora.example",
): Request {
  const request = new Request("https://mijora.example/api/v1/editorial/dishes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-test-origin": origin,
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

const validDish = {
  name: "Ceebu jën",
  description: "Un plat sénégalais de riz au poisson et aux légumes.",
  sourceTitle: "Ceebu jën — UNESCO",
  sourceUrl:
    "https://ich.unesco.org/en/RL/ceebu-jen-a-culinary-art-of-senegal-01748",
  sourceFact: "La pratique est associée à la ville de Saint-Louis.",
};

describe("POST /api/v1/editorial/dishes", () => {
  beforeEach(() => {
    vi.stubEnv("BETTER_AUTH_URL", "https://mijora.example");
    routeMocks.dishCreate.mockResolvedValue({
      id: "dish-1",
      name: "Ceebu jën",
      slug: "ceebu-jen",
    });
    routeMocks.dishFindUnique.mockResolvedValue(null);
    routeMocks.getSession.mockResolvedValue({
      user: { id: "editor-1", role: "editor" },
    });
    routeMocks.hasPermission.mockReturnValue(true);
    routeMocks.sourceCreate.mockResolvedValue({ id: "source-1" });
    routeMocks.transaction.mockImplementation(async (callback) =>
      callback({
        contentSource: { create: routeMocks.sourceCreate },
        dish: { create: routeMocks.dishCreate },
      }),
    );
  });

  it("requires an authenticated user with creation permission", async () => {
    routeMocks.getSession.mockResolvedValue(null);

    const response = await POST(createRequest(validDish));

    expect(response.status).toBe(401);
    expect(routeMocks.transaction).not.toHaveBeenCalled();
  });

  it("denies users without editorial creation permission", async () => {
    routeMocks.hasPermission.mockReturnValue(false);

    const response = await POST(createRequest(validDish));

    expect(response.status).toBe(403);
    expect(routeMocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects non-HTTPS sources without creating content", async () => {
    const response = await POST(
      createRequest({ ...validDish, sourceUrl: "http://example.org/source" }),
    );

    expect(response.status).toBe(400);
    expect(routeMocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a draft and its source atomically", async () => {
    const response = await POST(createRequest(validDish));
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(routeMocks.sourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: validDish.sourceTitle,
          url: validDish.sourceUrl,
        }),
        select: { id: true },
      }),
    );
    expect(routeMocks.dishCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdById: "editor-1",
          languageCode: "fr",
          slug: "ceebu-jen",
          status: "DRAFT",
          sources: {
            create: {
              fact: validDish.sourceFact,
              sourceId: "source-1",
            },
          },
        }),
      }),
    );
    expect(result.data).toEqual({
      id: "dish-1",
      name: "Ceebu jën",
      slug: "ceebu-jen",
    });
  });

  it("returns a conflict when the normalized slug already exists", async () => {
    routeMocks.dishFindUnique.mockResolvedValue({ id: "existing-dish" });

    const response = await POST(createRequest(validDish));

    expect(response.status).toBe(409);
    expect(routeMocks.transaction).not.toHaveBeenCalled();
  });
});
