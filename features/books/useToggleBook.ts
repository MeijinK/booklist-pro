import { useMutation, useQueryClient, type InfiniteData, type QueryClient } from "@tanstack/react-query";

import type { Book, Page } from "@/domain";
import { patchBook } from "@/services/api/books";
import { bookKeys } from "@/services/queryKeys";

type ListData = InfiniteData<Page<Book>>;

/** What a bookseller changes without opening the form. */
export type BookToggleChanges = { favori: boolean } | { lu: boolean } | { note: number | null };

export type BookToggleInput = {
  id: string;
  changes: BookToggleChanges;
};

/** Says which refusal to report, so the message names what came back. */
export function toggleRefusalMessage(changes: BookToggleChanges): string {
  const action = refusedAction(changes);
  return `Le serveur a refuse ${action}. La fiche est revenue a son etat precedent.`;
}

function refusedAction(changes: BookToggleChanges): string {
  if ("favori" in changes) return "ce coup de coeur";
  if ("note" in changes) return "cette note";
  return "ce changement de statut";
}

/** Applies a change to the record and to every list holding the book. */
function writeBook(queryClient: QueryClient, id: string, update: (book: Book) => Book): void {
  queryClient.setQueriesData<ListData>({ queryKey: bookKeys.lists() }, (data) =>
    data === undefined
      ? data
      : {
          ...data,
          // A page that does not hold the book keeps its reference: the rows it
          // renders are then skipped by React.memo instead of being redrawn.
          pages: data.pages.map((page) =>
            page.items.some((book) => book.id === id)
              ? { ...page, items: page.items.map((book) => (book.id === id ? update(book) : book)) }
              : page,
          ),
        },
  );

  queryClient.setQueryData<Book>(bookKeys.detail(id), (book) =>
    book === undefined ? book : update(book),
  );
}

/**
 * Coup de coeur and read status, applied before the round trip.
 *
 * The bookseller taps the heart with a customer in front of them: the state
 * flips on the spot, and the request follows. If the server refuses, the
 * previous state comes back and the refusal is said out loud. Nothing is left
 * to a spinner, and nothing is silently lost.
 *
 * No If-Match here, where the form's PUT carries one. The difference is
 * intentional: PUT sends the whole representation and would overwrite a
 * colleague's correction, so it has to be arbitrated. A PATCH on one boolean
 * expresses an intention that no title correction contradicts, and a 409 would
 * only produce a refusal the bookseller could do nothing about.
 */
export function useToggleBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: BookToggleInput) => patchBook(id, changes),

    onMutate: async ({ id, changes }) => {
      // Cancel the reads that could land on top of our write. The record is
      // cancelled exactly, so the notes attached under its key keep loading.
      await queryClient.cancelQueries({ queryKey: bookKeys.lists() });
      await queryClient.cancelQueries({ queryKey: bookKeys.detail(id), exact: true });

      const lists = queryClient.getQueriesData<ListData>({ queryKey: bookKeys.lists() });
      const detail = queryClient.getQueryData<Book>(bookKeys.detail(id));

      writeBook(queryClient, id, (book) => ({ ...book, ...changes }));

      return { lists, detail, id };
    },

    onError: (_error, _input, context) => {
      if (context === undefined) return;
      for (const [key, data] of context.lists) queryClient.setQueryData(key, data);
      queryClient.setQueryData(bookKeys.detail(context.id), context.detail);
    },

    onSuccess: (saved) => {
      // The server answers with the record, version included: writing it back
      // keeps the form's next PUT from departing with a stale version.
      writeBook(queryClient, saved.id, () => saved);

      // Lists are marked stale but not refetched. A refetch here would reorder
      // or drop the row the bookseller has their finger on, under a "coups de
      // coeur" filter they have just left. The next visit reads it fresh.
      void queryClient.invalidateQueries({ queryKey: bookKeys.lists(), refetchType: "none" });
    },
  });
}
