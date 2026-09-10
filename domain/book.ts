import { z } from "zod";

/** Lower bound the server accepts for the publication year. */
export const MIN_PUBLICATION_YEAR = 1450;

/** Upper bound: the server accepts next year, for announced releases. */
export function maxPublicationYear(today: Date = new Date()): number {
  return today.getFullYear() + 1;
}

/**
 * Shape of a book as the server returns it. The field names are those of the
 * API contract and are not translated.
 *
 * This schema validates the STRUCTURE, not the business rules: part of the
 * collection was entered hastily and may contain out-of-range values. Rejecting
 * an existing record would make the catalogue unreadable, when the bookseller
 * should precisely be able to fix it. Business rules constrain what WE send,
 * and therefore live in BookDraftSchema.
 */
export const BookSchema = z.object({
  id: z.string(),
  titre: z.string(),
  auteur: z.string(),
  editeur: z.string(),
  annee: z.number().int(),
  lu: z.boolean(),
  favori: z.boolean(),
  note: z.number().nullable(),
  couverture: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

export type Book = z.infer<typeof BookSchema>;

/**
 * What defines a book on creation and on update, in the sense of batch 1:
 * title, author, publisher, publication year, read status. This is what
 * PUT /books/:id requires in full.
 */
const YearSchema = z
  .number()
  .int("L'annee doit etre un nombre entier.")
  .min(MIN_PUBLICATION_YEAR, `L'annee doit etre posterieure a ${MIN_PUBLICATION_YEAR}.`)
  // Checked on every validation rather than at module load, so it stays correct
  // if the application is left open across a year boundary.
  .refine(
    (year) => year <= maxPublicationYear(),
    "L'annee ne peut pas depasser l'annee prochaine.",
  );

export const BookDraftSchema = z.object({
  titre: z.string().trim().min(1, "Le titre est obligatoire."),
  auteur: z.string().trim().min(1, "L'auteur est obligatoire."),
  editeur: z.string().trim().min(1, "L'editeur est obligatoire."),
  annee: YearSchema,
  lu: z.boolean(),
});

export type BookDraft = z.infer<typeof BookDraftSchema>;

/**
 * What the form manipulates.
 *
 * The year travels through it as text, because a text input never yields
 * anything else. The conversion is a business rule in its own right: "19x4" and
 * an empty year are not reported the same way, and leaving a bare `Number()` in
 * a component would put a "NaN" on screen. The schema converts, then applies
 * exactly the same bounds as BookDraftSchema.
 */
export const BookFormSchema = z.object({
  titre: z.string().trim().min(1, "Le titre est obligatoire."),
  auteur: z.string().trim().min(1, "L'auteur est obligatoire."),
  editeur: z.string().trim().min(1, "L'editeur est obligatoire."),
  annee: z
    .string()
    .trim()
    .min(1, "L'annee de publication est obligatoire.")
    .refine((value) => /^\d{1,4}$/.test(value), "L'annee doit etre un nombre entier.")
    .transform(Number)
    .pipe(YearSchema),
  lu: z.boolean(),
});

/** Values as the form carries them, before conversion. */
export type BookFormValues = z.input<typeof BookFormSchema>;
