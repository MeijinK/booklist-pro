/**
 * The bookseller's own settings, as opposed to catalogue data: they belong to
 * the person and the workstation, never to the server.
 */

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Following the device is the default the subject asks for. The shop's own
 * lighting argues for light — a dark screen on a sunlit shop window turns into
 * a mirror — but that is a choice the bookseller makes, not one we make for
 * them on first launch.
 */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

/** Null means "follow the device", the same contract as the theme. */
export const DEFAULT_LOCALE: Locale | null = null;

/**
 * Stored settings are read back from a device we do not control: the value may
 * come from an older version of the app, a hand-edited store, or a corrupted
 * one. Parsing rather than casting is what keeps a bad value from reaching the
 * interface.
 */
export function parseThemePreference(value: unknown): ThemePreference | null {
  return isMember(THEME_PREFERENCES, value) ? value : null;
}

export function parseLocale(value: unknown): Locale | null {
  return isMember(LOCALES, value) ? value : null;
}

function isMember<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}
