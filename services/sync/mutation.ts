import {
  LOCAL_ID_PREFIX,
  type Book,
  type MutationLocale,
  type MutationNote,
  type Note,
} from "@/domain";

/**
 * Pure helpers around the mutation queue. Nothing here touches storage, the
 * network or the clock: every input is a parameter, which is what makes the
 * fusion table below testable line by line.
 */

/** Idempotence key. `crypto.randomUUID` exists on the browser and on Hermes. */
export function nouvelId(): string {
  const c = globalThis.crypto;
  if (c !== undefined && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nouvelIdLocal(): string {
  return `${LOCAL_ID_PREFIX}${nouvelId()}`;
}

/** The record as the list shows it before the server has named it. */
export function livreDepuisCreation(
  m: Extract<MutationLocale, { type: "create" }>,
  maintenant: string,
): Book {
  return {
    id: m.livreId,
    titre: m.livre.titre,
    auteur: m.livre.auteur,
    editeur: m.livre.editeur,
    annee: m.livre.annee,
    lu: m.livre.lu,
    favori: m.livre.favori ?? false,
    note: m.livre.note ?? null,
    couverture: null,
    createdAt: maintenant,
    updatedAt: maintenant,
    version: 0,
  };
}

/** The note as the list shows it; its id is derived so sync can find it back. */
export function noteDepuisMutation(m: MutationNote): Note {
  return {
    id: `${LOCAL_ID_PREFIX}${m.id}`,
    livreId: m.livreId,
    contenu: m.contenu,
    createdAt: m.creeLe,
  };
}

/**
 * Adds a mutation to the queue, folding it into an earlier one on the same
 * book when that is what the server would do anyway. Two edits of a title are
 * one edit; creating then deleting is nothing. Fewer lines in the batch, fewer
 * conflicts to arbitrate.
 *
 * A mutation already in flight is never touched: the batch on the wire must
 * stay exactly what was sent.
 */
export function fusionnerFile(
  file: readonly MutationLocale[],
  nouvelle: MutationLocale,
  enVol: ReadonlySet<string> = new Set(),
): MutationLocale[] {
  if (nouvelle.type === "note") return [...file, nouvelle];

  const index = file.findIndex(
    (m) => m.type !== "note" && m.livreId === nouvelle.livreId && !enVol.has(m.id),
  );
  if (index === -1) return [...file, nouvelle];

  const existante = file[index] as Exclude<MutationLocale, { type: "note" }>;
  const sans = file.filter((_, i) => i !== index);

  if (nouvelle.type === "delete") {
    if (existante.type === "create") {
      // Never left the till: the book and everything attached to it vanish.
      return sans.filter((m) => m.livreId !== nouvelle.livreId);
    }
    // An update or a delete: both may carry the version the bookseller saw.
    return [
      ...sans,
      { ...nouvelle, id: existante.id, baseVersion: existante.baseVersion ?? nouvelle.baseVersion },
    ];
  }

  if (nouvelle.type === "update") {
    if (existante.type === "create") {
      return [...sans, { ...existante, livre: { ...existante.livre, ...nouvelle.champs } }];
    }
    if (existante.type === "update") {
      return [
        ...sans,
        {
          ...existante,
          baseVersion: existante.baseVersion ?? nouvelle.baseVersion,
          champs: { ...existante.champs, ...nouvelle.champs },
        },
      ];
    }
  }
  // An update after a delete, or a second creation of the same local id,
  // cannot come from the interface; kept as is rather than guessed at.
  return [...file, nouvelle];
}
