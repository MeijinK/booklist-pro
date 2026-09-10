import { z } from "zod";

/** `limit` values accepted by GET /books; the server caps anything beyond. */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Paginated envelope returned by GET /books.
 *
 * A factory rather than a frozen schema: batch 2's reading notes will be
 * paginated the same way, with a different item type.
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
