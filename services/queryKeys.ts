import { normalizeFilters, type BookFilters } from "@/domain";

/**
 * La page n'entre pas dans la cle : avec useInfiniteQuery elle est le
 * `pageParam`, pas un discriminant de cache. L'y laisser ferait de chaque page
 * une entree independante, et le defilement infini ne fonctionnerait pas.
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
 * Fabrique unique des cles de cache : elles ne s'ecrivent jamais a la main
 * dans un hook.
 *
 * La hierarchie porte l'invalidation. `lists()` perime toutes les listes, quels
 * que soient les filtres, sans toucher aux fiches deja chargees — ce qu'une
 * cle plate ne permettrait pas.
 */
export const bookKeys = {
  all: ["books"] as const,
  lists: () => [...bookKeys.all, "list"] as const,
  list: (filters: BookFilters) => [...bookKeys.lists(), toCacheKey(filters)] as const,
  details: () => [...bookKeys.all, "detail"] as const,
  detail: (id: string) => [...bookKeys.details(), id] as const,
};
