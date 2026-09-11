import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { surChangement } from "@/services/reseau";
import { chargerAlias } from "@/services/sync/alias";
import { chargerConflits } from "@/services/sync/conflits";
import { chargerFile, lireFile } from "@/services/sync/file";
import { rejouerLocalement } from "@/services/sync/rejouerLocal";
import { lireEtatSync, surChangementSync, synchroniser } from "@/services/sync/synchroniser";

/**
 * Mounted once behind the login for an editor: loads the stores, syncs on
 * start-up, on every return of the network, and again when a failed run has
 * scheduled its retry. Renders nothing.
 */
export function SyncBootstrap() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let actif = true;
    void Promise.all([chargerFile(), chargerConflits(), chargerAlias()]).then(() => {
      if (!actif) return;
      rejouerLocalement(queryClient, lireFile());
      void synchroniser(queryClient);
    });
    return () => {
      actif = false;
    };
  }, [queryClient]);

  useEffect(
    () =>
      surChangement((enLigne) => {
        if (enLigne) void synchroniser(queryClient);
      }),
    [queryClient],
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arreter = surChangementSync(() => {
      const { prochaineTentative } = lireEtatSync();
      if (timer !== undefined) clearTimeout(timer);
      if (prochaineTentative === undefined) return;
      timer = setTimeout(
        () => void synchroniser(queryClient),
        Math.max(0, prochaineTentative - Date.now()),
      );
    });
    return () => {
      arreter();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [queryClient]);

  return null;
}
