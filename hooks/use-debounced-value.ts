import { useEffect, useState } from "react";

/**
 * Holds a value back until it stops changing.
 *
 * Used where a keystroke would otherwise trigger a request: the bookseller
 * typing a title should produce one lookup, not one per letter. A delay of zero
 * disables the mechanism entirely, for callers whose value never changes — a
 * list row, for instance.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    if (delayMs <= 0) {
      setSettled(value);
      return;
    }

    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return delayMs <= 0 ? value : settled;
}
