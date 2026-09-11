import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ecrireLivre } from "@/services/sync/cache";
import { ajouterMutation } from "@/services/sync/file";
import { nouvelId } from "@/services/sync/mutation";
import { planifierSync } from "@/services/sync/synchroniser";

/** What a bookseller changes without opening the form. */
export type BookToggleChanges = { favori: boolean } | { lu: boolean } | { note: number | null };

export type BookToggleInput = {
  id: string;
  changes: BookToggleChanges;
};

/**
 * Coup de coeur, read status and rating: applied on the spot, queued without
 * a version. A change to one field expresses an intention that no title
 * correction contradicts; asking the server to check the version would only
 * produce conflicts the bookseller could do nothing about.
 *
 * Nothing here can be refused any more: the queue is local, and the server's
 * answer — if it ever refuses — comes back through the conflict store.
 */
export function useToggleBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, changes }: BookToggleInput) => {
      ecrireLivre(queryClient, id, (book) => ({ ...book, ...changes }));
      await ajouterMutation({
        id: nouvelId(),
        type: "update",
        creeLe: new Date().toISOString(),
        livreId: id,
        champs: changes,
      });
      planifierSync(queryClient);
    },
  });
}
