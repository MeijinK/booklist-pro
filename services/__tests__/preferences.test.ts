import {
  readLocale,
  readThemePreference,
  writeLocale,
  writeThemePreference,
} from "@/services/preferences";
import { storage } from "@/services/storage";

jest.mock("@/services/storage", () => ({
  storage: { read: jest.fn(), write: jest.fn(), remove: jest.fn() },
}));

const store = storage as jest.Mocked<typeof storage>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("readThemePreference", () => {
  it("returns the stored choice", async () => {
    store.read.mockResolvedValue("dark");

    await expect(readThemePreference()).resolves.toBe("dark");
  });

  it("follows the device when nothing has been stored yet", async () => {
    store.read.mockResolvedValue(null);

    await expect(readThemePreference()).resolves.toBe("system");
  });

  it("falls back rather than trusting a value it does not recognise", async () => {
    // Left by an older version, or by a corrupted store.
    store.read.mockResolvedValue("sepia");

    await expect(readThemePreference()).resolves.toBe("system");
  });
});

describe("writeThemePreference", () => {
  it("stores the choice under a namespaced key", async () => {
    await writeThemePreference("light");

    expect(store.write).toHaveBeenCalledWith("booklist.theme", "light");
  });
});

describe("readLocale", () => {
  it("returns the stored language", async () => {
    store.read.mockResolvedValue("en");

    await expect(readLocale()).resolves.toBe("en");
  });

  it("returns null when no language was chosen, meaning follow the device", async () => {
    store.read.mockResolvedValue(null);

    await expect(readLocale()).resolves.toBeNull();
  });

  it("ignores a language the interface is not translated into", async () => {
    store.read.mockResolvedValue("es");

    await expect(readLocale()).resolves.toBeNull();
  });
});

describe("writeLocale", () => {
  it("stores an explicit choice", async () => {
    await writeLocale("fr");

    expect(store.write).toHaveBeenCalledWith("booklist.locale", "fr");
  });

  it("removes the entry when going back to the device language", async () => {
    // Storing a marker would be a second thing to parse later; absence already
    // means exactly that.
    await writeLocale(null);

    expect(store.remove).toHaveBeenCalledWith("booklist.locale");
    expect(store.write).not.toHaveBeenCalled();
  });
});
