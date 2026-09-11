import { useMutation, useQueryClient } from "@tanstack/react-query";

import { LOCAL_ID_PREFIX, type MutationLocale, type Note, type NoteDraft } from "@/domain";
import { insererNote } from "@/services/sync/cache";
import { ajouterMutation } from "@/services/sync/file";
import { noteDepuisMutation, nouvelId } from "@/services/sync/mutation";
import { planifierSync } from "@/services/sync/synchroniser";

export { LOCAL_ID_PREFIX };

/** A note still waiting for its server identifier. */
export function isLocalNote(note: Note): boolean {
  return note.id.startsWith(LOCAL_ID_PREFIX);
}

/**
 * Writing a reading note: queued and shown at once, marked as sending until
 * the synchroniser replaces it with the recorded one. Cutting the network in
 * the middle changes nothing for the bookseller: the note is on disk.
 */
export function useCreateNote(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: NoteDraft): Promise<Note> => {
      const mutation: MutationLocale = {
        id: nouvelId(),
        type: "note",
        creeLe: new Date().toISOString(),
        livreId: bookId,
        contenu: draft.contenu,
      };
      const note = noteDepuisMutation(mutation);
      insererNote(queryClient, bookId, note);
      await ajouterMutation(mutation);
      planifierSync(queryClient);
      return note;
    },
  });
}
