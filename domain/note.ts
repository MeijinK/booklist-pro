import { z } from "zod";

/** Limit the server enforces on the content of a reading note. */
export const NOTE_MAX_LENGTH = 1000;

/**
 * Point from which the remaining-characters counter appears.
 *
 * Displaying it from the first character turns a free-form field into a form to
 * fill in; displaying it only once the limit is reached announces the refusal
 * too late. It shows up when the end is close enough to matter.
 */
export const NOTE_COUNTER_THRESHOLD = 900;

/** Shape of a note as the server returns it. Structure only. */
export const NoteSchema = z.object({
  id: z.string(),
  livreId: z.string(),
  contenu: z.string(),
  createdAt: z.string(),
});

export type Note = z.infer<typeof NoteSchema>;

/**
 * What a bookseller sends when writing a note.
 *
 * The rules restate those of the server, which answers 422 with
 * `{ contenu: "contenu obligatoire, 1000 caracteres maximum" }`. Restating them
 * is not duplication: it is what lets the interface refuse an empty note
 * without a round trip, at the counter, on a shop connection that sometimes
 * takes two seconds to answer.
 */
export const NoteDraftSchema = z.object({
  contenu: z
    .string()
    .trim()
    .min(1, "Une note de lecture ne peut pas etre vide.")
    .max(NOTE_MAX_LENGTH, `Une note de lecture ne depasse pas ${NOTE_MAX_LENGTH} caracteres.`),
});

export type NoteDraft = z.infer<typeof NoteDraftSchema>;

/**
 * Most recent note first.
 *
 * The server already returns them in this order; the list re-establishes it
 * anyway, because an optimistically added note is inserted before any round
 * trip and must land in the same place as the one the server will send back.
 */
export function sortNotes(notes: readonly Note[]): Note[] {
  return [...notes].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
