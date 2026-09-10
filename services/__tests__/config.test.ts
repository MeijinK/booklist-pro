import { resolveBaseUrl } from "@/services/config";

describe("resolveBaseUrl", () => {
  it("accepte une URL absolue sans barre oblique finale", () => {
    expect(resolveBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("ignore les espaces autour de la valeur", () => {
    expect(resolveBaseUrl("  http://localhost:3000  ")).toBe("http://localhost:3000");
  });

  it("dit quoi faire quand la variable est absente", () => {
    expect(() => resolveBaseUrl(undefined)).toThrow(/Copiez \.env\.example/);
  });

  it("traite une valeur vide comme une variable absente", () => {
    expect(() => resolveBaseUrl("   ")).toThrow(/EXPO_PUBLIC_API_URL est absente/);
  });

  it("refuse une valeur qui n'est pas une URL absolue", () => {
    expect(() => resolveBaseUrl("localhost:3000")).toThrow(/URL absolue/);
  });

  it("refuse une barre oblique finale, qui produirait des chemins doubles", () => {
    expect(() => resolveBaseUrl("http://localhost:3000/")).toThrow(/barre oblique/);
  });
});
