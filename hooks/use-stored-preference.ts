import { useCallback, useEffect, useState } from "react";

export type StoredPreference<T> = {
  /** Undefined until the stored value has been read back. */
  value: T | undefined;
  set: (value: T) => void;
  /** False while reading; lets a caller hold the splash screen. */
  loaded: boolean;
};

/**
 * Binds a setting to its persistence.
 *
 * The new value is applied immediately and written in the background: a
 * bookseller toggling the theme must see it change on the same frame, and the
 * write is never something to wait on. If persisting fails the interface stays
 * correct for the session, which is the right trade — losing a preference is a
 * nuisance, freezing a toggle is a defect.
 */
export function useStoredPreference<T>(
  load: () => Promise<T>,
  save: (value: T) => Promise<void>,
): StoredPreference<T> {
  const [value, setValue] = useState<T | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    load().then((stored) => {
      if (cancelled) return;
      setValue(stored);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [load]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      void save(next);
    },
    [save],
  );

  return { value, set, loaded };
}
