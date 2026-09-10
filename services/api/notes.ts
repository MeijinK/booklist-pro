import { z } from "zod";

import { NoteSchema, type Note, type NoteDraft } from "@/domain";

import { request, requestNoContent } from "./client";

/**
 * Reading notes, the business core of the application.
 *
 * The route returns a bare array and not the paginated envelope of GET /books:
 * a book carries a handful of notes, never five hundred, and paginating a
 * handful would cost a second round trip for nothing. `pageSchema` therefore
 * stays reserved for the collection.
 */
const NoteListSchema = z.array(NoteSchema);

function notesPath(bookId: string): string {
  return `/books/${encodeURIComponent(bookId)}/notes`;
}

export function listNotes(bookId: string, signal?: AbortSignal): Promise<Note[]> {
  return request(notesPath(bookId), { schema: NoteListSchema, signal });
}

export function createNote(bookId: string, draft: NoteDraft): Promise<Note> {
  return request(notesPath(bookId), { method: "POST", body: draft, schema: NoteSchema });
}

/**
 * A note is deleted through its book, not through a root route: the server
 * exposes no /notes/:id, and the identifier alone would not say which record
 * has to be refreshed.
 */
export function deleteNote(bookId: string, noteId: string): Promise<void> {
  return requestNoContent(`${notesPath(bookId)}/${encodeURIComponent(noteId)}`, {
    method: "DELETE",
  });
}
