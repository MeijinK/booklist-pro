import { z } from "zod";
import { BookSchema, type Book } from "./book";

/* --------------------------------------------------------------------- */
/* What the API returns                                                    */
/* --------------------------------------------------------------------- */

/** Shape common to every API error: { erreur, message, champs }. */
export const ApiErrorBodySchema = z.object({
  erreur: z.string(),
  message: z.string().optional(),
  champs: z.record(z.string(), z.string()).optional(),
});

/** Body specific to a 409, carrying the server record and its version. */
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
  "identifiants_invalides",
  "refresh_invalide",
] as const;

export type AuthCode = (typeof AUTH_CODES)[number];

/* --------------------------------------------------------------------- */
/* What the application manipulates                                        */
/* --------------------------------------------------------------------- */

/**
 * Transport failure or temporary unavailability: network drop, timeout, 503
 * from degraded mode, unreadable response. Always retryable.
 */
export type NetworkError = {
  kind: "network";
  message: string;
  /** Absent when the request never reached the server. */
  status?: number;
};

/** 422: the server refuses the input, field by field. Do not retry. */
export type ValidationError = {
  kind: "validation";
  message: string;
  fields: Record<string, string>;
};

/** 409: the record changed in the meantime. Carries what is needed to arbitrate. */
export type ConflictError = {
  kind: "conflict";
  message: string;
  server: Book;
  expectedVersion: number;
};

/** 401 and 403. The code tells apart what is replayed from what is reported. */
export type AuthError = {
  kind: "auth";
  message: string;
  code: AuthCode;
};

/**
 * 404: the resource does not exist. Distinct from a failure, because the
 * interface must turn it into a contextualised empty state rather than an error
 * screen, and because retrying is pointless.
 */
export type NotFoundError = {
  kind: "notFound";
  message: string;
};

/**
 * Union discriminated on `kind`. The brief requires that 422 and 503 not be
 * handled the same way: this discriminant is what enforces it at compile time.
 */
export type ApiErrorDetail =
  | NetworkError
  | ValidationError
  | ConflictError
  | AuthError
  | NotFoundError;

/**
 * Application-level error raised by the services layer.
 *
 * A real Error, and not a bare object: call stacks are preserved, and TanStack
 * Query, which types its `error` as Error, carries it without conversion.
 */
export class ApiError extends Error {
  readonly detail: ApiErrorDetail;

  constructor(detail: ApiErrorDetail) {
    super(detail.message);
    this.name = "ApiError";
    this.detail = detail;
  }
}
