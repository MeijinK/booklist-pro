import { useQuery } from "@tanstack/react-query";

import { sortNotes } from "@/domain";
import { listNotes } from "@/services/api/notes";
import { noteKeys } from "@/services/queryKeys";

/**
 * Reading notes attached to a book.
 *
 * A separate query from the record rather than a field of it: the notes are
 * written far more often than the book, and merging them would make every added
 * note invalidate a record that has not changed.
 *
 * The order is re-established at read time by `select`, so an optimistically
 * added note sits where the server would have put it.
 */
export function useNotes(bookId: string) {
  return useQuery({
    queryKey: noteKeys.all(bookId),
    queryFn: ({ signal }) => listNotes(bookId, signal),
    enabled: bookId !== "",
    select: sortNotes,
  });
}
