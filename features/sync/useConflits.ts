import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useSyncExternalStore } from "react";

import { estIdLocal, type ChampsLivre, type Conflit } from "@/domain";
import { bookKeys } from "@/services/queryKeys";
import { storage } from "@/services/storage";
import { ecrireLivre } from "@/services/sync/cache";
import { lireConflits, retirerConflit, surChangementConflits } from "@/services/sync/conflits";
import { ajouterMutation } from "@/services/sync/file";
import { champsEnConflit, fusionner } from "@/services/sync/fusion";
import { nouvelId } from "@/services/sync/mutation";
import { planifierSync } from "@/services/sync/synchroniser";

import { BROUILLON_PREFIX } from "./useBrouillon";
import type { ChoixFusion } from "./EcranFusion";

/**
 * The bookseller's verdicts on a conflict. Each one ends the conflict and, when
 * something must reach the server, queues a fresh mutation carrying the
 * version the server announced — so the next sync is accepted, or comes back
 * as a new conflict if a colleague was faster again.
 */
export function useConflits() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const conflits = useSyncExternalStore(surChangementConflits, lireConflits, lireConflits);

  const terminer = useCallback(
    async (c: Conflit) => {
      await retirerConflit(c.id);
      if (!estIdLocal(c.mutation.livreId)) {
        void queryClient.invalidateQueries({ queryKey: bookKeys.detail(c.mutation.livreId) });
      }
    },
    [queryClient],
  );

  const envoyer = useCallback(
    async (c: Conflit, champs: ChampsLivre) => {
      const livreId = c.mutation.livreId;
      ecrireLivre(queryClient, livreId, (b) => ({ ...b, ...champs }));
      await ajouterMutation({
        id: nouvelId(),
        type: "update",
        creeLe: new Date().toISOString(),
        livreId,
        baseVersion: c.versionAttendue,
        champs,
      });
      await retirerConflit(c.id);
      planifierSync(queryClient);
    },
    [queryClient],
  );

  const appliquerFusion = useCallback(
    async (c: Conflit, choix: ChoixFusion) => {
      if (c.serveur === undefined || c.mutation.type === "note") return terminer(c);
      const champs = fusionner(champsEnConflit(c.mutation, c.serveur), choix);
      return Object.keys(champs).length === 0 ? terminer(c) : envoyer(c, champs);
    },
    [envoyer, terminer],
  );

  const supprimerQuandMeme = useCallback(
    async (c: Conflit) => {
      await ajouterMutation({
        id: nouvelId(),
        type: "delete",
        creeLe: new Date().toISOString(),
        livreId: c.mutation.livreId,
        baseVersion: c.versionAttendue,
      });
      await retirerConflit(c.id);
      planifierSync(queryClient);
    },
    [queryClient],
  );

  /** A refused entry: its fields become the draft of a new form. */
  const recopier = useCallback(
    async (c: Conflit) => {
      const m = c.mutation;
      const valeurs = m.type === "create" ? m.livre : m.type === "update" ? m.champs : undefined;
      if (valeurs !== undefined) {
        const brouillon = { ...valeurs, annee: valeurs.annee === undefined ? "" : String(valeurs.annee) };
        await storage.write(`${BROUILLON_PREFIX}livre:new`, JSON.stringify(brouillon));
      }
      await retirerConflit(c.id);
      router.push("/books/new");
    },
    [router],
  );

  return {
    conflits,
    appliquerFusion,
    garderServeur: terminer,
    abandonner: terminer,
    supprimerQuandMeme,
    recopier,
  };
}
