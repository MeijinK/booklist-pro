import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { BookDraft } from "@/domain";
import { createBook } from "@/services/api/books";
import { bookKeys } from "@/services/queryKeys";

/**
 * Creation of a book.
 *
 * Every list is expired, without exception: the server is what sorts and
 * paginates, so nothing lets us guess under which filters nor on which page the
 * new book will appear.
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
