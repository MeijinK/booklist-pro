import type { MutationLocale } from "@/domain";
import {
  fusionnerFile,
  livreDepuisCreation,
  noteDepuisMutation,
  nouvelId,
  nouvelIdLocal,
} from "@/services/sync/mutation";

const T = "2026-09-11T10:00:00.000Z";

const creation: MutationLocale = {
  id: "m-c",
  type: "create",
  creeLe: T,
  livreId: "local:1",
  livre: { titre: "Dune", auteur: "Herbert", editeur: "Laffont", annee: 1965, lu: false },
};

type Maj = Extract<MutationLocale, { type: "update" }>;
const maj = (extra: Partial<Maj>): MutationLocale => ({
  id: "m-u",
  type: "update",
  creeLe: T,
  livreId: "l-1",
  champs: {},
  ...extra,
});

describe("identifiants", () => {
  it("sont uniques et les locaux sont prefixes", () => {
    expect(nouvelId()).not.toBe(nouvelId());
    expect(nouvelIdLocal()).toMatch(/^local:/);
  });
});

describe("livreDepuisCreation", () => {
  it("fabrique la fiche telle que la liste la montre avant le serveur", () => {
    const livre = livreDepuisCreation(creation, T);
    expect(livre).toMatchObject({
      id: "local:1",
      titre: "Dune",
      version: 0,
      favori: false,
      note: null,
      couverture: null,
      createdAt: T,
    });
  });
});

describe("noteDepuisMutation", () => {
  it("porte l'id local derive de la mutation", () => {
    const note = noteDepuisMutation({
      id: "m-n",
      type: "note",
      creeLe: T,
      livreId: "l-1",
      contenu: "Bien",
    });
    expect(note).toEqual({ id: "local:m-n", livreId: "l-1", contenu: "Bien", createdAt: T });
  });
});

describe("fusionnerFile", () => {
  it("ajoute une mutation sur un livre inconnu de la file", () => {
    expect(fusionnerFile([], maj({ champs: { lu: true } }))).toHaveLength(1);
  });

  it("fusionne deux updates du meme livre en gardant le premier id et la premiere baseVersion", () => {
    const file = [maj({ id: "a", baseVersion: 3, champs: { titre: "A" } })];
    const resultat = fusionnerFile(file, maj({ id: "b", champs: { lu: true, titre: "B" } }));

    expect(resultat).toEqual([
      expect.objectContaining({ id: "a", baseVersion: 3, champs: { titre: "B", lu: true } }),
    ]);
  });

  it("prend la baseVersion de la nouvelle si la premiere n'en avait pas", () => {
    const file = [maj({ id: "a", champs: { favori: true } })];
    const resultat = fusionnerFile(file, maj({ id: "b", baseVersion: 5, champs: { titre: "B" } }));
    expect(resultat[0]).toMatchObject({ id: "a", baseVersion: 5 });
  });

  it("replie une update sur une creation locale", () => {
    const resultat = fusionnerFile(
      [creation],
      maj({ livreId: "local:1", champs: { favori: true, titre: "Dune 2" } }),
    );
    expect(resultat).toEqual([
      expect.objectContaining({
        id: "m-c",
        type: "create",
        livre: expect.objectContaining({ titre: "Dune 2", favori: true }),
      }),
    ]);
  });

  it("annule creation et notes locales quand le livre local est supprime", () => {
    const note: MutationLocale = {
      id: "m-n",
      type: "note",
      creeLe: T,
      livreId: "local:1",
      contenu: "x",
    };
    const resultat = fusionnerFile([creation, note], {
      id: "m-d",
      type: "delete",
      creeLe: T,
      livreId: "local:1",
    });
    expect(resultat).toEqual([]);
  });

  it("remplace une update par la suppression qui la suit", () => {
    const file = [maj({ id: "a", baseVersion: 3, champs: { titre: "A" } })];
    const resultat = fusionnerFile(file, { id: "d", type: "delete", creeLe: T, livreId: "l-1" });
    expect(resultat).toEqual([expect.objectContaining({ id: "a", type: "delete", baseVersion: 3 })]);
  });

  it("n'ajoute jamais deux fois une note et ne la fusionne pas", () => {
    const n1: MutationLocale = { id: "n1", type: "note", creeLe: T, livreId: "l-1", contenu: "a" };
    const n2: MutationLocale = { id: "n2", type: "note", creeLe: T, livreId: "l-1", contenu: "b" };
    expect(fusionnerFile([n1], n2)).toHaveLength(2);
  });

  it("ne touche pas a une mutation en vol : la nouvelle est ajoutee a part", () => {
    const file = [maj({ id: "a", champs: { titre: "A" } })];
    const resultat = fusionnerFile(file, maj({ id: "b", champs: { lu: true } }), new Set(["a"]));
    expect(resultat.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("ne modifie pas la file recue", () => {
    const file = [maj({ id: "a", champs: { titre: "A" } })];
    const copie = structuredClone(file);
    fusionnerFile(file, maj({ id: "b", champs: { lu: true } }));
    expect(file).toEqual(copie);
  });
});
