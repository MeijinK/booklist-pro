import { useCallback, useEffect, useMemo, useRef } from "react";

export type DebouncedCallback<A extends unknown[]> = {
  /** Postpones the call; a new one during the delay replaces the previous. */
  run: (...args: A) => void;
  /** Drops what was waiting. Used when an immediate call takes its place. */
  cancel: () => void;
};

/**
 * Defers a call until the caller has stopped for `delayMs`.
 *
 * The bookseller types a title with a customer waiting: without this, three
 * letters mean three requests, on a connection that sometimes takes two seconds
 * to answer, and the answer to "arc" can land after the answer to "archipel".
 *
 * `run` keeps a stable identity across renders, so a component receiving it as
 * a prop is not re-rendered on every keystroke. The callback itself is read
 * from a ref rather than captured, which is what makes that stability possible
 * without ever calling a stale version.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delayMs: number,
): DebouncedCallback<A> {
  const latest = useRef(callback);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const run = useCallback(
    (...args: A) => {
      cancel();
      timer.current = setTimeout(() => {
        timer.current = undefined;
        latest.current(...args);
      }, delayMs);
    },
    [cancel, delayMs],
  );

  // A component left during the delay must not wake up to apply a search that
  // no longer has a screen.
  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({ run, cancel }), [run, cancel]);
}
