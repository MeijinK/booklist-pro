import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { BookDraft } from "@/domain";
import { replaceBook } from "@/services/api/books";
import { bookKeys } from "@/services/queryKeys";

export type UpdateBookInput = {
  draft: BookDraft;
  /** Version read on the loaded record; goes out as If-Match to detect a conflict. */
  version: number;
};

/**
 * Update of a book.
 *
 * The server returns the up-to-date record: we write it straight into the cache
 * rather than asking for it again. The lists, on the other hand, are
 * invalidated — changing a title moves the book within the sort order, hence
 * potentially onto another page.
 *
 * A 409 bubbles up as is in the form of a ConflictError carrying the server
 * record. Arbitration is not done here: that is the subject of batch 4.
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
