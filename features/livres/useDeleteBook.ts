import { useQueryClient, type InfiniteData, type QueryKey } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import type { Book, Page } from "@/domain";
import { deleteBook } from "@/services/api/livres";
import { cancel, isPending, schedule, UNDO_DELAY_MS } from "@/services/mutations";
import { bookKeys } from "@/services/queryKeys";

type ListData = InfiniteData<Page<Book>>;
type ListSnapshot = [QueryKey, ListData | undefined][];

/**
 * Suppression annulable pendant cinq secondes.
 *
 * Le clic retire l'ouvrage de l'affichage mais n'envoie rien : l'appel part a
 * la fin du delai, ou jamais si le libraire se ravise. Le minuteur vit dans
 * services/mutations, pas ici, pour survivre a la sortie de l'ecran.
 *
 * L'etat d'avant est conserve : une annulation le restitue immediatement, et un
 * echec de l'appel le restitue aussi — aucune fiche ne disparait en silence.
 */
export function useDeleteBook() {
  const queryClient = useQueryClient();
  const snapshots = useRef(new Map<string, ListSnapshot>());
  const [error, setError] = useState<unknown>(undefined);

  const restore = useCallback(
    (id: string) => {
      const snapshot = snapshots.current.get(id);
      snapshots.current.delete(id);

      if (snapshot === undefined) return;
      for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
    },
    [queryClient],
  );

  const scheduleDelete = useCallback(
    (id: string) => {
      setError(undefined);
      snapshots.current.set(id, queryClient.getQueriesData<ListData>({ queryKey: bookKeys.lists() }));

      // Retrait optimiste : l'ouvrage quitte l'ecran avant tout aller-retour.
      queryClient.setQueriesData<ListData>({ queryKey: bookKeys.lists() }, (data) =>
        data === undefined
          ? data
          : {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.filter((book) => book.id !== id),
              })),
            },
      );

      schedule({
        key: id,
        run: () => deleteBook(id),
        onSettled: (cause) => {
          if (cause !== undefined) {
            restore(id);
            setError(cause);
            return;
          }

          snapshots.current.delete(id);
          queryClient.removeQueries({ queryKey: bookKeys.detail(id) });
          void queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
        },
      });
    },
    [queryClient, restore],
  );

  const cancelDelete = useCallback(
    (id: string) => {
      if (!cancel(id)) return false;
      restore(id);
      return true;
    },
    [restore],
  );

  return {
    scheduleDelete,
    cancelDelete,
    isDeleting: isPending,
    undoDelayMs: UNDO_DELAY_MS,
    error,
  };
}
