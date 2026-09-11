import type { Book, MutationLivre } from "@/domain";
import { champsEnConflit, choixInitial, fusionner, valeursLocales } from "@/services/sync/fusion";

const T = "2026-09-11T10:00:00.000Z";
const serveur: Book = {
  id: "l-1",
  titre: "Serveur",
  auteur: "A",
  editeur: "E",
  annee: 2000,
  lu: true,
  favori: false,
  note: null,
  couverture: null,
  createdAt: T,
  updatedAt: T,
  version: 4,
};
const maj: MutationLivre = {
  id: "m",
  type: "update",
  creeLe: T,
  livreId: "l-1",
  baseVersion: 3,
  champs: { titre: "Mien", auteur: "A", lu: false },
};

describe("champsEnConflit", () => {
  it("ne liste que les champs que le libraire a touches, et dit lesquels different", () => {
    expect(champsEnConflit(maj, serveur)).toEqual([
      { champ: "titre", locale: "Mien", serveur: "Serveur", differe: true },
      { champ: "auteur", locale: "A", serveur: "A", differe: false },
      { champ: "lu", locale: false, serveur: true, differe: true },
    ]);
  });

  it("liste tous les champs d'une creation", () => {
    const c: MutationLivre = {
      id: "c",
      type: "create",
      creeLe: T,
      livreId: "local:1",
      livre: { titre: "X", auteur: "Y", editeur: "Z", annee: 1999, lu: false },
    };
    expect(champsEnConflit(c, serveur).map((l) => l.champ)).toEqual([
      "titre",
      "auteur",
      "editeur",
      "annee",
      "lu",
    ]);
  });

  it("est vide pour une suppression", () => {
    const d: MutationLivre = { id: "d", type: "delete", creeLe: T, livreId: "l-1" };
    expect(champsEnConflit(d, serveur)).toEqual([]);
  });
});

describe("valeursLocales", () => {
  it("rend ce que le libraire avait saisi, sans serveur en face", () => {
    expect(valeursLocales(maj)).toEqual([
      { champ: "titre", valeur: "Mien" },
      { champ: "auteur", valeur: "A" },
      { champ: "lu", valeur: false },
    ]);
  });
});

describe("choixInitial", () => {
  it("preselectionne la version locale la ou elle differe seulement", () => {
    expect(choixInitial(champsEnConflit(maj, serveur))).toEqual({ titre: "locale", lu: "locale" });
  });
});

describe("fusionner", () => {
  it("ne renvoie que les champs ou le libraire garde sa version", () => {
    const lignes = champsEnConflit(maj, serveur);
    expect(fusionner(lignes, { titre: "locale", lu: "serveur" })).toEqual({ titre: "Mien" });
  });

  it("renvoie un objet vide si tout vient du serveur", () => {
    expect(fusionner(champsEnConflit(maj, serveur), {})).toEqual({});
  });
});
