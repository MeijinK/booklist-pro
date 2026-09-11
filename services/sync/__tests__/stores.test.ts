import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MutationLocale } from "@/domain";
import {
  ajouterAlias,
  chargerAlias,
  reinitialiserAliasPourTests,
  resoudreId,
} from "@/services/sync/alias";
import {
  ajouterConflit,
  chargerConflits,
  lireConflits,
  reinitialiserConflitsPourTests,
  retirerConflit,
} from "@/services/sync/conflits";
import {
  ajouterMutation,
  chargerFile,
  lireFile,
  marquerEnVol,
  reecrireLivreIdFile,
  reinitialiserFilePourTests,
  retirerMutations,
  surChangementFile,
} from "@/services/sync/file";

const T = "2026-09-11T10:00:00.000Z";
const maj = (id: string, livreId = "l-1"): MutationLocale => ({
  id,
  type: "update",
  creeLe: T,
  livreId,
  champs: { lu: true },
});

afterEach(async () => {
  reinitialiserFilePourTests();
  reinitialiserConflitsPourTests();
  reinitialiserAliasPourTests();
  await AsyncStorage.clear();
});

describe("file", () => {
  it("persiste, notifie, et se recharge apres un redemarrage", async () => {
    const vu = jest.fn();
    surChangementFile(vu);

    await ajouterMutation(maj("a"));
    expect(vu).toHaveBeenCalled();
    expect(lireFile()).toHaveLength(1);

    reinitialiserFilePourTests();
    expect(lireFile()).toEqual([]);
    await chargerFile();
    expect(lireFile()).toEqual([maj("a")]);
  });

  it("fusionne via fusionnerFile sauf pour une mutation en vol", async () => {
    await ajouterMutation(maj("a"));
    marquerEnVol(["a"]);
    await ajouterMutation(maj("b"));
    expect(lireFile().map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("retire par id et reecrit un id local", async () => {
    await ajouterMutation(maj("a", "local:x"));
    await ajouterMutation({ id: "n", type: "note", creeLe: T, livreId: "local:x", contenu: "c" });
    await reecrireLivreIdFile("local:x", "srv-1");
    expect(lireFile().every((m) => m.livreId === "srv-1")).toBe(true);

    await retirerMutations(["a"]);
    expect(lireFile().map((m) => m.id)).toEqual(["n"]);
  });

  it("ignore une valeur stockee corrompue", async () => {
    await AsyncStorage.setItem("booklist.file", "{pas du json");
    await chargerFile();
    expect(lireFile()).toEqual([]);
  });
});

describe("conflits", () => {
  it("ajoute, liste, retire, et survit au rechargement", async () => {
    await ajouterConflit({ id: "c1", type: "conflit", mutation: maj("m"), detecteLe: T });
    reinitialiserConflitsPourTests();
    await chargerConflits();
    expect(lireConflits()).toHaveLength(1);
    await retirerConflit("c1");
    expect(lireConflits()).toEqual([]);
  });
});

describe("alias", () => {
  it("resout un id local vers l'id serveur, et laisse les autres intacts", async () => {
    await ajouterAlias("local:x", "srv-1");
    expect(resoudreId("local:x")).toBe("srv-1");
    expect(resoudreId("srv-2")).toBe("srv-2");
    reinitialiserAliasPourTests();
    await chargerAlias();
    expect(resoudreId("local:x")).toBe("srv-1");
  });
});
