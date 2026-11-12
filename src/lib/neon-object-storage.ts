import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const imageExtensions = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const imageOwners = ["dishes", "ingredients", "recipes"] as const;
const signedUrlLifetimeSeconds = 15 * 60;
const objectKeyPattern =
  /^(dishes|ingredients|recipes)\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(avif|jpg|png|webp)$/;

export type ImageOwner = (typeof imageOwners)[number];
export type ImageContentType = keyof typeof imageExtensions;

let client: S3Client | undefined;

export function isImageContentType(
  contentType: string,
): contentType is ImageContentType {
  return Object.hasOwn(imageExtensions, contentType);
}

function getClient(): S3Client {
  if (client) {
    return client;
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const endpointUrl = process.env.AWS_ENDPOINT_URL_S3?.trim();
  const region = process.env.AWS_REGION?.trim();
  if (!accessKeyId || !secretAccessKey || !endpointUrl || !region) {
    const required = {
      AWS_ACCESS_KEY_ID: accessKeyId,
      AWS_SECRET_ACCESS_KEY: secretAccessKey,
      AWS_ENDPOINT_URL_S3: endpointUrl,
      AWS_REGION: region,
    };
    const missing = Object.entries(required)
      .filter(([, value]) => !value)
      .map(([name]) => name);
    throw new Error(
      `Neon Object Storage is not configured; missing ${missing.join(", ")}.`,
    );
  }

  const endpoint = new URL(endpointUrl);
  if (endpoint.protocol !== "https:") {
    throw new Error("Neon Object Storage endpoint must use HTTPS.");
  }

  client = new S3Client({
    region,
    endpoint: endpoint.toString(),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });

  return client;
}

function assertImageObjectKey(key: string): string {
  if (!objectKeyPattern.test(key)) {
    throw new Error("Invalid Neon image object key.");
  }

  return key;
}

function getBucketName(): string {
  return process.env.NEON_STORAGE_BUCKET?.trim() || "assets";
}

export function createImageObjectKey(
  owner: ImageOwner,
  contentType: string,
): string {
  if (!imageOwners.includes(owner)) {
    throw new Error("Unsupported image owner.");
  }

  if (!isImageContentType(contentType)) {
    throw new Error("Unsupported image content type.");
  }

  const extension = imageExtensions[contentType];
  return `${owner}/${randomUUID()}.${extension}`;
}

export async function uploadImage(input: {
  key: string;
  bytes: Uint8Array;
  contentType: ImageContentType;
}): Promise<void> {
  const key = assertImageObjectKey(input.key);
  if (input.bytes.byteLength === 0) {
    throw new Error("Image content must not be empty.");
  }
  if (!key.endsWith(`.${imageExtensions[input.contentType]}`)) {
    throw new Error("Image object key extension must match its content type.");
  }

  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: input.bytes,
      ContentType: input.contentType,
      CacheControl: `private, max-age=${signedUrlLifetimeSeconds}`,
    }),
  );
}

export async function createSignedImageUrl(key: string): Promise<string> {
  const imageKey = assertImageObjectKey(key);

  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: getBucketName(),
      Key: imageKey,
    }),
    { expiresIn: signedUrlLifetimeSeconds },
  );
}

export async function deleteImage(key: string): Promise<void> {
  const imageKey = assertImageObjectKey(key);

  await getClient().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: imageKey,
    }),
  );
}
