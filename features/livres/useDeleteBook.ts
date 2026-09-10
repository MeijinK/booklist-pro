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
 *
 * `enAttente` rend le sursis observable par l'interface : c'est lui qui decide
 * l'affichage de la barre d'annulation, et sa disparition qui signale que
 * l'ouvrage est parti pour de bon.
 */
export type OptionsSuppression = {
  /** Appele quand la suppression est effectivement partie et acceptee. */
  onConfirme?: (id: string) => void;
};

export function useDeleteBook({ onConfirme }: OptionsSuppression = {}) {
  const queryClient = useQueryClient();
  const snapshots = useRef(new Map<string, ListSnapshot>());
  const [error, setError] = useState<unknown>(undefined);
  const [enAttente, setEnAttente] = useState<string | undefined>(undefined);

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
      setEnAttente(id);
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
          setEnAttente((courant) => (courant === id ? undefined : courant));

          if (cause !== undefined) {
            restore(id);
            setError(cause);
            return;
          }

          snapshots.current.delete(id);
          queryClient.removeQueries({ queryKey: bookKeys.detail(id) });
          void queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
          onConfirme?.(id);
        },
      });
    },
    [onConfirme, queryClient, restore],
  );

  const cancelDelete = useCallback(
    (id: string) => {
      if (!cancel(id)) return false;
      setEnAttente((courant) => (courant === id ? undefined : courant));
      restore(id);
      return true;
    },
    [restore],
  );

  return {
    scheduleDelete,
    cancelDelete,
    /** Identifiant de l'ouvrage dont le sursis court, s'il y en a un. */
    enAttente,
    isDeleting: isPending,
    undoDelayMs: UNDO_DELAY_MS,
    error,
  };
}
