import { useQueryClient, type InfiniteData, type QueryKey } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import type { Book, Page } from "@/domain";
import { deleteBook } from "@/services/api/books";
import { cancel, isPending, schedule, UNDO_DELAY_MS } from "@/services/mutations";
import { bookKeys } from "@/services/queryKeys";

type ListData = InfiniteData<Page<Book>>;
type ListSnapshot = [QueryKey, ListData | undefined][];

/**
 * Deletion that can be undone for five seconds.
 *
 * The click removes the book from the display but sends nothing: the call
 * departs at the end of the delay, or never if the bookseller changes their
 * mind. The timer lives in services/mutations, not here, so it survives leaving
 * the screen.
 *
 * The previous state is kept: an undo restores it immediately, and a failed
 * call restores it too — no record disappears silently.
 *
 * `pendingId` makes the grace period observable by the interface: it is what
 * decides whether the undo bar is displayed, and its disappearance is what
 * signals the book is gone for good.
 */
export type DeleteBookOptions = {
  /** Called when the deletion has actually departed and been accepted. */
  onDeleted?: (id: string) => void;
};

export function useDeleteBook({ onDeleted }: DeleteBookOptions = {}) {
  const queryClient = useQueryClient();
  const snapshots = useRef(new Map<string, ListSnapshot>());
  const [error, setError] = useState<unknown>(undefined);
  const [pendingId, setPendingId] = useState<string | undefined>(undefined);

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
      setPendingId(id);
      snapshots.current.set(
        id,
        queryClient.getQueriesData<ListData>({ queryKey: bookKeys.lists() }),
      );

      // Optimistic removal: the book leaves the screen before any round trip.
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
          setPendingId((current) => (current === id ? undefined : current));

          if (cause !== undefined) {
            restore(id);
            setError(cause);
            return;
          }

          snapshots.current.delete(id);
          queryClient.removeQueries({ queryKey: bookKeys.detail(id) });
          void queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
          onDeleted?.(id);
        },
      });
    },
    [onDeleted, queryClient, restore],
  );

  const cancelDelete = useCallback(
    (id: string) => {
      if (!cancel(id)) return false;
      setPendingId((current) => (current === id ? undefined : current));
      restore(id);
      return true;
    },
    [restore],
  );

  return {
    scheduleDelete,
    cancelDelete,
    /** Identifier of the book whose grace period is running, if there is one. */
    pendingId,
    isDeleting: isPending,
    undoDelayMs: UNDO_DELAY_MS,
    error,
  };
}
