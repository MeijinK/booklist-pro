import { useInfiniteQuery } from "@tanstack/react-query";

import { normalizeFilters, type BookFilters } from "@/domain";
import { listBooks } from "@/services/api/livres";
import { bookKeys } from "@/services/queryKeys";

/**
 * Liste paginee du fonds. La pagination est consommee page par page : l'ecran
 * ne charge jamais les 500 ouvrages d'un coup.
 *
 * useInfiniteQuery des le lot 1 plutot que useQuery : le lot 2 exige un
 * indicateur de chargement de la page suivante distinct du chargement initial,
 * ce que `isFetchingNextPage` donne directement.
 */
export function useBooks(filters: BookFilters = {}) {
  const normalized = normalizeFilters(filters);

  return useInfiniteQuery({
    queryKey: bookKeys.list(normalized),
    queryFn: ({ pageParam, signal }) => listBooks({ ...normalized, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });
}
