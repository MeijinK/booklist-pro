import { z } from "zod";

/**
 * Delai au-dela duquel une requete est abandonnee.
 * Politique du client, et non configuration de deploiement : la valeur ne varie
 * pas d'un poste a l'autre. Elle reste superieure a la latence du mode degrade
 * de l'API (1,5 s + 40 % de gigue) pour ne pas abandonner une requete saine.
 */
export const REQUEST_TIMEOUT_MS = 10_000;

const BaseUrlSchema = z
  .url("EXPO_PUBLIC_API_URL doit etre une URL absolue, par exemple http://localhost:3000.")
  .refine(
    (value) => !value.endsWith("/"),
    "EXPO_PUBLIC_API_URL ne doit pas se terminer par une barre oblique.",
  );

/**
 * Valide l'URL de base de l'API. Fonction pure : la valeur brute est passee en
 * argument plutot que lue ici, ce qui la rend testable sans toucher a
 * l'environnement du processus.
 */
export function resolveBaseUrl(raw: string | undefined): string {
  const value = raw?.trim();

  if (value === undefined || value === "") {
    throw new Error(
      "EXPO_PUBLIC_API_URL est absente. Copiez .env.example en .env avant de lancer l'application.",
    );
  }

  const result = BaseUrlSchema.safeParse(value);

  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join(" "));
  }

  return result.data;
}

/**
 * Seul point du projet qui connait l'URL de l'API.
 * Lecture differee : le module peut etre importe sans que l'environnement soit
 * configure, ce dont dependent les tests.
 */
export function getBaseUrl(): string {
  return resolveBaseUrl(process.env.EXPO_PUBLIC_API_URL);
}
