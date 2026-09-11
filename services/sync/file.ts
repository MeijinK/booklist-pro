import { z } from "zod";

import { MutationLocaleSchema, type MutationLocale } from "@/domain";

import { fusionnerFile } from "./mutation";
import { creerStorePersiste } from "./storeJson";

/**
 * The mutation queue. Survives a reload; replayed in `creeLe` order by
 * `synchroniser`. Every mutating call awaits the initial load first, so an
 * enqueue that races the start-up never overwrites what the disk holds.
 */
const store = creerStorePersiste<MutationLocale[]>(
  "booklist.file",
  z.array(MutationLocaleSchema),
  [],
);

/** Ids of the batch on the wire: not foldable while the server has them. */
const enVol = new Set<string>();

export const chargerFile = store.charger;
export const lireFile = store.lire;
export const surChangementFile = store.surChangement;

export async function ajouterMutation(m: MutationLocale): Promise<void> {
  await store.charger();
  await store.ecrire(fusionnerFile(store.lire(), m, enVol));
}

export async function retirerMutations(ids: readonly string[]): Promise<void> {
  await store.charger();
  await store.ecrire(store.lire().filter((m) => !ids.includes(m.id)));
}

/** Once the server has named a book created offline. */
export async function reecrireLivreIdFile(local: string, reel: string): Promise<void> {
  await store.charger();
  await store.ecrire(store.lire().map((m) => (m.livreId === local ? { ...m, livreId: reel } : m)));
}

export function marquerEnVol(ids: readonly string[]): void {
  ids.forEach((id) => enVol.add(id));
}

export function libererEnVol(ids: readonly string[]): void {
  ids.forEach((id) => enVol.delete(id));
}

export function reinitialiserFilePourTests(): void {
  store.reinitialiserPourTests();
  enVol.clear();
}
