import { z } from "zod";

/** Valeurs de `limit` acceptees par GET /books ; le serveur plafonne au-dela. */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Enveloppe paginee renvoyee par GET /books.
 *
 * Fabrique plutot que schema fige : les notes de lecture du lot 2 seront
 * paginees de la meme facon, avec un autre type d'element.
 */
export function pageSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  });
}

export type Page<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
