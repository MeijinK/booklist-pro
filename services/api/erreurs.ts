import {
  ApiError,
  ApiErrorBodySchema,
  AUTH_CODES,
  ConflictBodySchema,
  type ApiErrorDetail,
  type AuthCode,
} from "@/domain";

/**
 * Lit le corps d'une reponse en echec sans jamais lever : un serveur en panne
 * peut tres bien renvoyer du HTML ou rien du tout, et perdre le statut HTTP
 * parce que le corps est illisible serait le pire des echanges.
 */
async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Message lisible fourni par l'API, ou repli generique. */
function readMessage(body: unknown, fallback: string): string {
  const parsed = ApiErrorBodySchema.safeParse(body);
  return parsed.success && parsed.data.message ? parsed.data.message : fallback;
}

function isAuthCode(value: string): value is AuthCode {
  return (AUTH_CODES as readonly string[]).includes(value);
}

/**
 * Traduit une reponse HTTP en echec en erreur applicative.
 *
 * Le sujet impose que 422 et 503 ne se traitent pas de la meme facon : c'est
 * ici que la distinction se fait, une seule fois, plutot que dans chaque ecran.
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
        serveur: conflict.data.serveur,
        versionAttendue: conflict.data.versionAttendue,
      };
    }

    // Statut 409 mais corps inexploitable : on ne peut pas arbitrer sans la
    // fiche serveur, donc on ne pretend pas le contraire.
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
      champs: parsed.success ? (parsed.data.champs ?? {}) : {},
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
