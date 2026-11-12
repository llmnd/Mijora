import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  createSignedImageUrl: vi.fn(),
  deleteImage: vi.fn(),
  fileTypeFromBuffer: vi.fn(),
  getSession: vi.fn(),
  hasPermission: vi.fn(),
  imageCreate: vi.fn(),
  targetFind: vi.fn(),
  uploadImage: vi.fn(),
}));

vi.mock("file-type", () => ({
  fileTypeFromBuffer: routeMocks.fileTypeFromBuffer,
}));

vi.mock("@/lib/neon-object-storage", () => ({
  createImageObjectKey: vi.fn(() => "dishes/opaque.webp"),
  createSignedImageUrl: routeMocks.createSignedImageUrl,
  deleteImage: routeMocks.deleteImage,
  isImageContentType: vi.fn((contentType: string) =>
    ["image/avif", "image/jpeg", "image/png", "image/webp"].includes(
      contentType,
    ),
  ),
  uploadImage: routeMocks.uploadImage,
}));

vi.mock("@/server/auth", () => ({
  auth: { api: { getSession: routeMocks.getSession } },
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    dish: { findUnique: routeMocks.targetFind },
    dishImage: { create: routeMocks.imageCreate },
    ingredient: { findUnique: routeMocks.targetFind },
    ingredientImage: { create: routeMocks.imageCreate },
    recipe: { findUnique: routeMocks.targetFind },
    recipeImage: { create: routeMocks.imageCreate },
  },
}));

vi.mock("@/server/policies/permissions", () => ({
  hasPermission: routeMocks.hasPermission,
}));

import { POST } from "@/app/api/v1/media/route";

function createRequest(
  options: {
    origin?: string;
    includeFile?: boolean;
    includeCredits?: boolean;
    fileSize?: number;
  } = {},
): Request {
  const formData = new FormData();
  formData.set("ownerType", "dish");
  formData.set("ownerId", "dish-1");
  formData.set("kind", "PHOTO");
  if (options.includeCredits !== false) {
    formData.set("creator", "Awa");
    formData.set("provenance", "Photo fournie");
    formData.set("license", "Accord");
  }
  if (options.includeFile !== false) {
    formData.set(
      "file",
      new File([new Uint8Array(options.fileSize ?? 3)], "dish.webp", {
        type: "image/webp",
      }),
    );
  }

  const request = new Request("https://mijora.example/api/v1/media", {
    method: "POST",
    headers: {
      "x-test-origin": options.origin ?? "https://mijora.example",
    },
    body: formData,
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

describe("POST /api/v1/media", () => {
  beforeEach(() => {
    vi.stubEnv("BETTER_AUTH_URL", "https://mijora.example");
    routeMocks.createSignedImageUrl.mockResolvedValue(
      "https://signed.example/image",
    );
    routeMocks.deleteImage.mockResolvedValue(undefined);
    routeMocks.fileTypeFromBuffer.mockResolvedValue({
      ext: "webp",
      mime: "image/webp",
    });
    routeMocks.getSession.mockResolvedValue({
      user: { id: "editor-1", role: "editor" },
    });
    routeMocks.hasPermission.mockReturnValue(true);
    routeMocks.imageCreate.mockResolvedValue({ id: "image-1" });
    routeMocks.targetFind.mockResolvedValue({ id: "dish-1" });
    routeMocks.uploadImage.mockResolvedValue(undefined);
  });

  it("rejects requests from an untrusted origin before checking the session", async () => {
    const response = await POST(
      createRequest({ origin: "https://attacker.example" }),
    );

    expect(response.status).toBe(403);
    expect(routeMocks.getSession).not.toHaveBeenCalled();
  });

  it("requires an editorial permission", async () => {
    routeMocks.hasPermission.mockReturnValue(false);

    const response = await POST(createRequest());

    expect(response.status).toBe(403);
    expect(routeMocks.uploadImage).not.toHaveBeenCalled();
  });

  it("does not store an image whose detected content type is unsupported", async () => {
    routeMocks.fileTypeFromBuffer.mockResolvedValue({
      ext: "svg",
      mime: "image/svg+xml",
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(415);
    expect(routeMocks.uploadImage).not.toHaveBeenCalled();
  });

  it("rejects images larger than 10 MiB before storing them", async () => {
    const response = await POST(
      createRequest({ fileSize: 10 * 1024 * 1024 + 1 }),
    );

    expect(response.status).toBe(413);
    expect(routeMocks.uploadImage).not.toHaveBeenCalled();
  });

  it("stores an authorized image, records its metadata, and returns a signed URL", async () => {
    const response = await POST(createRequest());
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(routeMocks.uploadImage).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "dishes/opaque.webp",
        contentType: "image/webp",
      }),
    );
    expect(routeMocks.imageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dish: { connect: { id: "dish-1" } },
          uploadedBy: { connect: { id: "editor-1" } },
        }),
        select: { id: true },
      }),
    );
    expect(result).toEqual({
      data: {
        id: "image-1",
        key: "dishes/opaque.webp",
        url: "https://signed.example/image",
      },
    });
  });

  it("accepts a personal image without source or licensing metadata", async () => {
    const response = await POST(createRequest({ includeCredits: false }));

    expect(response.status).toBe(201);
    expect(routeMocks.imageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dish: { connect: { id: "dish-1" } },
          creator: null,
          provenance: null,
          license: null,
        }),
      }),
    );
  });

  it("removes the stored object if signing or database persistence fails", async () => {
    routeMocks.imageCreate.mockRejectedValue(new Error("database unavailable"));

    await expect(POST(createRequest())).rejects.toThrow("database unavailable");

    expect(routeMocks.deleteImage).toHaveBeenCalledWith("dishes/opaque.webp");
  });
});
