import type { z } from "zod";

import { ApiError } from "@/domain";
import { getBaseUrl, REQUEST_TIMEOUT_MS } from "@/services/config";
import { toApiError } from "./erreurs";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Signal fourni par l'appelant, typiquement celui d'une requete TanStack Query. */
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * Methodes qu'on peut rejouer sans creer de doublon. POST en est exclu : un 503
 * ne dit pas si le serveur a traite la creation avant d'echouer, et rejouer
 * produirait deux ouvrages. Au lot 4, la file de mutations portera un
 * identifiant client qui rendra POST /sync rejouable a son tour.
 */
const IDEMPOTENT_METHODS: readonly HttpMethod[] = ["GET", "PUT", "PATCH", "DELETE"];

const MAX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 300;

/** Seuls une indisponibilite passagere et une requete jamais partie se rejouent. */
function isRetryable(error: ApiError): boolean {
  return (
    error.detail.kind === "network" &&
    (error.detail.status === undefined || error.detail.status === 503)
  );
}

/**
 * Temporisation croissante, avec gigue. Sans elle, dix clients qui reessaient
 * en cadence achevent un serveur deja en difficulte.
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
 * Un aller-retour reseau, borne dans le temps.
 *
 * Le delai d'expiration et l'annulation de l'appelant sont deux signaux
 * distincts relayes vers un meme controleur : `AbortSignal.any` n'est pas
 * disponible partout ou l'application doit tourner.
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
    // Annulation demandee par l'appelant : ce n'est pas une panne. On laisse
    // remonter tel quel pour que TanStack Query y voie une requete annulee et
    // n'affiche pas d'erreur a chaque frappe dans la barre de recherche.
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

/** Envoi, avec reessai temporise quand la methode et l'erreur s'y pretent. */
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
 * Appel attendant un corps, valide contre son schema.
 *
 * Le typage seul ne protege de rien : c'est `schema` qui garantit que ce qui
 * ressort d'ici correspond vraiment a ce qui est annonce.
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
    // Le detail technique reste attache a l'erreur pour la remontee, sans
    // jamais s'afficher au libraire.
    error.cause = parsed.error;
    throw error;
  }

  return parsed.data;
}

/** Appel sans corps de reponse attendu, typiquement un 204. */
export async function requestNoContent(path: string, options: RequestOptions): Promise<void> {
  await send(path, options);
}
