import { QueryClient } from "@tanstack/react-query";

import type { ApiError } from "@/domain";

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
        // A data error must produce the error screen with retry required by
        // batch 1, not bubble up to the global ErrorBoundary, which is reserved
        // for the unexpected.
        throwOnError: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
