import { z } from "zod";

/** GET /stats, as the server returns it. */
export const StatsSchema = z.object({
  total: z.number().int(),
  lus: z.number().int(),
  nonLus: z.number().int(),
  favoris: z.number().int(),
  moyenneNotes: z.number().nullable(),
  totalNotes: z.number().int(),
  distributionNotes: z.array(z.object({ note: z.number(), total: z.number().int() })),
  parAnnee: z.array(z.object({ annee: z.number().int(), total: z.number().int() })),
  parAuteur: z.array(z.object({ auteur: z.string(), total: z.number().int() })),
  genereLe: z.string(),
});

export type Stats = z.infer<typeof StatsSchema>;

/** The most recent years present, oldest first: what fits on a till screen. */
export function anneesRecentes(stats: Stats, nombre = 12): Stats["parAnnee"] {
  return [...stats.parAnnee].sort((a, b) => a.annee - b.annee).slice(-nombre);
}

/** Books the team has not rated: the total minus every rated one. */
export function sansNote(stats: Stats): number {
  const notes = stats.distributionNotes.reduce((somme, d) => somme + d.total, 0);
  return Math.max(0, stats.total - notes);
}
