import { parseLocale, parseThemePreference } from "@/domain";

describe("parseThemePreference", () => {
  it.each(["light", "dark", "system"])("accepts %s", (value) => {
    expect(parseThemePreference(value)).toBe(value);
  });

  it("rejects a value left by an older version of the app", () => {
    expect(parseThemePreference("auto")).toBeNull();
  });

  it("rejects anything that is not a string, whatever the store returned", () => {
    expect(parseThemePreference(null)).toBeNull();
    expect(parseThemePreference(undefined)).toBeNull();
    expect(parseThemePreference(1)).toBeNull();
    expect(parseThemePreference({ theme: "dark" })).toBeNull();
  });
});

describe("parseLocale", () => {
  it.each(["fr", "en"])("accepts %s", (value) => {
    expect(parseLocale(value)).toBe(value);
  });

  it("rejects a language the interface is not translated into", () => {
    expect(parseLocale("es")).toBeNull();
  });

  it("rejects a regional variant it cannot honour", () => {
    // Accepting "fr-BE" would mean claiming a translation we do not ship.
    expect(parseLocale("fr-BE")).toBeNull();
  });
});
