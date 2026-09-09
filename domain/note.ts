import { z } from "zod";

/** Limite imposee par le serveur sur le contenu d'une note de lecture. */
export const NOTE_MAX_LENGTH = 1000;

/** Forme d'une note telle que le serveur la renvoie. Structure seule. */
export const NoteSchema = z.object({
  id: z.string(),
  livreId: z.string(),
  contenu: z.string(),
  createdAt: z.string(),
});

export type Note = z.infer<typeof NoteSchema>;
