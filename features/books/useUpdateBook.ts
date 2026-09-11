import { useMutation, useQueryClient } from "@tanstack/react-query";

import { estIdLocal, type BookDraft } from "@/domain";
import { ecrireLivre } from "@/services/sync/cache";
import { ajouterMutation } from "@/services/sync/file";
import { nouvelId } from "@/services/sync/mutation";
import { planifierSync } from "@/services/sync/synchroniser";

export type UpdateBookInput = {
  draft: BookDraft;
  /** Version read on the loaded record; goes out as `baseVersion` to detect a conflict. */
  version: number;
};

/**
 * Correction of a record: queued with the version the bookseller saw. If a
 * colleague saved in the meantime, the sync brings back a conflict for the
 * merge screen instead of overwriting their work. A book still local has no
 * server version: the update folds into its creation.
 */
export function useUpdateBook(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draft, version }: UpdateBookInput) => {
      ecrireLivre(queryClient, id, (book) => ({ ...book, ...draft }));
      await ajouterMutation({
        id: nouvelId(),
        type: "update",
        creeLe: new Date().toISOString(),
        livreId: id,
        baseVersion: estIdLocal(id) ? undefined : version,
        champs: draft,
      });
      planifierSync(queryClient);
    },
  });
}
