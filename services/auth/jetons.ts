import { z } from "zod";

import { ApiError } from "@/domain";
import { toApiError } from "@/services/api/errors";
import { sendOnce } from "@/services/api/transport";
import { getBaseUrl } from "@/services/config";
import { stockageSecurise } from "@/services/stockageSecurise";

const CLE_ACCES = "booklist.jeton.acces";
const CLE_RAFRAICHISSEMENT = "booklist.jeton.rafraichissement";

const RafraichissementSchema = z.object({ accessToken: z.string() });

/**
 * The token vault.
 *
 * The access token is mirrored in memory so the interceptor reads it
 * synchronously on every request. The refresh token never leaves this module:
 * it goes from the secure store to the body of POST /auth/refresh and nowhere
 * else — not into React state, not into an error, not into a log.
 *
 * `rafraichir` is single-flight. Ten requests answered 401 in the same instant
 * would otherwise send ten refreshes; the first caller starts one and the nine
 * others await the same promise.
 */
let accesEnMemoire: string | null = null;
let rafraichissementEnCours: Promise<string> | null = null;
const abonnes = new Set<() => void>();

/** Loads the access token into memory; true when a refresh token is stored. */
export async function chargerJetons(): Promise<boolean> {
  const [acces, rafraichissement] = await Promise.all([
    stockageSecurise.read(CLE_ACCES),
    stockageSecurise.read(CLE_RAFRAICHISSEMENT),
  ]);
  accesEnMemoire = acces;
  return rafraichissement !== null;
}

export async function enregistrerJetons(jetons: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  accesEnMemoire = jetons.accessToken;
  await Promise.all([
    stockageSecurise.write(CLE_ACCES, jetons.accessToken),
    stockageSecurise.write(CLE_RAFRAICHISSEMENT, jetons.refreshToken),
  ]);
}

export function jetonAcces(): string | null {
  return accesEnMemoire;
}

export async function effacerJetons(): Promise<void> {
  accesEnMemoire = null;
  await Promise.all([
    stockageSecurise.remove(CLE_ACCES),
    stockageSecurise.remove(CLE_RAFRAICHISSEMENT),
  ]);
}

/** Called when the server no longer accepts the refresh token: the session is over. */
export function surSessionPerdue(abonne: () => void): () => void {
  abonnes.add(abonne);
  return () => {
    abonnes.delete(abonne);
  };
}

export function rafraichir(): Promise<string> {
  if (rafraichissementEnCours === null) {
    rafraichissementEnCours = executerRafraichissement().finally(() => {
      rafraichissementEnCours = null;
    });
  }
  return rafraichissementEnCours;
}

async function executerRafraichissement(): Promise<string> {
  const refreshToken = await stockageSecurise.read(CLE_RAFRAICHISSEMENT);
  if (refreshToken === null) throw await perdreSession();

  const response = await sendOnce(`${getBaseUrl()}/auth/refresh`, {
    method: "POST",
    body: { refreshToken },
  });

  // 400 (missing) and 401 (invalid or expired) both mean the server will never
  // accept this token again. Anything else is the server's problem, not the
  // session's: the tokens stay and the caller's retry policy applies.
  if (response.status === 400 || response.status === 401) throw await perdreSession();
  if (!response.ok) throw await toApiError(response);

  const parsed = RafraichissementSchema.safeParse(await lireCorps(response));
  if (!parsed.success) {
    throw new ApiError({
      kind: "network",
      status: response.status,
      message: "Reponse inattendue du serveur.",
    });
  }

  accesEnMemoire = parsed.data.accessToken;
  await stockageSecurise.write(CLE_ACCES, parsed.data.accessToken);
  return parsed.data.accessToken;
}

async function perdreSession(): Promise<ApiError> {
  await effacerJetons();
  abonnes.forEach((abonne) => abonne());
  return new ApiError({
    kind: "auth",
    code: "jeton_invalide",
    message: "Votre session n'est plus valide.",
  });
}

async function lireCorps(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Tests only: module state would otherwise leak from one test to the next. */
export function reinitialiserPourTests(): void {
  accesEnMemoire = null;
  rafraichissementEnCours = null;
  abonnes.clear();
}
