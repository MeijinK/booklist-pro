import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type { Book, Note, Page } from "@/domain";
import { createQueryClient } from "@/services/queryClient";
import { bookKeys, noteKeys } from "@/services/queryKeys";
import {
  ecrireLivre,
  insererLivre,
  insererNote,
  remplacerNote,
  renommerLivre,
  retirerLivre,
} from "@/services/sync/cache";

type ListData = InfiniteData<Page<Book>>;
const FILTRES = { limit: 20, sort: "titre", order: "asc" } as const;
const T = "2026-09-11T10:00:00.000Z";

function livre(id: string, extra: Partial<Book> = {}): Book {
  return {
    id,
    titre: id,
    auteur: "A",
    editeur: "E",
    annee: 2000,
    lu: false,
    favori: false,
    note: null,
    couverture: null,
    createdAt: T,
    updatedAt: T,
    version: 1,
    ...extra,
  };
}

let client: QueryClient;
beforeEach(() => {
  client = createQueryClient();
  client.setQueryData<ListData>(bookKeys.list(FILTRES), {
    pages: [{ items: [livre("l-1"), livre("l-2")], page: 1, limit: 20, total: 2, totalPages: 1 }],
    pageParams: [1],
  });
  client.setQueryData(bookKeys.detail("l-1"), livre("l-1"));
});
afterEach(() => client.clear());

const items = () =>
  client.getQueryData<ListData>(bookKeys.list(FILTRES))?.pages[0]?.items.map((b) => b.id);

it("insererLivre met la fiche en tete de chaque liste et en detail", () => {
  insererLivre(client, livre("local:x"));
  expect(items()).toEqual(["local:x", "l-1", "l-2"]);
  expect(client.getQueryData(bookKeys.detail("local:x"))).toMatchObject({ id: "local:x" });
});

it("ecrireLivre applique la meme transformation a la liste et au detail", () => {
  ecrireLivre(client, "l-1", (b) => ({ ...b, lu: true }));
  expect(client.getQueryData<Book>(bookKeys.detail("l-1"))?.lu).toBe(true);
  expect(client.getQueryData<ListData>(bookKeys.list(FILTRES))?.pages[0]?.items[0]?.lu).toBe(
    true,
  );
});

it("retirerLivre enleve partout", () => {
  retirerLivre(client, "l-1");
  expect(items()).toEqual(["l-2"]);
  expect(client.getQueryData(bookKeys.detail("l-1"))).toBeUndefined();
});

it("renommerLivre remplace l'id local par la fiche serveur, notes comprises", () => {
  insererLivre(client, livre("local:x"));
  client.setQueryData<Note[]>(noteKeys.all("local:x"), [
    { id: "local:n", livreId: "local:x", contenu: "c", createdAt: T },
  ]);

  renommerLivre(client, "local:x", livre("srv-9", { version: 1 }));

  expect(items()).toEqual(["srv-9", "l-1", "l-2"]);
  expect(client.getQueryData(bookKeys.detail("srv-9"))).toMatchObject({ id: "srv-9" });
  expect(client.getQueryData<Note[]>(noteKeys.all("srv-9"))?.[0]).toMatchObject({
    livreId: "srv-9",
  });
});

it("insererNote puis remplacerNote", () => {
  insererNote(client, "l-1", { id: "local:n", livreId: "l-1", contenu: "c", createdAt: T });
  remplacerNote(client, "l-1", "local:n", { id: "n-1", livreId: "l-1", contenu: "c", createdAt: T });
  expect(client.getQueryData<Note[]>(noteKeys.all("l-1"))?.map((n) => n.id)).toEqual(["n-1"]);
});
