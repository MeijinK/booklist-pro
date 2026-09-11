import { getLocales } from "expo-localization";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { LOCALES, type Locale } from "@/domain";
import { useStoredPreference } from "@/hooks/use-stored-preference";
import { readLocale, writeLocale } from "@/services/preferences";

import { en } from "./en";
import { fr, type MessageKey, type Messages } from "./fr";

const CATALOGUES: Record<Locale, Messages> = { fr, en };

/** Tags understood by Intl, one per supported language. */
const INTL_TAGS: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };

export type Values = Record<string, string | number>;

export type I18n = {
  /** The language actually applied, once the device has been consulted. */
  locale: Locale;
  /** What the bookseller asked for; `null` means "follow the workstation". */
  preference: Locale | null;
  setPreference: (locale: Locale | null) => void;
  t: (key: MessageKey, values?: Values) => string;
  /** Picks between `.one` and `.other`, then fills `{count}`. */
  plural: (key: string, count: number, values?: Values) => string;
  formatNumber: (value: number) => string;
  /** "28 juillet 2026" / "28 July 2026". */
  formatDate: (iso: string) => string;
  /** Same, with the time: several notes are written on the same day. */
  formatDateTime: (iso: string) => string;
  loaded: boolean;
};

const I18nContext = createContext<I18n | null>(null);

/**
 * The workstation's language, when it is one we speak.
 *
 * Read defensively: this is a native module, and an environment that cannot
 * provide it must fall back to the shop's own language rather than bring the
 * whole interface down for a preference.
 */
function deviceLocale(): Locale {
  try {
    const code = getLocales()[0]?.languageCode;
    return LOCALES.find((locale) => locale === code) ?? "fr";
  } catch {
    return "fr";
  }
}

/** Replaces every `{name}` by its value; an absent value leaves the marker visible. */
function interpolate(text: string, values: Values | undefined): string {
  if (values === undefined) return text;

  return text.replace(/\{(\w+)\}/g, (marker, name: string) => {
    const value = values[name];
    return value === undefined ? marker : String(value);
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const stored = useStoredPreference(readLocale, writeLocale);
  const locale: Locale = stored.value ?? deviceLocale();

  const value = useMemo<I18n>(() => {
    const messages = CATALOGUES[locale];
    const tag = INTL_TAGS[locale];

    const numbers = new Intl.NumberFormat(tag);
    const dates = new Intl.DateTimeFormat(tag, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const times = new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit" });
    // Cardinal rules, so "1 édition" and "2 éditions" agree in every language
    // the catalogue covers, without counting by hand at each call site.
    const plurals = new Intl.PluralRules(tag);

    const t = (key: MessageKey, values?: Values) => interpolate(messages[key], values);

    /** A date nobody can parse is still information; an "Invalid Date" is not. */
    const parse = (iso: string): Date | undefined => {
      const date = new Date(iso);
      return Number.isNaN(date.getTime()) ? undefined : date;
    };

    return {
      locale,
      preference: stored.value ?? null,
      setPreference: stored.set,
      loaded: stored.loaded,
      t,

      plural: (key, count, values) => {
        const suffix = count === 0 && `${key}.zero` in messages ? "zero" : plurals.select(count);
        const exact = `${key}.${suffix}` as MessageKey;
        const fallback = `${key}.other` as MessageKey;
        const chosen = exact in messages ? exact : fallback;

        return interpolate(messages[chosen], { count: numbers.format(count), ...values });
      },

      formatNumber: (n) => numbers.format(n),
      formatDate: (iso) => {
        const date = parse(iso);
        return date === undefined ? iso : dates.format(date);
      },
      formatDateTime: (iso) => {
        const date = parse(iso);
        if (date === undefined) return iso;
        return `${dates.format(date)} ${locale === "fr" ? "à" : "at"} ${times.format(date)}`;
      },
    };
  }, [locale, stored.value, stored.set, stored.loaded]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18n {
  const i18n = useContext(I18nContext);

  if (i18n === null) {
    throw new Error("useTranslation must be called inside an I18nProvider.");
  }

  return i18n;
}
