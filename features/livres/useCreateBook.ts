import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { BookDraft } from "@/domain";
import { createBook } from "@/services/api/livres";
import { bookKeys } from "@/services/queryKeys";

/**
 * Creation d'un ouvrage.
 *
 * Toutes les listes sont perimees, sans exception : c'est le serveur qui trie
 * et pagine, donc rien ne permet de deviner sous quels filtres ni sur quelle
 * page le nouvel ouvrage apparaitra.
 */
export function useCreateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: BookDraft) => createBook(draft),
    onSuccess: (book) => {
      queryClient.setQueryData(bookKeys.detail(book.id), book);
      return queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
  });
}
