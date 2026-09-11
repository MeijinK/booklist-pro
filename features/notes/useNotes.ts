import { useQuery } from "@tanstack/react-query";

import { estIdLocal, sortNotes } from "@/domain";
import { useIdReel } from "@/features/sync/useIdReel";
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
 * added note sits where the server would have put it. A book still local has
 * no notes on the server: the query stays disabled and reads the cache.
 */
export function useNotes(bookId: string) {
  const reel = useIdReel(bookId);

  return useQuery({
    queryKey: noteKeys.all(reel),
    queryFn: ({ signal }) => listNotes(reel, signal),
    enabled: reel !== "" && !estIdLocal(reel),
    select: sortNotes,
  });
}
