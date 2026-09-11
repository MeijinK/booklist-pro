/** Why the bookseller finds themselves on the login screen without asking. */
export type RaisonDeconnexion = "expiree";

/**
 * Where to send the bookseller back after login.
 *
 * The value comes from the URL and is therefore untrusted: only an internal
 * path is honoured. A protocol-relative `//host` or an absolute URL would turn
 * the login screen into an open redirect; landing back on `/connexion` would
 * loop.
 */
export function retourSur(brut: unknown): string {
  const valeur = Array.isArray(brut) ? brut[0] : brut;
  if (typeof valeur !== "string") return "/";
  if (!valeur.startsWith("/") || valeur.startsWith("//") || valeur.startsWith("/connexion")) {
    return "/";
  }
  return valeur;
}
