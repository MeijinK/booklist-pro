import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { BookDraft } from "@/domain";
import { replaceBook } from "@/services/api/livres";
import { bookKeys } from "@/services/queryKeys";

export type UpdateBookInput = {
  draft: BookDraft;
  /** Version lue sur la fiche chargee ; part en If-Match pour detecter un conflit. */
  version: number;
};

/**
 * Modification d'un ouvrage.
 *
 * Le serveur renvoie la fiche a jour : on l'ecrit directement dans le cache
 * plutot que de la redemander. Les listes, elles, sont invalidees — modifier un
 * titre deplace l'ouvrage dans le tri, donc potentiellement de page.
 *
 * Un 409 remonte tel quel sous forme de ConflictError, porteur de la fiche
 * serveur. L'arbitrage n'est pas fait ici : c'est le sujet du lot 4.
 */
export function useUpdateBook(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ draft, version }: UpdateBookInput) => replaceBook(id, draft, version),
    onSuccess: (book) => {
      queryClient.setQueryData(bookKeys.detail(book.id), book);
      return queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
  });
}
