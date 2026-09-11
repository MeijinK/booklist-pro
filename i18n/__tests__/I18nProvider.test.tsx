import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ReactNode } from "react";

import { en, fr, I18nProvider, useTranslation } from "@/i18n";

const setPreference = jest.fn();

jest.mock("expo-localization", () => ({ getLocales: jest.fn() }));
jest.mock("@/hooks/use-stored-preference", () => ({ useStoredPreference: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const getLocales = require("expo-localization").getLocales as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const useStoredPreference = require("@/hooks/use-stored-preference")
  .useStoredPreference as jest.Mock;

function show(render: (i18n: ReturnType<typeof useTranslation>) => string) {
  function Probe() {
    return <Text>{render(useTranslation())}</Text>;
  }

  return <Probe />;
}

function wrap(children: ReactNode) {
  return render(<I18nProvider>{children}</I18nProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  getLocales.mockReturnValue([{ languageCode: "fr" }]);
  useStoredPreference.mockReturnValue({ value: undefined, set: setPreference, loaded: true });
});

describe("catalogues", () => {
  it("cover exactly the same keys, so no screen can fall back to a raw key", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it("leave no message empty", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim()).not.toBe("");
      expect(key).not.toBe("");
    }
  });
});

describe("I18nProvider", () => {
  it("follows the workstation when the bookseller has not chosen", () => {
    getLocales.mockReturnValue([{ languageCode: "en" }]);

    wrap(show((i18n) => i18n.t("screen.list")));

    expect(screen.getByText("The collection")).toBeOnTheScreen();
  });

  it("falls back to French when the workstation speaks a language we do not", () => {
    getLocales.mockReturnValue([{ languageCode: "es" }]);

    wrap(show((i18n) => i18n.t("screen.list")));

    expect(screen.getByText("Le fonds")).toBeOnTheScreen();
  });

  it("lets an explicit choice override the workstation", () => {
    getLocales.mockReturnValue([{ languageCode: "fr" }]);
    useStoredPreference.mockReturnValue({ value: "en", set: setPreference, loaded: true });

    wrap(show((i18n) => i18n.t("screen.list")));

    expect(screen.getByText("The collection")).toBeOnTheScreen();
  });

  it("fills the placeholders of a message", () => {
    wrap(show((i18n) => i18n.t("record.deleted", { titre: "Bilbo" })));

    expect(screen.getByText("« Bilbo » a été retiré du fonds.")).toBeOnTheScreen();
  });

  it("leaves a marker visible rather than printing undefined", () => {
    // A missing value is a bug to see, not one to hide behind an empty string.
    wrap(show((i18n) => i18n.t("record.deleted")));

    expect(screen.getByText(/\{titre\}/)).toBeOnTheScreen();
  });
});

describe("plural", () => {
  it("agrees the singular", () => {
    wrap(show((i18n) => i18n.plural("enrichment.editions", 1)));

    expect(screen.getByText("1 édition référencée")).toBeOnTheScreen();
  });

  it("agrees the plural", () => {
    wrap(show((i18n) => i18n.plural("enrichment.editions", 42)));

    expect(screen.getByText("42 éditions référencées")).toBeOnTheScreen();
  });

  it("prefers a dedicated zero when the catalogue offers one", () => {
    wrap(show((i18n) => i18n.plural("enrichment.editions", 0)));

    expect(screen.getByText("Aucune édition référencée")).toBeOnTheScreen();
  });

  it("groups the thousands of the count it inserts", () => {
    wrap(show((i18n) => i18n.plural("enrichment.editions", 1234)));

    expect(screen.getByText(/1.234 éditions référencées/)).toBeOnTheScreen();
  });
});

describe("formats", () => {
  it("writes a date the French way", () => {
    wrap(show((i18n) => i18n.formatDate("2026-07-28T09:40:00.000Z")));

    expect(screen.getByText("28 juillet 2026")).toBeOnTheScreen();
  });

  it("writes a date the English way once the language changes", () => {
    useStoredPreference.mockReturnValue({ value: "en", set: setPreference, loaded: true });

    wrap(show((i18n) => i18n.formatDate("2026-07-28T09:40:00.000Z")));

    expect(screen.getByText("28 July 2026")).toBeOnTheScreen();
  });

  it("keeps an unparsable date rather than showing an invalid one", () => {
    wrap(show((i18n) => i18n.formatDate("pas une date")));

    expect(screen.getByText("pas une date")).toBeOnTheScreen();
  });

  it("keeps the time on a reading note, which the day alone would not order", () => {
    wrap(show((i18n) => i18n.formatDateTime("2026-07-28T09:40:00.000Z")));

    expect(screen.getByText(/28 juillet 2026 à \d{2}:\d{2}/)).toBeOnTheScreen();
  });
});
