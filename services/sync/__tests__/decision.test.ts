import type { Book, MutationLivre, ResultatSync } from "@/domain";
import { decider } from "@/services/sync/decision";

const T = "2026-09-11T10:00:00.000Z";

const serveur: Book = {
  id: "l-1",
  titre: "Modifie par le serveur",
  auteur: "A",
  editeur: "E",
  annee: 2000,
  lu: false,
  favori: false,
  note: null,
  couverture: null,
  createdAt: T,
  updatedAt: T,
  version: 4,
};

const creation: MutationLivre = {
  id: "m-c",
  type: "create",
  creeLe: T,
  livreId: "local:1",
  livre: { titre: "Dune", auteur: "Herbert", editeur: "L", annee: 1965, lu: false },
};
const maj: MutationLivre = {
  id: "m-u",
  type: "update",
  creeLe: T,
  livreId: "l-1",
  baseVersion: 3,
  champs: { titre: "Mien" },
};
const suppression: MutationLivre = {
  id: "m-d",
  type: "delete",
  creeLe: T,
  livreId: "l-1",
  baseVersion: 3,
};

describe("decider", () => {
  it("retire une creation acceptee et fournit l'alias local -> serveur", () => {
    const r: ResultatSync = { id: "m-c", statut: "ok", livre: { ...serveur, id: "srv-9" } };
    expect(decider(creation, r, T)).toEqual({
      action: "retirer",
      livre: { ...serveur, id: "srv-9" },
      alias: { local: "local:1", serveur: "srv-9" },
    });
  });

  it("traite un rejeu comme un succes : la creation n'est pas refaite", () => {
    const r: ResultatSync = {
      id: "m-c",
      statut: "ok",
      rejeu: true,
      livre: { ...serveur, id: "srv-9" },
    };
    expect(decider(creation, r, T)).toMatchObject({
      action: "retirer",
      alias: { serveur: "srv-9" },
    });
  });

  it("retire une suppression acceptee sans livre", () => {
    expect(decider(suppression, { id: "m-d", statut: "ok" }, T)).toEqual({
      action: "retirer",
      livre: null,
    });
  });

  it("transforme un conflit en conflit a arbitrer, mutation intacte", () => {
    const r: ResultatSync = { id: "m-u", statut: "conflit", serveur, versionAttendue: 4 };
    expect(decider(maj, r, T)).toEqual({
      action: "conflit",
      conflit: {
        id: "m-u",
        type: "conflit",
        mutation: maj,
        serveur,
        versionAttendue: 4,
        detecteLe: T,
      },
    });
  });

  it("garde un conflit sur une suppression", () => {
    const r: ResultatSync = { id: "m-d", statut: "conflit", serveur, versionAttendue: 4 };
    expect(decider(suppression, r, T)).toMatchObject({
      action: "conflit",
      conflit: { mutation: suppression },
    });
  });

  it("accepte un conflit rejoue sans version serveur", () => {
    const r: ResultatSync = { id: "m-u", statut: "conflit", rejeu: true };
    expect(decider(maj, r, T)).toMatchObject({
      action: "conflit",
      conflit: { serveur: undefined },
    });
  });

  it("rejette une saisie refusee champ par champ", () => {
    const r: ResultatSync = { id: "m-c", statut: "erreur", champs: { annee: "annee invalide" } };
    expect(decider(creation, r, T)).toEqual({
      action: "rejeter",
      conflit: {
        id: "m-c",
        type: "rejet",
        mutation: creation,
        motif: "refus",
        champs: { annee: "annee invalide" },
        detecteLe: T,
      },
    });
  });

  it("rejette une modification d'un livre disparu", () => {
    const r: ResultatSync = { id: "m-u", statut: "erreur", message: "livre introuvable" };
    expect(decider(maj, r, T)).toMatchObject({
      action: "rejeter",
      conflit: { motif: "disparu" },
    });
  });

  it("garde la mutation quand le serveur n'a rien dit d'exploitable", () => {
    expect(decider(maj, undefined, T)).toEqual({ action: "garder" });
    expect(decider(maj, { id: "m-u", statut: "erreur", message: "type inconnu" }, T)).toEqual({
      action: "garder",
    });
  });

  it("est pure : memes entrees, meme sortie, entrees intactes", () => {
    const r: ResultatSync = { id: "m-u", statut: "conflit", serveur, versionAttendue: 4 };
    const copie = structuredClone({ maj, r });
    expect(decider(maj, r, T)).toEqual(decider(maj, r, T));
    expect({ maj, r }).toEqual(copie);
  });
});
