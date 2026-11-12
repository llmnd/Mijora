import { z } from "zod";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import { hasPermission } from "@/server/policies/permissions";

export const runtime = "nodejs";

const publishSchema = z.object({
  contentType: z.enum(["dish", "recipe"]),
  contentId: z.string().trim().min(1).max(128),
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
    return errorResponse(401, "UNAUTHENTICATED", "Connectez-vous pour publier.");
  }
  if (!hasPermission(session.user.role, "editorial:publish")) {
    return errorResponse(403, "FORBIDDEN", "La publication est réservée aux administrateurs.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Fournissez un corps JSON valide.");
  }

  const input = publishSchema.safeParse(body);
  if (!input.success) {
    return errorResponse(400, "INVALID_PUBLICATION", "Contenu à publier invalide.");
  }

  const { contentType, contentId } = input.data;
  const result = await prisma.$transaction(async (transaction) => {
    if (contentType === "dish") {
      const dish = await transaction.dish.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          name: true,
          status: true,
          description: true,
          sources: { select: { sourceId: true }, take: 1 },
        },
      });
      if (!dish) {
        return errorResponse(404, "CONTENT_NOT_FOUND", "Le plat est introuvable.");
      }
      if (dish.status === "PUBLISHED") {
        return errorResponse(409, "ALREADY_PUBLISHED", "Ce plat est déjà publié.");
      }
      if (dish.status === "ARCHIVED" || !dish.description?.trim() || !dish.sources.length) {
        return errorResponse(
          409,
          "CONTENT_NOT_READY",
          "Un plat archivé, sans description ou sans source ne peut pas être publié.",
        );
      }

      await transaction.dish.update({
        where: { id: dish.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
      await transaction.dishImage.updateMany({
        where: {
          dishId: dish.id,
          status: { in: ["DRAFT", "PENDING_REVIEW", "APPROVED"] },
        },
        data: { status: "PUBLISHED" },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorId: session.user.id,
          action: "editorial.publish",
          targetType: "dish",
          targetId: dish.id,
          metadata: { name: dish.name },
        },
      });

      return { id: dish.id, status: "PUBLISHED" as const };
    }

    const recipe = await transaction.recipe.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        title: true,
        status: true,
        description: true,
        dish: { select: { status: true } },
        sources: { select: { sourceId: true }, take: 1 },
        ingredients: { select: { ingredientId: true }, take: 1 },
        steps: { select: { id: true }, take: 1 },
      },
    });
    if (!recipe) {
      return errorResponse(404, "CONTENT_NOT_FOUND", "La recette est introuvable.");
    }
    if (recipe.status === "PUBLISHED") {
      return errorResponse(409, "ALREADY_PUBLISHED", "Cette recette est déjà publiée.");
    }
    if (
      recipe.status === "ARCHIVED" ||
      !recipe.description?.trim() ||
      recipe.dish.status !== "PUBLISHED" ||
      !recipe.sources.length ||
      !recipe.ingredients.length ||
      !recipe.steps.length
    ) {
      return errorResponse(
        409,
        "CONTENT_NOT_READY",
        "Publiez d’abord le plat associé et vérifiez la description, la source, les ingrédients et les étapes.",
      );
    }

    await transaction.recipe.update({
      where: { id: recipe.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    await transaction.recipeImage.updateMany({
      where: {
        recipeId: recipe.id,
        status: { in: ["DRAFT", "PENDING_REVIEW", "APPROVED"] },
      },
      data: { status: "PUBLISHED" },
    });
    await transaction.adminAuditLog.create({
      data: {
        actorId: session.user.id,
        action: "editorial.publish",
        targetType: "recipe",
        targetId: recipe.id,
        metadata: { title: recipe.title },
      },
    });

    return { id: recipe.id, status: "PUBLISHED" as const };
  });

  if (result instanceof Response) {
    return result;
  }

  return Response.json({ data: result });
}
