import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";

import { estEnLigne, surChangement } from "@/services/reseau";
import { lireConflits, surChangementConflits } from "@/services/sync/conflits";
import { lireFile, surChangementFile } from "@/services/sync/file";
import { lireEtatSync, surChangementSync, synchroniser } from "@/services/sync/synchroniser";

/** The sync state as the header and the screens read it. */
export function useSync() {
  const queryClient = useQueryClient();
  const file = useSyncExternalStore(surChangementFile, lireFile, lireFile);
  const conflits = useSyncExternalStore(surChangementConflits, lireConflits, lireConflits);
  const enLigne = useSyncExternalStore(surChangement, estEnLigne, estEnLigne);
  const etat = useSyncExternalStore(surChangementSync, lireEtatSync, lireEtatSync);

  const lancer = useCallback(
    () => synchroniser(queryClient, { force: true }),
    [queryClient],
  );

  return {
    enLigne,
    enAttente: file.length,
    conflits: conflits.length,
    enCours: etat.enCours,
    derniereSync: etat.derniereSync,
    synchroniser: lancer,
  };
}
