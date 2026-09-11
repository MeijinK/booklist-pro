import { ApiError } from "@/domain";
import { REQUEST_TIMEOUT_MS } from "@/services/config";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Signal supplied by the caller, typically a TanStack Query request's. */
  signal?: AbortSignal;
  timeoutMs?: number;
  /**
   * False for the authentication routes themselves: they carry no bearer
   * token, and a 401 from them is an answer, not an expired session.
   */
  auth?: boolean;
};

/**
 * One network round trip, bounded in time. Knows nothing about tokens: the
 * interceptor sits above it, the retry loop above that.
 *
 * The timeout and the caller's cancellation are two distinct signals relayed to
 * a single controller: `AbortSignal.any` is not available everywhere the
 * application has to run.
 */
export async function sendOnce(url: string, options: RequestOptions): Promise<Response> {
  const controller = new AbortController();
  const relayAbort = () => controller.abort();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? REQUEST_TIMEOUT_MS);

  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener("abort", relayAbort, { once: true });
  }

  const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  try {
    return await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (cause) {
    // Cancellation requested by the caller: this is not a failure. Let it
    // bubble up as is so TanStack Query sees a cancelled request and does not
    // display an error on every keystroke in the search bar.
    if (options.signal?.aborted) throw cause;

    throw new ApiError({
      kind: "network",
      message: timedOut
        ? "Le serveur n'a pas repondu a temps."
        : "Impossible de joindre le serveur.",
    });
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", relayAbort);
  }
}
