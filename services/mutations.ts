/** Grace period left to the bookseller to change their mind. */
export const UNDO_DELAY_MS = 5000;

export type DeferredMutation = {
  /** Identifies the operation; for a deletion, the book identifier. */
  key: string;
  delayMs?: number;
  run: () => Promise<void>;
  /** Called once the operation has departed, with the error if it failed. */
  onSettled?: (error?: unknown) => void;
};

type Pending = {
  timer: ReturnType<typeof setTimeout>;
  mutation: DeferredMutation;
};

const pending = new Map<string, Pending>();

/**
 * Schedules an operation. An operation already pending on the same key is
 * cancelled: two deletions of the same book make no sense.
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

/** Cancels before departure. Returns false if the operation had already left. */
export function cancel(key: string): boolean {
  const entry = pending.get(key);
  if (entry === undefined) return false;

  clearTimeout(entry.timer);
  pending.delete(key);
  return true;
}

/** Sends immediately, without waiting for the end of the delay. */
export function flush(key: string): Promise<void> {
  return execute(key);
}

export function isPending(key: string): boolean {
  return pending.has(key);
}

/** Keys still awaiting departure; lets a test clean up after itself. */
export function pendingKeys(): string[] {
  // Array.from plutot qu'un spread : ne depend pas de downlevelIteration ni de
  // la cible de compilation, qui varient selon le tsconfig actif.
  return Array.from(pending.keys());
}
