import { createSignedImageUrl } from "@/lib/neon-object-storage";
import { publicSearchQuerySchema } from "@/features/search/contracts";
import { prisma } from "@/server/db/client";

export const runtime = "nodejs";

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const parsedQuery = publicSearchQuerySchema.safeParse(query);

  if (!parsedQuery.success) {
    return errorResponse(
      400,
      "INVALID_QUERY",
      "Query must be between 2 and 80 characters.",
    );
  }

  const searchTerm = parsedQuery.data;
  const [dishes, recipes] = await Promise.all([
    prisma.dish.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { description: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        images: {
          where: { status: "PUBLISHED" },
          orderBy: [{ position: "asc" }, { createdAt: "desc" }],
          take: 1,
          select: { storageKey: true, altText: true },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.recipe.findMany({
      where: {
        status: "PUBLISHED",
        dish: { status: "PUBLISHED" },
        OR: [
          { title: { contains: searchTerm, mode: "insensitive" } },
          { description: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        dish: { select: { name: true } },
        images: {
          where: { status: "PUBLISHED" },
          orderBy: [{ position: "asc" }, { createdAt: "desc" }],
          take: 1,
          select: { storageKey: true, altText: true },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
  ]);

  const [dishResults, recipeResults] = await Promise.all([
    Promise.all(
      dishes.map(async (dish) => {
        const image = dish.images[0];
        return {
          id: dish.id,
          name: dish.name,
          slug: dish.slug,
          description: dish.description,
          imageUrl: image ? await createSignedImageUrl(image.storageKey) : null,
          imageAlt: image?.altText ?? dish.name,
        };
      }),
    ),
    Promise.all(
      recipes.map(async (recipe) => {
        const image = recipe.images[0];
        return {
          id: recipe.id,
          title: recipe.title,
          slug: recipe.slug,
          description: recipe.description,
          dishName: recipe.dish.name,
          imageUrl: image ? await createSignedImageUrl(image.storageKey) : null,
          imageAlt: image?.altText ?? recipe.title,
        };
      }),
    ),
  ]);

  return Response.json({ data: { dishes: dishResults, recipes: recipeResults } });
}
