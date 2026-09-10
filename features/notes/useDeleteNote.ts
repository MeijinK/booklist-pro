import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Note } from "@/domain";
import { deleteNote } from "@/services/api/notes";
import { noteKeys } from "@/services/queryKeys";

/**
 * Deleting a reading note.
 *
 * Unlike deleting a book, which is confirmed then held back for five seconds,
 * this one leaves immediately: the note row asks for confirmation in place,
 * under the finger, and what is lost is one paragraph rather than a record and
 * everything attached to it. Two grace periods on the same screen would put two
 * undo bars in competition, and neither would be readable.
 *
 * The row disappears before the round trip, and comes back with its text intact
 * if the server refuses.
 */
export function useDeleteNote(bookId: string) {
  const queryClient = useQueryClient();
  const key = noteKeys.all(bookId);

  return useMutation({
    mutationFn: (noteId: string) => deleteNote(bookId, noteId),

    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Note[]>(key);

      queryClient.setQueryData<Note[]>(key, (notes) =>
        (notes ?? []).filter((note) => note.id !== noteId),
      );

      return { previous };
    },

    onError: (_error, _noteId, context) => {
      if (context === undefined) return;
      queryClient.setQueryData<Note[]>(key, context.previous);
    },
  });
}
