import { normalizeFilters, type BookFilters } from "@/domain";

/**
 * The page does not enter the key: with useInfiniteQuery it is the `pageParam`,
 * not a cache discriminant. Leaving it in would make every page an independent
 * entry, and infinite scrolling would not work.
 */
function toCacheKey(filters: BookFilters): Omit<BookFilters, "page"> {
  const normalized = normalizeFilters(filters);

  return {
    limit: normalized.limit,
    q: normalized.q,
    status: normalized.status,
    favori: normalized.favori,
    auteur: normalized.auteur,
    sort: normalized.sort,
    order: normalized.order,
  };
}

/**
 * The single factory for cache keys: they are never written by hand inside a
 * hook.
 *
 * The hierarchy carries invalidation. `lists()` expires every list, whatever
 * the filters, without touching records already loaded — something a flat key
 * would not allow.
 */
export const bookKeys = {
  all: ["books"] as const,
  lists: () => [...bookKeys.all, "list"] as const,
  list: (filters: BookFilters) => [...bookKeys.lists(), toCacheKey(filters)] as const,
  details: () => [...bookKeys.all, "detail"] as const,
  detail: (id: string) => [...bookKeys.details(), id] as const,
};

/**
 * Notes live under their book, and not in a root `['notes', id]`.
 *
 * The hierarchy is what makes `bookKeys.all` expire a record together with its
 * notes: deleting a book must not leave its notes behind in the cache, ready to
 * be shown again the day another book reuses the screen.
 */
export const noteKeys = {
  all: (bookId: string) => [...bookKeys.detail(bookId), "notes"] as const,
};
