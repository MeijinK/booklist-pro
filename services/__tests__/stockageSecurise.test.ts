import { stockageSecurise } from "@/services/stockageSecurise";
import { stockageSecurise as stockageWeb } from "@/services/stockageSecurise.web";

describe("stockageSecurise (natif)", () => {
  it("ecrit, relit et efface une valeur", async () => {
    await stockageSecurise.write("k", "v");
    expect(await stockageSecurise.read("k")).toBe("v");
    await stockageSecurise.remove("k");
    expect(await stockageSecurise.read("k")).toBeNull();
  });
});

describe("stockageSecurise (navigateur)", () => {
  const memoire = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => memoire.get(key) ?? null,
    setItem: (key: string, value: string) => void memoire.set(key, value),
    removeItem: (key: string) => void memoire.delete(key),
  };
  const fenetreInitiale = Object.getOwnPropertyDescriptor(globalThis, "window");

  beforeEach(() => {
    memoire.clear();
    Object.defineProperty(globalThis, "window", { value: { localStorage }, configurable: true });
  });

  afterAll(() => {
    if (fenetreInitiale) Object.defineProperty(globalThis, "window", fenetreInitiale);
  });

  it("ecrit, relit et efface une valeur", async () => {
    await stockageWeb.write("k", "v");
    expect(await stockageWeb.read("k")).toBe("v");
    await stockageWeb.remove("k");
    expect(await stockageWeb.read("k")).toBeNull();
  });

  it("rapporte l'absence quand le navigateur refuse le stockage", async () => {
    Object.defineProperty(globalThis, "window", {
      get() {
        throw new Error("SecurityError");
      },
      configurable: true,
    });

    await expect(stockageWeb.write("k", "v")).resolves.toBeUndefined();
    await expect(stockageWeb.read("k")).resolves.toBeNull();
  });
});
