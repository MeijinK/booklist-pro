import type { QueryClient } from "@tanstack/react-query";

import { ApiError, type MutationLivre } from "@/domain";
import { envoyerLot } from "@/services/api/sync";
import { jetonAcces } from "@/services/auth/jetons";
import { bookKeys, statsKeys } from "@/services/queryKeys";
import { estEnLigne } from "@/services/reseau";

import { chargerAlias } from "./alias";
import { appliquer, rejouerNotes } from "./appliquer";
import { chargerConflits } from "./conflits";
import { decider } from "./decision";
import { chargerFile, libererEnVol, lireFile, marquerEnVol } from "./file";

export const TAILLE_LOT = 200;
const DELAI_MIN_MS = 1000;
const DELAI_MAX_MS = 30_000;

export type EtatSync = { enCours: boolean; derniereSync?: string; prochaineTentative?: number };
type Options = { force?: boolean; maintenant?: () => Date };

let etat: EtatSync = { enCours: false };
let enCours: Promise<void> | null = null;
let echecs = 0;
const abonnes = new Set<() => void>();

function publier(suivant: EtatSync): void {
  etat = suivant;
  abonnes.forEach((abonne) => abonne());
}

export const lireEtatSync = (): EtatSync => etat;

export function surChangementSync(abonne: () => void): () => void {
  abonnes.add(abonne);
  return () => {
    abonnes.delete(abonne);
  };
}

/** Fire-and-forget entry point for the hooks: sync now if the shop is online. */
export function planifierSync(qc: QueryClient): void {
  if (estEnLigne()) void synchroniser(qc);
}

/**
 * Replays the queue. Single-flight: a call during a run returns that run.
 *
 * Books go first, in one `/sync` batch per 200, through the interceptor —
 * which is what handles the token expiring mid-batch: the refresh happens,
 * the very same body is sent again, and the server answers `rejeu: true` for
 * what it had already applied. Notes follow on their own route once their
 * book has a real id. A transport failure keeps everything for the next
 * trigger, with a growing delay after repeated failures so a struggling
 * server is not hammered.
 */
export function synchroniser(qc: QueryClient, options: Options = {}): Promise<void> {
  if (enCours === null) {
    enCours = executer(qc, options).finally(() => {
      enCours = null;
    });
  }
  return enCours;
}

async function executer(
  qc: QueryClient,
  { force = false, maintenant = () => new Date() }: Options,
): Promise<void> {
  if (jetonAcces() === null) return;
  const tropTot = (etat.prochaineTentative ?? 0) > maintenant().getTime();
  if (!force && (!estEnLigne() || tropTot)) return;

  await Promise.all([chargerFile(), chargerConflits(), chargerAlias()]);
  if (lireFile().length === 0) return;

  publier({ ...etat, enCours: true });
  try {
    const livres = lireFile().filter((m): m is MutationLivre => m.type !== "note");
    for (let debut = 0; debut < livres.length; debut += TAILLE_LOT) {
      await envoyerUnLot(qc, livres.slice(debut, debut + TAILLE_LOT), maintenant);
    }
    await rejouerNotes(qc, maintenant);

    echecs = 0;
    publier({ enCours: false, derniereSync: maintenant().toISOString() });
    void qc.invalidateQueries({ queryKey: statsKeys.all });
    // Lists are marked stale but not refetched, as after any toggle: a refetch
    // would reorder or drop the row the bookseller has under their finger.
    // The next visit reads them fresh. Open records are refetched once nothing
    // is left waiting, so their notes come back from the server too.
    void qc.invalidateQueries({ queryKey: bookKeys.lists(), refetchType: "none" });
    void qc.invalidateQueries({
      queryKey: bookKeys.details(),
      refetchType: lireFile().length === 0 ? "active" : "none",
    });
  } catch (cause) {
    if (!(cause instanceof ApiError)) throw cause;
    // Network, 503, lost session: the queue is the retry mechanism. The
    // reseau signal has already been flipped by client.ts where relevant.
    echecs += 1;
    const delai = Math.min(DELAI_MAX_MS, DELAI_MIN_MS * 2 ** (echecs - 1));
    publier({ ...etat, enCours: false, prochaineTentative: maintenant().getTime() + delai });
  }
}

async function envoyerUnLot(
  qc: QueryClient,
  lot: MutationLivre[],
  maintenant: () => Date,
): Promise<void> {
  const ids = lot.map((m) => m.id);
  marquerEnVol(ids);
  try {
    const reponse = await envoyerLot(lot);
    const parId = new Map(reponse.resultats.map((r) => [r.id, r]));
    for (const m of lot) {
      await appliquer(qc, m, decider(m, parId.get(m.id), maintenant().toISOString()));
    }
  } finally {
    libererEnVol(ids);
  }
}

export function reinitialiserSyncPourTests(): void {
  etat = { enCours: false };
  enCours = null;
  echecs = 0;
  abonnes.clear();
}
