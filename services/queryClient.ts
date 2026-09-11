import { QueryClient } from "@tanstack/react-query";

import type { ApiError } from "@/domain";

import { CACHE_MAX_AGE_MS } from "./cachePersistant";

/**
 * Declares ApiError as TanStack Query's default error type. Hooks then expose
 * an `error` the interface can discriminate on `kind`, without having to retype
 * it at every call site.
 */
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
  }
}

/**
 * A factory rather than a singleton: each test gets a fresh cache, and the
 * application creates only one, mounted in the root layout.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retrying lives in the HTTP client, the only place that knows which
        // statuses are replayable. Enabling it here as well would multiply the
        // attempts and worsen an outage instead of absorbing it.
        retry: false,
        // Without a staleness delay, every screen mount refires a request.
        // At 1.5 s of latency in degraded mode, that shows immediately.
        staleTime: 30_000,
        // Entries garbage-collected before the persister writes them would
        // never reach the disk: kept as long as the persisted cache itself.
        gcTime: CACHE_MAX_AGE_MS,
        // TanStack would pause every query and mutation as soon as the browser
        // says it is offline. Offline is our business, not its: writes go to
        // the local queue whatever the network says, and a read that fails
        // must fail, so the screen can fall back on the cache and say so.
        networkMode: "always",
        // A data error must produce the error screen with retry required by
        // batch 1, not bubble up to the global ErrorBoundary, which is reserved
        // for the unexpected.
        throwOnError: false,
      },
      mutations: {
        retry: false,
        networkMode: "always",
      },
    },
  });
}
