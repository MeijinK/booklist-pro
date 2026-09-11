import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueryClient } from "@tanstack/react-query";

import type { Book, MutationLocale } from "@/domain";
import { enregistrerJetons, reinitialiserPourTests as resetJetons } from "@/services/auth/jetons";
import { createQueryClient } from "@/services/queryClient";
import { bookKeys, noteKeys } from "@/services/queryKeys";
import {
  reinitialiserPourTests as resetReseau,
  signalerPanne,
  surChangement,
} from "@/services/reseau";
import { reinitialiserAliasPourTests, resoudreId } from "@/services/sync/alias";
import { lireConflits, reinitialiserConflitsPourTests } from "@/services/sync/conflits";
import { ajouterMutation, lireFile, reinitialiserFilePourTests } from "@/services/sync/file";
import { reinitialiserSyncPourTests, synchroniser } from "@/services/sync/synchroniser";

import { livre, reponse, stub, T, type Appel } from "@/test-utils/sync";

jest.mock("@/services/config", () => ({
  getBaseUrl: () => "http://api.test",
  REQUEST_TIMEOUT_MS: 50,
}));

const vraiFetch = global.fetch;
let client: QueryClient;

const creation: MutationLocale = {
  id: "m-c",
  type: "create",
  creeLe: T,
  livreId: "local:1",
  livre: { titre: "Dune", auteur: "H", editeur: "L", annee: 1965, lu: false },
};
const maj: MutationLocale = {
  id: "m-u",
  type: "update",
  creeLe: T,
  livreId: "l-1",
  baseVersion: 1,
  champs: { titre: "Mien" },
};

const syncs = (appels: Appel[]) => appels.filter((a) => a.url.endsWith("/sync"));
const idsDe = (appel: Appel | undefined) =>
  (appel?.body as { mutations: { id: string }[] }).mutations.map((m) => m.id);

beforeEach(async () => {
  client = createQueryClient();
  await enregistrerJetons({ accessToken: "vieux", refreshToken: "r" });
});

afterEach(async () => {
  client.clear();
  global.fetch = vraiFetch;
  reinitialiserFilePourTests();
  reinitialiserConflitsPourTests();
  reinitialiserAliasPourTests();
  reinitialiserSyncPourTests();
  resetReseau();
  resetJetons();
  await AsyncStorage.clear();
});

it("envoie la file en un lot, retire ce qui est accepte, remappe l'id local", async () => {
  await ajouterMutation(creation);
  await ajouterMutation(maj);
  client.setQueryData(bookKeys.detail("local:1"), livre("local:1", { version: 0 }));

  const appels = stub(() =>
    reponse(200, {
      resultats: [
        { id: "m-c", statut: "ok", livre: livre("srv-9", { titre: "Dune" }) },
        { id: "m-u", statut: "ok", livre: livre("l-1", { titre: "Mien", version: 2 }) },
      ],
    }),
  );

  await synchroniser(client);

  expect(syncs(appels)).toHaveLength(1);
  expect(idsDe(appels[0])).toEqual(["m-c", "m-u"]);
  expect(lireFile()).toEqual([]);
  expect(resoudreId("local:1")).toBe("srv-9");
  expect(client.getQueryData(bookKeys.detail("srv-9"))).toMatchObject({ titre: "Dune" });
  expect(client.getQueryData<Book>(bookKeys.detail("l-1"))?.version).toBe(2);
});

it("rafraichit le jeton expire en plein lot et rejoue le meme corps avec les memes ids", async () => {
  await ajouterMutation(creation);
  const appels = stub((appel) => {
    if (appel.url.endsWith("/auth/refresh")) {
      return reponse(200, { accessToken: "neuf", expiresIn: "120s" });
    }
    if (appel.bearer !== "Bearer neuf") return reponse(401, { erreur: "jeton_expire" });
    return reponse(200, {
      resultats: [{ id: "m-c", statut: "ok", rejeu: true, livre: livre("srv-9") }],
    });
  });

  await synchroniser(client);

  expect(syncs(appels)).toHaveLength(2);
  expect(syncs(appels)[0]?.body).toEqual(syncs(appels)[1]?.body);
  expect(appels.filter((a) => a.url.endsWith("/auth/refresh"))).toHaveLength(1);
  expect(lireFile()).toEqual([]);
});

it("range un conflit a part, ecrit la version serveur dans le cache, et continue", async () => {
  await ajouterMutation(maj);
  stub(() =>
    reponse(200, {
      resultats: [
        {
          id: "m-u",
          statut: "conflit",
          serveur: livre("l-1", { titre: "Serveur", version: 4 }),
          versionAttendue: 4,
        },
      ],
    }),
  );

  await synchroniser(client);

  expect(lireFile()).toEqual([]);
  expect(lireConflits()).toEqual([
    expect.objectContaining({ id: "m-u", type: "conflit", versionAttendue: 4 }),
  ]);
  expect(client.getQueryData<Book>(bookKeys.detail("l-1"))?.titre).toBe("Serveur");
});

it("garde la file intacte et se declare hors ligne quand le serveur est injoignable", async () => {
  await ajouterMutation(maj);
  const vu: boolean[] = [];
  surChangement((v) => vu.push(v));
  stub(() => Promise.reject(new TypeError("Failed to fetch")));

  await synchroniser(client);

  expect(lireFile()).toHaveLength(1);
  expect(vu).toEqual([false]);
});

it("ne fait rien hors ligne sauf si on force", async () => {
  await ajouterMutation(maj);
  signalerPanne();
  const appels = stub(() =>
    reponse(200, { resultats: [{ id: "m-u", statut: "ok", livre: livre("l-1") }] }),
  );

  await synchroniser(client);
  expect(appels).toHaveLength(0);

  await synchroniser(client, { force: true });
  expect(appels).toHaveLength(1);
});

it("est a vol unique", async () => {
  await ajouterMutation(maj);
  let liberer!: (r: Response) => void;
  const appels = stub(
    () =>
      new Promise<Response>((resolve) => {
        liberer = resolve;
      }),
  );

  const a = synchroniser(client);
  const b = synchroniser(client);
  expect(a).toBe(b);
  // The stub is only reached once the stores are loaded: wait for that.
  await new Promise((r) => setTimeout(r, 10));
  liberer(reponse(200, { resultats: [{ id: "m-u", statut: "ok", livre: livre("l-1") }] }));
  await a;
  expect(appels).toHaveLength(1);
});

it("rejoue les notes apres les livres, sur l'id reel, sans doublon", async () => {
  await ajouterMutation(creation);
  await ajouterMutation({ id: "m-n", type: "note", creeLe: T, livreId: "local:1", contenu: "Deja la" });
  await ajouterMutation({ id: "m-n2", type: "note", creeLe: T, livreId: "local:1", contenu: "Nouvelle" });
  client.setQueryData(noteKeys.all("local:1"), [
    { id: "local:m-n", livreId: "local:1", contenu: "Deja la", createdAt: T },
    { id: "local:m-n2", livreId: "local:1", contenu: "Nouvelle", createdAt: T },
  ]);

  const appels = stub((appel) => {
    if (appel.url.endsWith("/sync")) {
      return reponse(200, { resultats: [{ id: "m-c", statut: "ok", livre: livre("srv-9") }] });
    }
    if (appel.method === "GET") {
      return reponse(200, [{ id: "n-0", livreId: "srv-9", contenu: "Deja la", createdAt: T }]);
    }
    return reponse(201, { id: "n-1", livreId: "srv-9", contenu: "Nouvelle", createdAt: T });
  });

  await synchroniser(client);

  const posts = appels.filter((a) => a.method === "POST" && a.url.endsWith("/books/srv-9/notes"));
  expect(posts).toHaveLength(1);
  expect(lireFile()).toEqual([]);
  const ids = client.getQueryData<{ id: string }[]>(noteKeys.all("srv-9"))?.map((n) => n.id);
  expect(ids?.sort()).toEqual(["n-0", "n-1"]);
});

it("ne tente rien sans session", async () => {
  await ajouterMutation(maj);
  resetJetons();
  const appels = stub(() => reponse(200, { resultats: [] }));
  await synchroniser(client);
  expect(appels).toHaveLength(0);
  expect(lireFile()).toHaveLength(1);
});
