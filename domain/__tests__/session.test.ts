import { retourSur } from "@/domain";

describe("retourSur", () => {
  it("garde un chemin interne", () => {
    expect(retourSur("/books/l-1")).toBe("/books/l-1");
  });

  it("prend la premiere valeur quand le parametre est repete", () => {
    expect(retourSur(["/books/new", "/x"])).toBe("/books/new");
  });

  it.each([
    undefined,
    "",
    "books",
    "//evil.example",
    "http://evil.example",
    "/connexion",
    "/connexion?retour=/",
  ])("retombe sur l'accueil pour %p", (valeur) => {
    expect(retourSur(valeur)).toBe("/");
  });
});
