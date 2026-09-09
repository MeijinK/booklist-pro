import { z } from "zod";
import { BookSchema, type Book } from "./livre";

/* --------------------------------------------------------------------- */
/* Ce que l'API renvoie                                                    */
/* --------------------------------------------------------------------- */

/** Forme commune a toutes les erreurs de l'API : { erreur, message, champs }. */
export const ApiErrorBodySchema = z.object({
  erreur: z.string(),
  message: z.string().optional(),
  champs: z.record(z.string(), z.string()).optional(),
});

/** Corps specifique d'un 409, qui porte la fiche serveur et sa version. */
export const ConflictBodySchema = z.object({
  erreur: z.literal("conflit"),
  message: z.string(),
  serveur: BookSchema,
  versionAttendue: z.number().int(),
});

export const AUTH_CODES = [
  "jeton_absent",
  "jeton_expire",
  "jeton_invalide",
  "droits_insuffisants",
] as const;

export type AuthCode = (typeof AUTH_CODES)[number];

/* --------------------------------------------------------------------- */
/* Ce que l'application manipule                                           */
/* --------------------------------------------------------------------- */

/**
 * Panne de transport ou indisponibilite passagere : coupure reseau, delai
 * depasse, 503 du mode degrade, reponse illisible. Toujours reessayable.
 */
export type NetworkError = {
  kind: "network";
  message: string;
  /** Absent quand la requete n'a jamais abouti. */
  status?: number;
};

/** 422 : le serveur refuse la saisie, champ par champ. Ne pas reessayer. */
export type ValidationError = {
  kind: "validation";
  message: string;
  champs: Record<string, string>;
};

/** 409 : la fiche a change entre temps. Porte de quoi arbitrer. */
export type ConflictError = {
  kind: "conflict";
  message: string;
  serveur: Book;
  versionAttendue: number;
};

/** 401 et 403. Le code distingue ce qui se rejoue de ce qui se signale. */
export type AuthError = {
  kind: "auth";
  message: string;
  code: AuthCode;
};

/**
 * Union discriminee sur `kind`. Le sujet exige que 422 et 503 ne soient pas
 * traites de la meme facon : c'est ce discriminant qui l'impose au compilateur.
 */
export type ApiErrorDetail = NetworkError | ValidationError | ConflictError | AuthError;

/**
 * Erreur applicative levee par la couche services.
 *
 * Une vraie Error, et non un objet nu : les traces d'appel sont conservees et
 * TanStack Query, qui type son `error` en Error, la transporte sans conversion.
 */
export class ApiError extends Error {
  readonly detail: ApiErrorDetail;

  constructor(detail: ApiErrorDetail) {
    super(detail.message);
    this.name = "ApiError";
    this.detail = detail;
  }
}
