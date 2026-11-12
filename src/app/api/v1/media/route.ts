import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";
import {
  createImageObjectKey,
  createSignedImageUrl,
  deleteImage,
  isImageContentType,
  uploadImage,
} from "@/lib/neon-object-storage";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import { hasPermission } from "@/server/policies/permissions";
import type { MediaOwnerType } from "@/features/media/types";

export const runtime = "nodejs";

const maxImageSizeBytes = 10 * 1024 * 1024;
const maxRequestSizeBytes = maxImageSizeBytes + 64 * 1024;
const supportedImageOwners = {
  dish: "dishes",
  ingredient: "ingredients",
  recipe: "recipes",
} as const;

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => value || null);

const uploadMetadataSchema = z.object({
  ownerType: z.enum(["dish", "ingredient", "recipe"]),
  ownerId: z.string().trim().min(1).max(128),
  kind: z.enum(["PHOTO", "ILLUSTRATION"]),
  creator: z.string().trim().min(1).max(200),
  provenance: z.string().trim().min(1).max(2000),
  license: z.string().trim().min(1).max(200),
  attribution: optionalText(1000),
  usageTerms: optionalText(2000),
  altText: optionalText(500),
});

type UploadMetadata = z.infer<typeof uploadMetadataSchema>;

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json({ error: { code, message } }, { status });
}

function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

function isAllowedOrigin(requestOrigin: string | null): boolean {
  const expectedOrigin = process.env.BETTER_AUTH_URL;
  if (!requestOrigin || !expectedOrigin) {
    return false;
  }

  try {
    return new URL(requestOrigin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}

async function targetExists(
  ownerType: MediaOwnerType,
  ownerId: string,
): Promise<boolean> {
  switch (ownerType) {
    case "dish":
      return Boolean(
        await prisma.dish.findUnique({
          where: { id: ownerId },
          select: { id: true },
        }),
      );
    case "ingredient":
      return Boolean(
        await prisma.ingredient.findUnique({
          where: { id: ownerId },
          select: { id: true },
        }),
      );
    case "recipe":
      return Boolean(
        await prisma.recipe.findUnique({
          where: { id: ownerId },
          select: { id: true },
        }),
      );
  }
}

async function createImageRecord(
  metadata: UploadMetadata,
  storageKey: string,
  userId: string,
): Promise<{ id: string }> {
  const imageData = {
    storageKey,
    kind: metadata.kind,
    creator: metadata.creator,
    provenance: metadata.provenance,
    license: metadata.license,
    attribution: metadata.attribution,
    usageTerms: metadata.usageTerms,
    altText: metadata.altText,
    createdById: userId,
  };

  switch (metadata.ownerType) {
    case "dish":
      return prisma.dishImage.create({
        data: { ...imageData, dishId: metadata.ownerId },
        select: { id: true },
      });
    case "ingredient":
      return prisma.ingredientImage.create({
        data: { ...imageData, ingredientId: metadata.ownerId },
        select: { id: true },
      });
    case "recipe":
      return prisma.recipeImage.create({
        data: { ...imageData, recipeId: metadata.ownerId },
        select: { id: true },
      });
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return errorResponse(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed.");
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return errorResponse(401, "UNAUTHENTICATED", "Sign in to upload images.");
  }
  if (!hasPermission(session.user.role, "editorial:edit")) {
    return errorResponse(403, "FORBIDDEN", "You cannot upload editorial media.");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const requestSize = Number(contentLength);
    if (!Number.isSafeInteger(requestSize) || requestSize < 0) {
      return errorResponse(400, "INVALID_CONTENT_LENGTH", "Invalid request size.");
    }
    if (requestSize > maxRequestSizeBytes) {
      return errorResponse(413, "UPLOAD_TOO_LARGE", "Image must be 10 MB or smaller.");
    }
  }

  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    return errorResponse(415, "UNSUPPORTED_REQUEST", "Use multipart form data.");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(400, "INVALID_FORM_DATA", "Could not read the upload form.");
  }

  const metadataResult = uploadMetadataSchema.safeParse({
    ownerType: field(formData, "ownerType"),
    ownerId: field(formData, "ownerId"),
    kind: field(formData, "kind"),
    creator: field(formData, "creator"),
    provenance: field(formData, "provenance"),
    license: field(formData, "license"),
    attribution: field(formData, "attribution"),
    usageTerms: field(formData, "usageTerms"),
    altText: field(formData, "altText"),
  });
  if (!metadataResult.success) {
    return errorResponse(
      400,
      "INVALID_IMAGE_METADATA",
      "Provide valid image credits and the target content ID.",
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse(400, "IMAGE_REQUIRED", "Select an image to upload.");
  }
  if (file.size === 0) {
    return errorResponse(400, "EMPTY_IMAGE", "The selected image is empty.");
  }
  if (file.size > maxImageSizeBytes) {
    return errorResponse(413, "UPLOAD_TOO_LARGE", "Image must be 10 MB or smaller.");
  }

  const metadata = metadataResult.data;
  if (!(await targetExists(metadata.ownerType, metadata.ownerId))) {
    return errorResponse(404, "CONTENT_NOT_FOUND", "Target content was not found.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = await fileTypeFromBuffer(bytes);
  if (
    !detectedType ||
    !isImageContentType(detectedType.mime) ||
    detectedType.mime !== file.type
  ) {
    return errorResponse(
      415,
      "UNSUPPORTED_IMAGE",
      "Use a valid JPEG, PNG, WebP, or AVIF image.",
    );
  }

  const key = createImageObjectKey(
    supportedImageOwners[metadata.ownerType],
    detectedType.mime,
  );
  await uploadImage({ key, bytes, contentType: detectedType.mime });

  try {
    const url = await createSignedImageUrl(key);
    const image = await createImageRecord(metadata, key, session.user.id);

    return Response.json(
      { data: { id: image.id, key, url } },
      { status: 201 },
    );
  } catch (error) {
    try {
      await deleteImage(key);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Image upload failed and its object could not be removed.",
      );
    }
    throw error;
  }
}
