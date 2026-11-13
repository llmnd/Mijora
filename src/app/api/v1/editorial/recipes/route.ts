import { z } from "zod";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/slug";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/client";
import { hasPermission } from "@/server/policies/permissions";

export const runtime = "nodejs";

const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  amount: z.string().trim().max(80).optional(),
});

const createRecipeSchema = z.object({
  dishId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(20).max(2000),
  servings: z.number().int().positive().max(100),
  preparationTimeMinutes: z.number().int().positive().max(1440).optional(),
  cookingTimeMinutes: z.number().int().positive().max(1440).optional(),
  ingredients: z.array(ingredientSchema).min(1).max(50),
  steps: z.array(z.string().trim().min(5).max(2000)).min(1).max(80),
  sourceTitle: z.string().trim().min(2).max(200),
  sourceUrl: z.url().refine((value) => new URL(value).protocol === "https:"),
  sourceFact: z.string().trim().min(10).max(1000),
}).superRefine((recipe, context) => {
  const ingredientSlugs = new Set<string>();
  for (const [index, ingredient] of recipe.ingredients.entries()) {
    const slug = slugify(ingredient.name);
    if (!slug || ingredientSlugs.has(slug)) {
      context.addIssue({
        code: "custom",
        message: "Chaque ingrédient doit avoir un nom unique.",
        path: ["ingredients", index, "name"],
      });
    }
    ingredientSlugs.add(slug);
  }
});

const updateRecipeSchema = z.object({
  id: z.string().trim().min(1).max(128),
  title: z.string().trim().min(2).max(160),
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
    return errorResponse(401, "UNAUTHENTICATED", "Connectez-vous pour créer une recette.");
  }
  if (!hasPermission(session.user.role, "editorial:create")) {
    return errorResponse(403, "FORBIDDEN", "Vous ne pouvez pas créer de recette.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Fournissez un corps JSON valide.");
  }

  const input = createRecipeSchema.safeParse(body);
  if (!input.success) {
    return errorResponse(400, "INVALID_RECIPE", "Vérifiez les informations de la recette.");
  }

  const data = input.data;
  const slug = slugify(data.title);
  if (!slug) {
    return errorResponse(400, "INVALID_RECIPE_TITLE", "Le titre de la recette est invalide.");
  }

  const [dish, existingRecipe] = await Promise.all([
    prisma.dish.findUnique({
      where: { id: data.dishId },
      select: { id: true },
    }),
    prisma.recipe.findUnique({
      where: { slug },
      select: { id: true },
    }),
  ]);
  if (!dish) {
    return errorResponse(404, "DISH_NOT_FOUND", "Le plat associé est introuvable.");
  }
  if (existingRecipe) {
    return errorResponse(409, "RECIPE_ALREADY_EXISTS", "Une recette utilise déjà ce titre.");
  }

  const recipe = await prisma.$transaction(async (transaction) => {
    const source = await transaction.contentSource.create({
      data: {
        title: data.sourceTitle,
        url: data.sourceUrl,
        consultedAt: new Date(),
      },
      select: { id: true },
    });

    const ingredients = await Promise.all(
      data.ingredients.map(async (ingredient) => {
        const ingredientSlug = slugify(ingredient.name);
        const record = await transaction.ingredient.upsert({
          where: { slug: ingredientSlug },
          create: {
            name: ingredient.name,
            slug: ingredientSlug,
            createdById: session.user.id,
          },
          update: {},
          select: { id: true },
        });

        return { id: record.id, amount: ingredient.amount || null };
      }),
    );

    return transaction.recipe.create({
      data: {
        dishId: data.dishId,
        title: data.title,
        slug,
        description: data.description,
        servings: data.servings,
        preparationTimeMinutes: data.preparationTimeMinutes,
        cookingTimeMinutes: data.cookingTimeMinutes,
        createdById: session.user.id,
        status: "DRAFT",
        sources: {
          create: {
            sourceId: source.id,
            fact: data.sourceFact,
          },
        },
        ingredients: {
          create: ingredients.map((ingredient, position) => ({
            position,
            notes: ingredient.amount,
            ingredient: { connect: { id: ingredient.id } },
          })),
        },
        steps: {
          create: data.steps.map((instruction, position) => ({
            position,
            instruction,
          })),
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        dishId: true,
      },
    });
  });

  return Response.json({ data: recipe }, { status: 201 });
}

export async function PATCH(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return errorResponse(403, "ORIGIN_NOT_ALLOWED", "Request origin is not allowed.");
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return errorResponse(401, "UNAUTHENTICATED", "Connectez-vous pour modifier le contenu.");
  }
  if (!hasPermission(session.user.role, "editorial:edit")) {
    return errorResponse(403, "FORBIDDEN", "Vous ne pouvez pas modifier ce contenu.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Fournissez un corps JSON valide.");
  }

  const input = updateRecipeSchema.safeParse(body);
  if (!input.success) {
    return errorResponse(
      400,
      "INVALID_RECIPE",
      "Vérifiez le titre et la description de la recette.",
    );
  }

  const existingRecipe = await prisma.recipe.findUnique({
    where: { id: input.data.id },
    select: { id: true, slug: true, status: true },
  });
  if (!existingRecipe) {
    return errorResponse(404, "RECIPE_NOT_FOUND", "La recette est introuvable.");
  }

  const recipe = await prisma.recipe.update({
    where: { id: input.data.id },
    data: { title: input.data.title, description: input.data.description },
    select: { id: true, title: true },
  });

  revalidatePath("/");
  revalidatePath("/editorial");
  if (existingRecipe.status === "PUBLISHED") {
    revalidatePath(`/recettes/${existingRecipe.slug}`);
  }
  return Response.json({ data: recipe });
}
