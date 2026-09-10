import { initialesDuTitre, resoudreCouverture } from "@/services/couverture";

const BASE = "http://localhost:3000";

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE;
});

describe("resoudreCouverture", () => {
  it("prefixe un chemin servi par l'API", () => {
    expect(resoudreCouverture("/covers/abc.svg", "Dune")).toEqual({
      kind: "distante",
      uri: `${BASE}/covers/abc.svg`,
    });
  });

  it("prefixe aussi la seconde forme de chemin", () => {
    expect(resoudreCouverture("/media/abc.png", "Dune")).toEqual({
      kind: "distante",
      uri: `${BASE}/media/abc.png`,
    });
  });

  it("laisse une adresse complete intacte", () => {
    const distante = "https://covers.openlibrary.org/b/id/42-L.jpg";

    expect(resoudreCouverture(distante, "Dune")).toEqual({ kind: "distante", uri: distante });
  });

  it("bascule sur les initiales quand la couverture est absente", () => {
    expect(resoudreCouverture(null, "La Horde du Contrevent")).toEqual({
      kind: "repli",
      initiales: "LH",
    });
  });

  it("traite une chaine vide comme une couverture absente", () => {
    expect(resoudreCouverture("   ", "Dune")).toEqual({ kind: "repli", initiales: "D" });
  });

  it("prefere un repli lisible a une forme inconnue", () => {
    expect(resoudreCouverture("covers/abc.svg", "Dune")).toEqual({
      kind: "repli",
      initiales: "D",
    });
  });
});

describe("initialesDuTitre", () => {
  it("prend les deux premieres initiales", () => {
    expect(initialesDuTitre("le seigneur des anneaux")).toBe("LS");
  });

  it("ignore la ponctuation de tete", () => {
    expect(initialesDuTitre("« Dune »")).toBe("D");
  });

  it("rend un substitut plutot que rien pour un titre sans lettre", () => {
    expect(initialesDuTitre("   ")).toBe("?");
  });
});
