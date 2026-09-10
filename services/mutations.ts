/**
 * Writes with a deferred departure.
 *
 * Batch 1 requires that a deletion can be undone for five seconds. Deleting
 * then recreating is not an option: the recreation would yield a new
 * identifier, lose the attached notes and restart from version 1. The only
 * possible undo therefore consists of not having deleted yet.
 *
 * Pending operations live here, at module level, and not in a React effect: if
 * the bookseller leaves the screen during the delay, a timer owned by the
 * component would be destroyed with it and the deletion would never depart,
 * without anyone knowing.
 *
 * Accepted limit at batch 1: a full page reload loses the pending operations.
 * Batch 4's persistent queue is what will settle that case.
 */

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

export function isPending(key: string): boolean {
  return pending.has(key);
}
