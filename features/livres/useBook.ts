import { useQuery } from "@tanstack/react-query";

import { getBook } from "@/services/api/livres";
import { bookKeys } from "@/services/queryKeys";

/**
 * Fiche d'un ouvrage. `enabled` protege le cas ou l'identifiant vient d'un
 * parametre de route pas encore resolu.
 */
export function useBook(id: string) {
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: ({ signal }) => getBook(id, signal),
    enabled: id !== "",
  });
}
