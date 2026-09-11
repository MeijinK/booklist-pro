import { useSyncExternalStore } from "react";

import { resoudreId, surChangementAlias } from "@/services/sync/alias";

/**
 * The server id behind a route parameter that may still be a `local:` one.
 * Re-renders the screen the moment the sync names the book.
 */
export function useIdReel(id: string): string {
  return useSyncExternalStore(
    surChangementAlias,
    () => resoudreId(id),
    () => resoudreId(id),
  );
}
