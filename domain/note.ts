import { z } from "zod";

/** Limit the server enforces on the content of a reading note. */
export const NOTE_MAX_LENGTH = 1000;

/** Shape of a note as the server returns it. Structure only. */
export const NoteSchema = z.object({
  id: z.string(),
  livreId: z.string(),
  contenu: z.string(),
  createdAt: z.string(),
});

export type Note = z.infer<typeof NoteSchema>;
