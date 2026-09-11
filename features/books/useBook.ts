import { useQuery, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";

import { estIdLocal, type Book, type Page } from "@/domain";
import { useIdReel } from "@/features/sync/useIdReel";
import { getBook } from "@/services/api/books";
import { bookKeys } from "@/services/queryKeys";

type ListData = InfiniteData<Page<Book>>;

/**
 * The row the list already holds for this book, with the moment it was read.
 * Opening a record from the list then shows it at once — and still shows it
 * with the network down, which is the whole point of a cached list.
 */
function depuisLesListes(qc: QueryClient, id: string): { livre: Book; lu: number } | undefined {
  for (const [key, data] of qc.getQueriesData<ListData>({ queryKey: bookKeys.lists() })) {
    const livre = data?.pages.flatMap((page) => page.items).find((b) => b.id === id);
    if (livre !== undefined) return { livre, lu: qc.getQueryState(key)?.dataUpdatedAt ?? 0 };
  }
  return undefined;
}

/**
 * A single book record. A `local:` id has nothing to fetch: the record lives
 * in the cache, written at creation, and the query is left disabled — TanStack
 * still serves cached data for a disabled query. `enabled` also guards a route
 * parameter that is not resolved yet.
 */
export function useBook(id: string) {
  const reel = useIdReel(id);
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: bookKeys.detail(reel),
    queryFn: ({ signal }) => getBook(reel, signal),
    enabled: reel !== "" && !estIdLocal(reel),
    initialData: () => depuisLesListes(queryClient, reel)?.livre,
    initialDataUpdatedAt: () => depuisLesListes(queryClient, reel)?.lu,
  });
}
