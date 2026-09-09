/**
 * Ecritures a depart differe.
 *
 * Le lot 1 exige qu'une suppression puisse etre annulee pendant cinq secondes.
 * On ne peut pas supprimer puis recreer : la recreation donnerait un nouvel
 * identifiant, perdrait les notes rattachees et repartirait de la version 1.
 * La seule annulation possible consiste donc a ne pas encore avoir supprime.
 *
 * Les operations en attente vivent ici, au niveau du module, et non dans un
 * effet React : si le libraire quitte l'ecran pendant le delai, un minuteur
 * porte par le composant serait detruit avec lui et la suppression ne partirait
 * jamais, sans que personne ne le sache.
 *
 * Limite assumee au lot 1 : un rechargement complet de la page perd les
 * operations en attente. C'est la persistance de la file du lot 4 qui reglera
 * ce cas.
 */

/** Delai laisse au libraire pour se raviser. */
export const UNDO_DELAY_MS = 5000;

export type DeferredMutation = {
  /** Identifie l'operation ; pour une suppression, l'identifiant de l'ouvrage. */
  key: string;
  delayMs?: number;
  run: () => Promise<void>;
  /** Appele une fois l'operation partie, avec l'erreur si elle a echoue. */
  onSettled?: (error?: unknown) => void;
};

type Pending = {
  timer: ReturnType<typeof setTimeout>;
  mutation: DeferredMutation;
};

const pending = new Map<string, Pending>();

/**
 * Programme une operation. Une operation deja en attente sur la meme cle est
 * annulee : deux suppressions du meme ouvrage n'ont pas de sens.
 */
export function schedule(mutation: DeferredMutation): void {
  cancel(mutation.key);

  const timer = setTimeout(() => {
    void execute(mutation.key);
  }, mutation.delayMs ?? UNDO_DELAY_MS);

  pending.set(mutation.key, { timer, mutation });
}

async function execute(key: string): Promise<void> {
  const entry = pending.get(key);
  if (entry === undefined) return;

  clearTimeout(entry.timer);
  pending.delete(key);

  try {
    await entry.mutation.run();
    entry.mutation.onSettled?.();
  } catch (error) {
    entry.mutation.onSettled?.(error);
  }
}

/** Annule avant le depart. Rend false si l'operation etait deja partie. */
export function cancel(key: string): boolean {
  const entry = pending.get(key);
  if (entry === undefined) return false;

  clearTimeout(entry.timer);
  pending.delete(key);
  return true;
}

/** Envoie sans attendre la fin du delai. */
export function flush(key: string): Promise<void> {
  return execute(key);
}

export function isPending(key: string): boolean {
  return pending.has(key);
}

export function pendingKeys(): string[] {
  return [...pending.keys()];
}
