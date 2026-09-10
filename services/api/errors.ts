import {
  ApiError,
  ApiErrorBodySchema,
  AUTH_CODES,
  ConflictBodySchema,
  type ApiErrorDetail,
  type AuthCode,
} from "@/domain";

/**
 * Reads the body of a failed response without ever throwing: a broken server
 * may well return HTML or nothing at all, and losing the HTTP status because
 * the body is unreadable would be the worst of trades.
 */
async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Readable message supplied by the API, or a generic fallback. */
function readMessage(body: unknown, fallback: string): string {
  const parsed = ApiErrorBodySchema.safeParse(body);
  return parsed.success && parsed.data.message ? parsed.data.message : fallback;
}

function isAuthCode(value: string): value is AuthCode {
  return (AUTH_CODES as readonly string[]).includes(value);
}

/**
 * Translates a failed HTTP response into an application error.
 *
 * The brief requires 422 and 503 not to be handled the same way: this is where
 * the distinction is made, once, rather than in every screen.
 */
export async function toApiError(response: Response): Promise<ApiError> {
  const body = await readBody(response);

  return new ApiError(buildDetail(response, body));
}

function buildDetail(response: Response, body: unknown): ApiErrorDetail {
  const { status } = response;

  if (status === 404) {
    return { kind: "notFound", message: readMessage(body, "Ressource introuvable.") };
  }

  if (status === 409) {
    const conflict = ConflictBodySchema.safeParse(body);

    if (conflict.success) {
      return {
        kind: "conflict",
        message: conflict.data.message,
        server: conflict.data.serveur,
        expectedVersion: conflict.data.versionAttendue,
      };
    }

    // Status 409 but an unusable body: we cannot arbitrate without the server
    // record, so we do not pretend otherwise.
    return {
      kind: "network",
      status,
      message: "Conflit de version signale par le serveur, mais sa reponse est illisible.",
    };
  }

  if (status === 422) {
    const parsed = ApiErrorBodySchema.safeParse(body);

    return {
      kind: "validation",
      message: readMessage(body, "Saisie refusee par le serveur."),
      fields: parsed.success ? (parsed.data.champs ?? {}) : {},
    };
  }

  if (status === 401 || status === 403) {
    const parsed = ApiErrorBodySchema.safeParse(body);
    const code = parsed.success && isAuthCode(parsed.data.erreur) ? parsed.data.erreur : undefined;

    return {
      kind: "auth",
      message: readMessage(body, "Acces refuse."),
      code: code ?? (status === 403 ? "droits_insuffisants" : "jeton_invalide"),
    };
  }

  return {
    kind: "network",
    status,
    message: readMessage(
      body,
      status === 503
        ? "Service momentanement indisponible."
        : `Le serveur a repondu ${status}.`,
    ),
  };
}
