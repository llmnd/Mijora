import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import { hasPermission } from "@/server/policies/permissions";

export const runtime = "nodejs";

const archiveSchema = z.object({
  contentType: z.enum(["dish", "recipe"]),
  contentId: z.string().trim().min(1).max(128),
  action: z.enum(["archive", "restore"]),
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
    return errorResponse(401, "UNAUTHENTICATED", "Connectez-vous pour gérer le contenu.");
  }
  if (!hasPermission(session.user.role, "editorial:edit")) {
    return errorResponse(403, "FORBIDDEN", "Vous ne pouvez pas gérer ce contenu.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Fournissez un corps JSON valide.");
  }

  const input = archiveSchema.safeParse(body);
  if (!input.success) {
    return errorResponse(400, "INVALID_ARCHIVE_ACTION", "Action d’archivage invalide.");
  }

  const { action, contentId, contentType } = input.data;
  const result = await prisma.$transaction(async (transaction) => {
    if (contentType === "dish") {
      const dish = await transaction.dish.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          name: true,
          status: true,
          recipes: {
            where: { status: { not: "ARCHIVED" } },
            select: { id: true, title: true, slug: true, status: true },
          },
        },
      });
      if (!dish) {
        return errorResponse(404, "CONTENT_NOT_FOUND", "Le plat est introuvable.");
      }

      if (action === "archive") {
        if (dish.status === "ARCHIVED") {
          return errorResponse(409, "ALREADY_ARCHIVED", "Ce plat est déjà archivé.");
        }

        const publishedRecipes = dish.recipes.filter(
          (recipe) => recipe.status === "PUBLISHED",
        );
        await transaction.dish.update({
          where: { id: dish.id },
          data: { status: "ARCHIVED", publishedAt: null },
        });
        await transaction.dishImage.updateMany({
          where: { dishId: dish.id, status: "PUBLISHED" },
          data: { status: "DRAFT" },
        });
        if (publishedRecipes.length) {
          const recipeIds = publishedRecipes.map((recipe) => recipe.id);
          await transaction.recipe.updateMany({
            where: { id: { in: recipeIds } },
            data: { status: "DRAFT", publishedAt: null },
          });
          await transaction.recipeImage.updateMany({
            where: {
              recipeId: { in: recipeIds },
              status: "PUBLISHED",
            },
            data: { status: "DRAFT" },
          });
        }
        await transaction.adminAuditLog.create({
          data: {
            actorId: session.user.id,
            action: "editorial.archive",
            targetType: "dish",
            targetId: dish.id,
            metadata: {
              name: dish.name,
              unpublishedRecipes: publishedRecipes.map(({ id, title }) => ({
                id,
                title,
              })),
            },
          },
        });

        return {
          id: dish.id,
          status: "ARCHIVED" as const,
          revalidatePaths: [
            "/",
            ...dish.recipes.map((recipe) => `/recettes/${recipe.slug}`),
          ],
        };
      }

      if (dish.status !== "ARCHIVED") {
        return errorResponse(409, "NOT_ARCHIVED", "Ce plat n’est pas archivé.");
      }

      await transaction.dish.update({
        where: { id: dish.id },
        data: { status: "DRAFT", publishedAt: null },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorId: session.user.id,
          action: "editorial.restore",
          targetType: "dish",
          targetId: dish.id,
          metadata: { name: dish.name, restoredAs: "DRAFT" },
        },
      });

      return {
        id: dish.id,
        status: "DRAFT" as const,
        revalidatePaths: [
          "/",
          ...dish.recipes.map((recipe) => `/recettes/${recipe.slug}`),
        ],
      };
    }

    const recipe = await transaction.recipe.findUnique({
      where: { id: contentId },
      select: { id: true, title: true, slug: true, status: true },
    });
    if (!recipe) {
      return errorResponse(404, "CONTENT_NOT_FOUND", "La recette est introuvable.");
    }

    if (action === "archive") {
      if (recipe.status === "ARCHIVED") {
        return errorResponse(409, "ALREADY_ARCHIVED", "Cette recette est déjà archivée.");
      }

      await transaction.recipe.update({
        where: { id: recipe.id },
        data: { status: "ARCHIVED", publishedAt: null },
      });
      await transaction.recipeImage.updateMany({
        where: { recipeId: recipe.id, status: "PUBLISHED" },
        data: { status: "DRAFT" },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorId: session.user.id,
          action: "editorial.archive",
          targetType: "recipe",
          targetId: recipe.id,
          metadata: { title: recipe.title },
        },
      });

      return {
        id: recipe.id,
        status: "ARCHIVED" as const,
        revalidatePaths: ["/", `/recettes/${recipe.slug}`],
      };
    }

    if (recipe.status !== "ARCHIVED") {
      return errorResponse(409, "NOT_ARCHIVED", "Cette recette n’est pas archivée.");
    }

    await transaction.recipe.update({
      where: { id: recipe.id },
      data: { status: "DRAFT", publishedAt: null },
    });
    await transaction.adminAuditLog.create({
      data: {
        actorId: session.user.id,
        action: "editorial.restore",
        targetType: "recipe",
        targetId: recipe.id,
        metadata: { title: recipe.title, restoredAs: "DRAFT" },
      },
    });

    return {
      id: recipe.id,
      status: "DRAFT" as const,
      revalidatePaths: ["/", `/recettes/${recipe.slug}`],
    };
  });

  if (result instanceof Response) {
    return result;
  }

  result.revalidatePaths.forEach((path) => revalidatePath(path));
  return Response.json({
    data: { id: result.id, status: result.status },
  });
}
