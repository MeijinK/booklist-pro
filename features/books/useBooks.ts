import { useInfiniteQuery } from "@tanstack/react-query";

import { normalizeFilters, type BookFilters } from "@/domain";
import { listBooks } from "@/services/api/books";
import { bookKeys } from "@/services/queryKeys";

/**
 * Paginated list of the collection. Pagination is consumed page by page: the
 * screen never loads all 500 books at once.
 *
 * useInfiniteQuery from batch 1 rather than useQuery: batch 2 requires a
 * next-page loading indicator distinct from the initial load, which
 * `isFetchingNextPage` gives directly.
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
