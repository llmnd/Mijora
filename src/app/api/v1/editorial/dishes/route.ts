import { z } from "zod";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slug";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import { hasPermission } from "@/server/policies/permissions";

export const runtime = "nodejs";

const createDishSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20).max(2000),
  sourceTitle: z.string().trim().min(2).max(200),
  sourceUrl: z.url().refine((value) => new URL(value).protocol === "https:"),
  sourceFact: z.string().trim().min(10).max(1000),
});

const updateDishSchema = z.object({
  id: z.string().trim().min(1).max(128),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20).max(2000),
});

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json({ error: { code, message } }, { status });
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

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return errorResponse(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed.");
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return errorResponse(401, "UNAUTHENTICATED", "Sign in to create editorial content.");
  }
  if (!hasPermission(session.user.role, "editorial:create")) {
    return errorResponse(403, "FORBIDDEN", "You cannot create editorial content.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Provide a valid JSON request body.");
  }

  const input = createDishSchema.safeParse(body);
  if (!input.success) {
    return errorResponse(400, "INVALID_DISH", "Vérifiez le plat et sa source.");
  }

  const data = input.data;
  const slug = slugify(data.name);
  if (!slug) {
    return errorResponse(400, "INVALID_DISH_NAME", "Le nom du plat est invalide.");
  }

  const existingDish = await prisma.dish.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existingDish) {
    return errorResponse(409, "DISH_ALREADY_EXISTS", "Un plat utilise déjà ce nom.");
  }

  const dish = await prisma.$transaction(async (transaction) => {
    const source = await transaction.contentSource.create({
      data: {
        title: data.sourceTitle,
        url: data.sourceUrl,
        consultedAt: new Date(),
      },
      select: { id: true },
    });

    return transaction.dish.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        languageCode: "fr",
        status: "DRAFT",
        createdById: session.user.id,
        sources: {
          create: {
            sourceId: source.id,
            fact: data.sourceFact,
          },
        },
      },
      select: { id: true, name: true, slug: true },
    });
  });

  return Response.json({ data: dish }, { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return errorResponse(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed.");
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return errorResponse(401, "UNAUTHENTICATED", "Sign in to edit editorial content.");
  }
  if (!hasPermission(session.user.role, "editorial:edit")) {
    return errorResponse(403, "FORBIDDEN", "You cannot edit editorial content.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Provide a valid JSON request body.");
  }

  const input = updateDishSchema.safeParse(body);
  if (!input.success) {
    return errorResponse(400, "INVALID_DISH", "Vérifiez le nom et la description du plat.");
  }

  const existingDish = await prisma.dish.findUnique({
    where: { id: input.data.id },
    select: { id: true },
  });
  if (!existingDish) {
    return errorResponse(404, "DISH_NOT_FOUND", "Le plat est introuvable.");
  }

  const dish = await prisma.dish.update({
    where: { id: input.data.id },
    data: { name: input.data.name, description: input.data.description },
    select: { id: true, name: true },
  });

  revalidatePath("/");
  revalidatePath("/editorial");
  return Response.json({ data: dish });
}
