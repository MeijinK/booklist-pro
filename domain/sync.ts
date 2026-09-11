import { z } from "zod";

import { BookDraftSchema, BookSchema } from "./book";

/** Identifier of a book created offline, before the server names it. */
export const LOCAL_ID_PREFIX = "local:";

export function estIdLocal(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

/** Fields a partial update may carry — the PATCH / sync `update` contract. */
export const ChampsLivreSchema = z.object({
  titre: z.string().optional(),
  auteur: z.string().optional(),
  editeur: z.string().optional(),
  annee: z.number().int().optional(),
  lu: z.boolean().optional(),
  favori: z.boolean().optional(),
  note: z.number().nullable().optional(),
});

export type ChampsLivre = z.infer<typeof ChampsLivreSchema>;

/** What a creation carries: the form's draft, plus toggles made before sync. */
export const LivreCreationSchema = BookDraftSchema.extend({
  favori: z.boolean().optional(),
  note: z.number().nullable().optional(),
});

export type LivreCreation = z.infer<typeof LivreCreationSchema>;

const Base = {
  /** Client identifier, generated once, kept across retries: the server's idempotence key. */
  id: z.string(),
  creeLe: z.string(),
  livreId: z.string(),
};

/**
 * One intention of the bookseller, persisted until the server has settled it.
 * Notes are queued too, but replayed through their own route: `/sync` only
 * knows books.
 */
export const MutationLocaleSchema = z.discriminatedUnion("type", [
  z.object({ ...Base, type: z.literal("create"), livre: LivreCreationSchema }),
  z.object({
    ...Base,
    type: z.literal("update"),
    baseVersion: z.number().int().optional(),
    champs: ChampsLivreSchema,
  }),
  z.object({ ...Base, type: z.literal("delete"), baseVersion: z.number().int().optional() }),
  z.object({ ...Base, type: z.literal("note"), contenu: z.string() }),
]);

export type MutationLocale = z.infer<typeof MutationLocaleSchema>;
export type MutationLivre = Exclude<MutationLocale, { type: "note" }>;
export type MutationNote = Extract<MutationLocale, { type: "note" }>;

/**
 * One line of the `/sync` answer. A replayed result (`rejeu: true`) is echoed
 * from the server's memory and may lack `serveur` or `message`: hence optional.
 */
export const ResultatSyncSchema = z.discriminatedUnion("statut", [
  z.object({
    id: z.string().nullable(),
    statut: z.literal("ok"),
    livre: BookSchema.nullable().optional(),
    rejeu: z.boolean().optional(),
  }),
  z.object({
    id: z.string(),
    statut: z.literal("conflit"),
    serveur: BookSchema.optional(),
    versionAttendue: z.number().int().optional(),
    rejeu: z.boolean().optional(),
  }),
  z.object({
    id: z.string().nullable(),
    statut: z.literal("erreur"),
    message: z.string().optional(),
    champs: z.record(z.string(), z.string()).optional(),
    rejeu: z.boolean().optional(),
  }),
]);

export type ResultatSync = z.infer<typeof ResultatSyncSchema>;

export const ReponseSyncSchema = z.object({
  resultats: z.array(ResultatSyncSchema),
  serveurLe: z.string().optional(),
});

export type ReponseSync = z.infer<typeof ReponseSyncSchema>;

/**
 * A mutation the server would not apply as is, waiting for the bookseller.
 * `conflit`: the record moved on; `rejet`: refused (422) or gone (404). The
 * mutation itself is kept whole so nothing typed is ever lost.
 */
export const ConflitSchema = z.object({
  id: z.string(),
  type: z.enum(["conflit", "rejet"]),
  mutation: MutationLocaleSchema,
  serveur: BookSchema.optional(),
  versionAttendue: z.number().int().optional(),
  /** Why a rejection happened; worded by the interface, in its language. */
  motif: z.enum(["refus", "disparu"]).optional(),
  champs: z.record(z.string(), z.string()).optional(),
  detecteLe: z.string(),
});

export type Conflit = z.infer<typeof ConflitSchema>;
