import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteBook } from "@/services/api/livres";
import { bookKeys } from "@/services/queryKeys";

/**
 * Suppression d'un ouvrage.
 *
 * Suppression immediate pour l'instant. L'annulation pendant cinq secondes
 * exigee au lot 1 arrive avec la file de mutations : le clic deposera une
 * mutation a depart differe au lieu d'appeler la route tout de suite, et
 * l'interface n'aura pas a changer.
 */
export function useDeleteBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBook(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: bookKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
  });
}
