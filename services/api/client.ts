import type { z } from "zod";

import { ApiError } from "@/domain";
import { getBaseUrl, REQUEST_TIMEOUT_MS } from "@/services/config";
import { toApiError } from "./errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Signal supplied by the caller, typically a TanStack Query request's. */
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * Methods that can be replayed without creating a duplicate. POST is excluded:
 * a 503 does not say whether the server processed the creation before failing,
 * and replaying would produce two books. At batch 4, the mutation queue will
 * carry a client identifier that makes POST /sync replayable in turn.
 */
const IDEMPOTENT_METHODS: readonly HttpMethod[] = ["GET", "PUT", "PATCH", "DELETE"];

const MAX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 300;

/** Only a temporary outage and a request that never departed are replayed. */
function isRetryable(error: ApiError): boolean {
  return (
    error.detail.kind === "network" &&
    (error.detail.status === undefined || error.detail.status === 503)
  );
}

/**
 * Growing backoff, with jitter. Without it, ten clients retrying in lockstep
 * finish off a server that is already struggling.
 */
function retryDelay(attempt: number): number {
  const base = BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
  return base * (0.5 + Math.random());
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(finish, ms);

    function finish() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    }

    signal?.addEventListener("abort", finish, { once: true });
  });
}

/**
 * One network round trip, bounded in time.
 *
 * The timeout and the caller's cancellation are two distinct signals relayed to
 * a single controller: `AbortSignal.any` is not available everywhere the
 * application has to run.
 */
async function sendOnce(url: string, options: RequestOptions): Promise<Response> {
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

/** Send, with timed retry when the method and the error allow it. */
async function send(path: string, options: RequestOptions): Promise<Response> {
  const url = `${getBaseUrl()}${path}`;
  const maxAttempts = IDEMPOTENT_METHODS.includes(options.method ?? "GET") ? MAX_ATTEMPTS : 1;

  for (let attempt = 1; ; attempt++) {
    let error: ApiError;

    try {
      const response = await sendOnce(url, options);
      if (response.ok) return response;
      error = await toApiError(response);
    } catch (cause) {
      if (!(cause instanceof ApiError)) throw cause;
      error = cause;
    }

    if (attempt >= maxAttempts || !isRetryable(error)) throw error;

    await wait(retryDelay(attempt), options.signal);
  }
}

/**
 * A call expecting a body, validated against its schema.
 *
 * Typing alone protects nothing: `schema` is what guarantees that what comes
 * out of here really matches what is announced.
 */
export async function request<T extends z.ZodType>(
  path: string,
  options: RequestOptions & { schema: T },
): Promise<z.infer<T>> {
  const response = await send(path, options);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  const parsed = options.schema.safeParse(payload);

  if (!parsed.success) {
    const error = new ApiError({
      kind: "network",
      status: response.status,
      message: "Reponse inattendue du serveur.",
    });
    // The technical detail stays attached to the error for reporting, without
    // ever being shown to the bookseller.
    error.cause = parsed.error;
    throw error;
  }

  return parsed.data;
}

/** Call with no expected response body, typically a 204. */
export async function requestNoContent(path: string, options: RequestOptions): Promise<void> {
  await send(path, options);
}
