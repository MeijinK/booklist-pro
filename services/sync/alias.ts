import { z } from "zod";

import { creerStorePersiste } from "./storeJson";

/**
 * `local:` id → server id, once a creation has been accepted. A record opened
 * on its local id keeps working after the sync without a navigation.
 */
const store = creerStorePersiste<Record<string, string>>(
  "booklist.alias",
  z.record(z.string(), z.string()),
  {},
);

export const chargerAlias = store.charger;
export const surChangementAlias = store.surChangement;

export function resoudreId(id: string): string {
  return store.lire()[id] ?? id;
}

export async function ajouterAlias(local: string, reel: string): Promise<void> {
  await store.charger();
  await store.ecrire({ ...store.lire(), [local]: reel });
}

export const reinitialiserAliasPourTests = store.reinitialiserPourTests;
