import {
  DEFAULT_LOCALE,
  DEFAULT_THEME_PREFERENCE,
  parseLocale,
  parseThemePreference,
  type Locale,
  type ThemePreference,
} from "@/domain";

import { storage } from "./storage";

/** Namespaced so a future setting never collides with an earlier one. */
const THEME_KEY = "booklist.theme";
const LOCALE_KEY = "booklist.locale";

/**
 * Reading a setting always yields a usable value: an unknown string, left by an
 * older version of the app or by a corrupted store, falls back to the default
 * rather than reaching the interface. This is where the "what if local storage
 * is full or corrupted" question is answered.
 */
export async function readThemePreference(): Promise<ThemePreference> {
  return parseThemePreference(await storage.read(THEME_KEY)) ?? DEFAULT_THEME_PREFERENCE;
}

export async function writeThemePreference(preference: ThemePreference): Promise<void> {
  await storage.write(THEME_KEY, preference);
}

/** Null means the device's own language, which is also the initial state. */
export async function readLocale(): Promise<Locale | null> {
  return parseLocale(await storage.read(LOCALE_KEY)) ?? DEFAULT_LOCALE;
}

export async function writeLocale(locale: Locale | null): Promise<void> {
  if (locale === null) {
    await storage.remove(LOCALE_KEY);
    return;
  }

  await storage.write(LOCALE_KEY, locale);
}
