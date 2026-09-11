import { z } from "zod";

import { ConflitSchema, type Conflit } from "@/domain";

import { creerStorePersiste } from "./storeJson";

/** Mutations waiting for the bookseller's arbitration. Persisted like the queue. */
const store = creerStorePersiste<Conflit[]>("booklist.conflits", z.array(ConflitSchema), []);

export const chargerConflits = store.charger;
export const lireConflits = store.lire;
export const surChangementConflits = store.surChangement;

export async function ajouterConflit(c: Conflit): Promise<void> {
  await store.charger();
  await store.ecrire([...store.lire().filter((x) => x.id !== c.id), c]);
}

export async function retirerConflit(id: string): Promise<void> {
  await store.charger();
  await store.ecrire(store.lire().filter((c) => c.id !== id));
}

export async function reecrireLivreIdConflits(local: string, reel: string): Promise<void> {
  await store.charger();
  await store.ecrire(
    store.lire().map((c) =>
      c.mutation.livreId === local ? { ...c, mutation: { ...c.mutation, livreId: reel } } : c,
    ),
  );
}

export const reinitialiserConflitsPourTests = store.reinitialiserPourTests;
