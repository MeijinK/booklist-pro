import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Book, BookDraft, MutationLocale } from "@/domain";
import { insererLivre } from "@/services/sync/cache";
import { ajouterMutation } from "@/services/sync/file";
import { livreDepuisCreation, nouvelId, nouvelIdLocal } from "@/services/sync/mutation";
import { planifierSync } from "@/services/sync/synchroniser";

/**
 * Creation of a book: queued, shown at once under a local id, sent by the
 * synchroniser. The same path online and offline — a 503 from degraded mode
 * is then just a later retry with the same mutation id, never a duplicate.
 */
export function useCreateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: BookDraft): Promise<Book> => {
      const maintenant = new Date().toISOString();
      const mutation: MutationLocale = {
        id: nouvelId(),
        type: "create",
        creeLe: maintenant,
        livreId: nouvelIdLocal(),
        livre: draft,
      };
      const livre = livreDepuisCreation(mutation, maintenant);
      insererLivre(queryClient, livre);
      await ajouterMutation(mutation);
      planifierSync(queryClient);
      return livre;
    },
  });
}
