import type { QueryClient } from "@tanstack/react-query";

import { ApiError, estIdLocal, type MutationLivre, type MutationNote } from "@/domain";
import { createNote, listNotes } from "@/services/api/notes";
import { bookKeys } from "@/services/queryKeys";

import { ajouterAlias, resoudreId } from "./alias";
import { ecrireLivreServeur, remplacerNote, renommerLivre, retirerLivre } from "./cache";
import { ajouterConflit, reecrireLivreIdConflits } from "./conflits";
import type { Decision } from "./decision";
import { lireFile, reecrireLivreIdFile, retirerMutations } from "./file";

/**
 * Carries out what `decider` named: the queue, the conflict store, the alias
 * table and the cache move together. The decision itself was taken elsewhere,
 * without side effects; this is where they all happen.
 */
export async function appliquer(qc: QueryClient, m: MutationLivre, d: Decision): Promise<void> {
  switch (d.action) {
    case "garder":
      return;

    case "retirer":
      await retirerMutations([m.id]);
      if (d.alias !== undefined && d.livre !== null) {
        await ajouterAlias(d.alias.local, d.alias.serveur);
        await reecrireLivreIdFile(d.alias.local, d.alias.serveur);
        await reecrireLivreIdConflits(d.alias.local, d.alias.serveur);
        renommerLivre(qc, d.alias.local, d.livre);
      } else if (m.type === "delete") {
        retirerLivre(qc, m.livreId);
      } else if (d.livre !== null) {
        ecrireLivreServeur(qc, d.livre);
      }
      return;

    case "conflit":
    case "rejeter":
      await retirerMutations([m.id]);
      await ajouterConflit(d.conflit);
      if (d.conflit.serveur !== undefined) {
        // The screen shows the server's truth; the bookseller's version waits
        // in the conflict store, whole.
        ecrireLivreServeur(qc, d.conflit.serveur);
      } else if (estIdLocal(m.livreId)) {
        retirerLivre(qc, m.livreId);
      } else {
        void qc.invalidateQueries({ queryKey: bookKeys.detail(m.livreId) });
      }
      return;
  }
}

/**
 * Notes have no client id on the server: before sending one, the existing
 * notes are read and an identical text is taken as "already there". A note on
 * a book still waiting for its id is left for the next run.
 */
export async function rejouerNotes(qc: QueryClient, maintenant: () => Date): Promise<void> {
  const notes = lireFile().filter((m): m is MutationNote => m.type === "note");

  for (const m of notes) {
    const livreId = resoudreId(m.livreId);
    if (estIdLocal(livreId)) continue;
    const idLocal = `local:${m.id}`;

    try {
      const existantes = await listNotes(livreId);
      const deja = existantes.find((n) => n.contenu === m.contenu);
      const enregistree = deja ?? (await createNote(livreId, { contenu: m.contenu }));
      await retirerMutations([m.id]);
      remplacerNote(qc, livreId, idLocal, enregistree);
    } catch (cause) {
      if (cause instanceof ApiError && cause.detail.kind === "notFound") {
        await retirerMutations([m.id]);
        await ajouterConflit({
          id: m.id,
          type: "rejet",
          mutation: m,
          motif: "disparu",
          detecteLe: maintenant().toISOString(),
        });
        continue;
      }
      throw cause;
    }
  }
}
