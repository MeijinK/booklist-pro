import type { QueryClient } from "@tanstack/react-query";

import type { Book, MutationLocale, Note } from "@/domain";
import { bookKeys, noteKeys } from "@/services/queryKeys";

import { ecrireLivre, insererLivre, insererNote, retirerLivre } from "./cache";
import { livreDepuisCreation, noteDepuisMutation } from "./mutation";

/**
 * Puts the queue back on screen after a reload.
 *
 * The cache and the queue are two stores written at two moments: a reload a
 * few hundred milliseconds after a note is typed may find the note in the
 * queue and not yet in the persisted cache. The queue is the truth about what
 * the bookseller meant; every pending intention is re-applied, idempotently,
 * before the first sync.
 */
export function rejouerLocalement(qc: QueryClient, file: readonly MutationLocale[]): void {
  for (const m of file) {
    switch (m.type) {
      case "create":
        if (qc.getQueryData<Book>(bookKeys.detail(m.livreId)) === undefined) {
          insererLivre(qc, livreDepuisCreation(m, m.creeLe));
        }
        break;
      case "update":
        ecrireLivre(qc, m.livreId, (b) => ({ ...b, ...m.champs }));
        break;
      case "delete":
        retirerLivre(qc, m.livreId);
        break;
      case "note": {
        const note = noteDepuisMutation(m);
        const notes = qc.getQueryData<Note[]>(noteKeys.all(m.livreId));
        if (!notes?.some((n) => n.id === note.id)) insererNote(qc, m.livreId, note);
        break;
      }
    }
  }
}
