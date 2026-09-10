import { useQuery } from "@tanstack/react-query";

import { getBook } from "@/services/api/books";
import { bookKeys } from "@/services/queryKeys";

/**
 * A single book record. `enabled` guards the case where the identifier comes
 * from a route parameter that is not resolved yet.
 */
export function useBook(id: string) {
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: ({ signal }) => getBook(id, signal),
    enabled: id !== "",
  });
}
