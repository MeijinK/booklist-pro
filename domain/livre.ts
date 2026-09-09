import { z } from "zod";

/** Borne basse acceptee par le serveur pour l'annee de publication. */
export const MIN_PUBLICATION_YEAR = 1450;

/** Borne haute : le serveur accepte l'annee prochaine, pour les parutions annoncees. */
export function maxPublicationYear(today: Date = new Date()): number {
  return today.getFullYear() + 1;
}

/**
 * Forme d'un ouvrage tel que le serveur le renvoie. Les noms de champs sont
 * ceux du contrat de l'API et ne se traduisent pas.
 *
 * Ce schema valide la STRUCTURE, pas les regles metier : une partie du fonds a
 * ete saisie a la va-vite et peut contenir des valeurs hors bornes. Rejeter une
 * fiche existante rendrait le catalogue inconsultable, alors que le libraire
 * doit justement pouvoir la corriger. Les regles metier contraignent ce que
 * NOUS envoyons, et vivent donc dans BookDraftSchema.
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
 * Ce qui definit un ouvrage a la creation et a la modification, au sens du
 * lot 1 : titre, auteur, editeur, annee de publication, statut de lecture.
 * C'est ce que PUT /books/:id exige au complet.
 */
export const BookDraftSchema = z.object({
  titre: z.string().trim().min(1, "Le titre est obligatoire."),
  auteur: z.string().trim().min(1, "L'auteur est obligatoire."),
  editeur: z.string().trim().min(1, "L'editeur est obligatoire."),
  annee: z
    .number()
    .int("L'annee doit etre un nombre entier.")
    .min(MIN_PUBLICATION_YEAR, `L'annee doit etre posterieure a ${MIN_PUBLICATION_YEAR}.`)
    // Verifie a chaque validation plutot qu'au chargement du module, pour rester
    // juste si l'application reste ouverte au passage d'une annee.
    .refine(
      (annee) => annee <= maxPublicationYear(),
      "L'annee ne peut pas depasser l'annee prochaine.",
    ),
  lu: z.boolean(),
});

export type BookDraft = z.infer<typeof BookDraftSchema>;
