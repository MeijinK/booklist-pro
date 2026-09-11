import type { z } from "zod";

import { storage } from "@/services/storage";

export type StorePersiste<T> = {
  /** Synchronous, stable reference: what `useSyncExternalStore` reads. */
  lire(): T;
  /** Reads the disk once; later calls share the same promise. */
  charger(): Promise<T>;
  ecrire(valeur: T): Promise<void>;
  surChangement(abonne: () => void): () => void;
  reinitialiserPourTests(): void;
};

/**
 * A small persisted store: one JSON value under one key, validated on read.
 *
 * Every write goes to memory first and to disk after: the interface never waits
 * on storage, and a full or blocked storage degrades to "lost on reload", never
 * to a frozen screen. A corrupted value falls back to the default rather than
 * crashing the start-up — a queue nobody can read is worse than an empty one,
 * and the schema is what decides.
 */
export function creerStorePersiste<T>(
  cle: string,
  schema: z.ZodType<T>,
  defaut: T,
): StorePersiste<T> {
  let valeur = defaut;
  let chargement: Promise<T> | null = null;
  const abonnes = new Set<() => void>();

  const publier = () => abonnes.forEach((abonne) => abonne());

  return {
    lire: () => valeur,

    charger() {
      if (chargement === null) {
        chargement = storage.read(cle).then((brut) => {
          if (brut === null) return valeur;
          let json: unknown;
          try {
            json = JSON.parse(brut);
          } catch {
            // Corrupted store: start empty, see the note above.
            return valeur;
          }
          const parsed = schema.safeParse(json);
          if (!parsed.success) return valeur;
          valeur = parsed.data;
          publier();
          return valeur;
        });
      }
      return chargement;
    },

    async ecrire(nouvelle) {
      valeur = nouvelle;
      publier();
      await storage.write(cle, JSON.stringify(nouvelle));
    },

    surChangement(abonne) {
      abonnes.add(abonne);
      return () => {
        abonnes.delete(abonne);
      };
    },

    reinitialiserPourTests() {
      valeur = defaut;
      chargement = null;
      abonnes.clear();
    },
  };
}
