import type { Book, Conflit, MutationLivre, ResultatSync } from "@/domain";

export type Decision =
  | { action: "retirer"; livre: Book | null; alias?: { local: string; serveur: string } }
  | { action: "conflit"; conflit: Conflit }
  | { action: "rejeter"; conflit: Conflit }
  | { action: "garder" };

/**
 * What becomes of one mutation once the server has spoken.
 *
 * The one function the brief asks to be pure and tested: no store, no cache, no
 * clock. `detecteLe` is passed in. The caller applies the decision; this
 * function only names it.
 *
 * A replay (`rejeu`) is a success or a conflict like any other: the server did
 * the work the first time, we are only late hearing about it.
 */
export function decider(
  m: MutationLivre,
  r: ResultatSync | undefined,
  detecteLe: string,
): Decision {
  if (r === undefined) return { action: "garder" };

  switch (r.statut) {
    case "ok": {
      const livre = r.livre ?? null;
      if (m.type === "create" && livre !== null) {
        return { action: "retirer", livre, alias: { local: m.livreId, serveur: livre.id } };
      }
      return { action: "retirer", livre };
    }

    case "conflit":
      return {
        action: "conflit",
        conflit: {
          id: m.id,
          type: "conflit",
          mutation: m,
          serveur: r.serveur,
          versionAttendue: r.versionAttendue,
          detecteLe,
        },
      };

    case "erreur": {
      if (r.champs !== undefined) {
        return {
          action: "rejeter",
          conflit: {
            id: m.id,
            type: "rejet",
            mutation: m,
            motif: "refus",
            champs: r.champs,
            detecteLe,
          },
        };
      }
      if (r.message === "livre introuvable") {
        return {
          action: "rejeter",
          conflit: { id: m.id, type: "rejet", mutation: m, motif: "disparu", detecteLe },
        };
      }
      // Anything else is the server's problem, not the bookseller's: retry later.
      return { action: "garder" };
    }
  }
}
