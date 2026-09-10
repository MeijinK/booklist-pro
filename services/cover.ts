import { getBaseUrl } from "./config";

/**
 * Resolution of a cover address.
 *
 * The API returns three shapes for the same field: an absolute path it serves
 * itself (`/covers/<id>.svg`, `/media/<id>.png`), a full address to a
 * third-party service, or `null`. A single function handles them, here: spread
 * across components, the rule would be rewritten three times and a broken image
 * would eventually slip through.
 */

export type Cover =
  | { kind: "remote"; uri: string }
  | { kind: "fallback"; initials: string };

/** Initials of the title, the fallback when no image is available or readable. */
export function titleInitials(title: string): string {
  const words = title
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((word) => word !== "");

  if (words.length === 0) return "?";

  const letters = words.slice(0, 2).map((word) => [...word][0] ?? "");
  return letters.join("").toLocaleUpperCase("fr-FR");
}

/**
 * `cover` is the field as the server returned it, `title` feeds the fallback.
 * The function never yields an empty address: the caller gets either an image
 * to load, or what it takes to draw a substitute.
 */
export function resolveCover(cover: string | null, title: string): Cover {
  const value = cover?.trim();

  if (value === undefined || value === "") {
    return { kind: "fallback", initials: titleInitials(title) };
  }

  // Full address: a third-party service hosts the image, leave it alone.
  if (/^https?:\/\//i.test(value)) {
    return { kind: "remote", uri: value };
  }

  // Path served by the API: only the base URL is missing.
  if (value.startsWith("/")) {
    return { kind: "remote", uri: `${getBaseUrl()}${value}` };
  }

  // Unknown shape: a readable substitute beats a broken image.
  return { kind: "fallback", initials: titleInitials(title) };
}
