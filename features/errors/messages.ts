import { ApiError, type ApiErrorDetail, type AuthCode } from "@/domain";

/**
 * Translates an application error into a displayable message.
 *
 * The brief requires 422 and 503 not to look alike on screen: one is fixed, the
 * other is waited out. The `kind` discriminant carries that difference, and
 * this function makes it visible to the bookseller.
 */

export type ErrorMessage = {
  title: string;
  detail: string;
  /** False when retrying can change nothing: the button is then not offered. */
  retryable: boolean;
};

const UNEXPECTED: ErrorMessage = {
  title: "Une erreur inattendue s'est produite",
  detail: "Reessayez ; si le probleme persiste, prevenez votre responsable reseau.",
  retryable: true,
};

export function errorMessage(error: unknown): ErrorMessage {
  if (!(error instanceof ApiError)) return UNEXPECTED;
  return fromDetail(error.detail);
}

function fromDetail(detail: ApiErrorDetail): ErrorMessage {
  switch (detail.kind) {
    case "network":
      return detail.status === undefined
        ? {
            title: "Le serveur ne repond pas",
            detail: "Verifiez la connexion de la boutique, puis reessayez.",
            retryable: true,
          }
        : {
            title: "Le service est momentanement indisponible",
            detail:
              "Le serveur a repondu, mais pas ce qui etait attendu. Reessayez dans un instant.",
            retryable: true,
          };

    case "validation":
      return {
        title: "La saisie a ete refusee",
        detail: detail.message,
        retryable: false,
      };

    case "conflict":
      return {
        title: "La fiche a ete modifiee entre temps",
        detail: "Un collegue l'a enregistree avant vous. Rechargez-la avant de la corriger.",
        retryable: true,
      };

    case "auth":
      return authMessage(detail.code);

    case "notFound":
      return {
        title: "Cette fiche n'existe plus",
        detail: "Elle a sans doute ete supprimee depuis un autre poste.",
        retryable: false,
      };
  }
}

/**
 * A 403 and an expired session both come back as `auth`, but they call for
 * opposite reactions: one says "ask a colleague", the other "sign in again".
 * The code is what tells them apart.
 */
function authMessage(code: AuthCode): ErrorMessage {
  switch (code) {
    case "droits_insuffisants":
      return {
        title: "Action reservee aux libraires titulaires",
        detail:
          "Votre compte est en lecture seule. Demandez a un titulaire d'effectuer cette modification.",
        retryable: false,
      };
    case "identifiants_invalides":
      return {
        title: "Connexion refusee",
        detail: "Email ou mot de passe incorrect.",
        retryable: false,
      };
    default:
      return {
        title: "Votre session n'est plus valide",
        detail: "Reconnectez-vous pour continuer.",
        retryable: false,
      };
  }
}
