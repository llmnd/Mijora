import { z } from "zod";

export const publicSearchQuerySchema = z.string().trim().min(2).max(80);

const publicDishSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.url().nullable(),
  imageAlt: z.string(),
});

const publicRecipeSearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  dishName: z.string(),
  imageUrl: z.url().nullable(),
  imageAlt: z.string(),
});

export const publicSearchResponseSchema = z.object({
  data: z.object({
    dishes: z.array(publicDishSearchResultSchema).max(6),
    recipes: z.array(publicRecipeSearchResultSchema).max(6),
  }),
});

export const publicSearchErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type PublicSearchResponse = z.infer<typeof publicSearchResponseSchema>;
