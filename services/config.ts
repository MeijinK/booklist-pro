import { z } from "zod";

/**
 * Delay beyond which a request is abandoned.
 * A client policy, not a deployment setting: the value does not vary from one
 * workstation to another. It stays above the latency of the API's degraded mode
 * (1.5 s + 40 % jitter) so a healthy request is never abandoned.
 */
export const REQUEST_TIMEOUT_MS = 10_000;

const BaseUrlSchema = z
  // The protocol is checked explicitly: without this constraint, "localhost:3000"
  // passes for a valid URL whose protocol is "localhost", and every request
  // would go nowhere without anything reporting it.
  .url({
    protocol: /^https?$/,
    error: "EXPO_PUBLIC_API_URL doit etre une URL absolue, par exemple http://localhost:3000.",
  })
  .refine(
    (value) => !value.endsWith("/"),
    "EXPO_PUBLIC_API_URL ne doit pas se terminer par une barre oblique.",
  );

/**
 * Validates the API base URL. A pure function: the raw value is passed as an
 * argument rather than read here, which makes it testable without touching the
 * process environment.
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
 * The only point in the project that knows the API URL.
 * Deferred read: the module can be imported without the environment being
 * configured, which the tests rely on.
 */
export function getBaseUrl(): string {
  return resolveBaseUrl(process.env.EXPO_PUBLIC_API_URL);
}
