import { ApiErrorBodySchema } from "@/domain";
import { sendOnce, type RequestOptions } from "@/services/api/transport";

import { jetonAcces, rafraichir } from "./jetons";

/**
 * The one interceptor. Every request of the application passes here:
 * bearer injection, detection of an expired token, refresh, one replay.
 *
 * Only `jeton_expire` triggers a refresh. A missing or forged token is not
 * something a refresh repairs, and treating every 401 the same would loop on a
 * server that keeps refusing.
 *
 * The replay is sent once and returned as is: a 401 on the replay reaches the
 * caller as an auth error rather than starting a second round.
 */
export async function envoyerAuthentifie(
  url: string,
  options: RequestOptions,
): Promise<Response> {
  if (options.auth === false) return sendOnce(url, options);

  const premiere = await sendOnce(url, avecJeton(options, jetonAcces()));
  if (premiere.status !== 401 || !(await estExpire(premiere))) return premiere;

  // Shared by every caller that lands here at the same moment: see jetons.ts.
  const nouveau = await rafraichir();
  return sendOnce(url, avecJeton(options, nouveau));
}

function avecJeton(options: RequestOptions, jeton: string | null): RequestOptions {
  if (jeton === null) return options;
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${jeton}` } };
}

/** Reads the error code on a clone: the body must stay readable for toApiError. */
async function estExpire(response: Response): Promise<boolean> {
  try {
    const parsed = ApiErrorBodySchema.safeParse(await response.clone().json());
    return parsed.success && parsed.data.erreur === "jeton_expire";
  } catch {
    // Unreadable body: not the expiry the API documents.
    return false;
  }
}
