import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Note, NoteDraft } from "@/domain";
import { createNote } from "@/services/api/notes";
import { noteKeys } from "@/services/queryKeys";

/** Distinguishes a note awaiting its server identifier from one that has it. */
export const LOCAL_NOTE_PREFIX = "local:";

export function isLocalNote(note: Note): boolean {
  return note.id.startsWith(LOCAL_NOTE_PREFIX);
}

/** Enough to tell two notes written in the same millisecond apart. */
let localSequence = 0;

/**
 * Writing a reading note.
 *
 * The note appears in the list before the round trip: the bookseller types
 * between two customers and must not wait on a shop connection to see what they
 * just wrote. The row stays marked as sending until the server confirms it,
 * then the temporary note is replaced by the recorded one, with its real
 * identifier and its server timestamp.
 *
 * A refusal puts the list back as it was and hands the text back to the caller,
 * which puts it back in the composer: rule no. 1 of the brief is that a
 * bookseller's input is never lost.
 */
export function useCreateNote(bookId: string) {
  const queryClient = useQueryClient();
  const key = noteKeys.all(bookId);

  return useMutation({
    mutationFn: (draft: NoteDraft) => createNote(bookId, draft),

    onMutate: async (draft) => {
      // An in-flight read would land after our insertion and erase it.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Note[]>(key);

      localSequence += 1;
      const optimistic: Note = {
        id: `${LOCAL_NOTE_PREFIX}${localSequence}`,
        livreId: bookId,
        contenu: draft.contenu,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Note[]>(key, (notes) => [optimistic, ...(notes ?? [])]);

      return { previous, optimisticId: optimistic.id };
    },

    onError: (_error, _draft, context) => {
      if (context === undefined) return;
      queryClient.setQueryData<Note[]>(key, context.previous);
    },

    onSuccess: (saved, _draft, context) => {
      queryClient.setQueryData<Note[]>(key, (notes) => {
        const settled = (notes ?? []).map((note) =>
          note.id === context?.optimisticId ? saved : note,
        );

        // The temporary note may have disappeared with a cache cleared in the
        // meantime. Dropping the recorded note here would hide a note the
        // server holds, until the next full read.
        return settled.some((note) => note.id === saved.id) ? settled : [saved, ...settled];
      });
    },
  });
}
