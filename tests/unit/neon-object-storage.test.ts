import { describe, expect, it, vi } from "vitest";

const storageMocks = vi.hoisted(() => ({
  clientConfig: vi.fn(),
  send: vi.fn(),
  signedUrl: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@aws-sdk/client-s3", () => {
  class MockClient {
    constructor(config: unknown) {
      storageMocks.clientConfig(config);
    }

    send(...args: unknown[]) {
      return storageMocks.send(...args);
    }
  }

  class MockCommand {
    constructor(readonly input: unknown) {}
  }

  return {
    DeleteObjectCommand: MockCommand,
    GetObjectCommand: MockCommand,
    PutObjectCommand: MockCommand,
    S3Client: MockClient,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: storageMocks.signedUrl,
}));

import {
  createImageObjectKey,
  createSignedImageUrl,
  uploadImage,
} from "@/lib/neon-object-storage";

describe("Neon Object Storage image keys", () => {
  it("creates opaque keys under the selected image domain", () => {
    const key = createImageObjectKey("dishes", "image/webp");

    expect(key).toMatch(
      /^dishes\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/,
    );
  });

  it("rejects unsupported image types and keys before storage access", async () => {
    expect(() => createImageObjectKey("recipes", "text/plain")).toThrow(
      "Unsupported image content type.",
    );
    await expect(
      uploadImage({
        key: "../private.png",
        bytes: new Uint8Array([1]),
        contentType: "image/png",
      }),
    ).rejects.toThrow("Invalid Neon image object key.");
    await expect(createSignedImageUrl("../private.png")).rejects.toThrow(
      "Invalid Neon image object key.",
    );
  });

  it("requires the key extension to match the uploaded image type", async () => {
    const key = createImageObjectKey("ingredients", "image/jpeg");

    await expect(
      uploadImage({
        key,
        bytes: new Uint8Array([1]),
        contentType: "image/png",
      }),
    ).rejects.toThrow(
      "Image object key extension must match its content type.",
    );
  });

  it("uploads to the configured private bucket with path-style S3 access", async () => {
    vi.stubEnv("AWS_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "test-secret-key");
    vi.stubEnv(
      "AWS_ENDPOINT_URL_S3",
      "https://branch.storage.c-1.us-east-2.aws.neon.tech",
    );
    vi.stubEnv("AWS_REGION", "us-east-2");
    vi.stubEnv("NEON_STORAGE_BUCKET", "assets");
    storageMocks.send.mockResolvedValue({});

    const key = createImageObjectKey("dishes", "image/webp");
    await uploadImage({
      key,
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "image/webp",
    });

    expect(storageMocks.clientConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint:
          "https://branch.storage.c-1.us-east-2.aws.neon.tech/",
        forcePathStyle: true,
        region: "us-east-2",
        requestChecksumCalculation: "WHEN_REQUIRED",
      }),
    );
    expect(storageMocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: "assets",
          Key: key,
          ContentType: "image/webp",
        }),
      }),
    );
  });

  it("generates a short-lived signed read URL without exposing storage credentials", async () => {
    const key = createImageObjectKey("recipes", "image/avif");
    storageMocks.signedUrl.mockResolvedValue("https://signed.example/image");

    await expect(createSignedImageUrl(key)).resolves.toBe(
      "https://signed.example/image",
    );
    expect(storageMocks.signedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: { Bucket: "assets", Key: key },
      }),
      { expiresIn: 900 },
    );
  });
});
