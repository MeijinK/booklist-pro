import type { QueryClient } from "@tanstack/react-query";

import type { Book, MutationLocale, Note } from "@/domain";
import { createQueryClient } from "@/services/queryClient";
import { bookKeys, noteKeys } from "@/services/queryKeys";
import { rejouerLocalement } from "@/services/sync/rejouerLocal";

const T = "2026-09-11T10:00:00.000Z";
let client: QueryClient;
beforeEach(() => {
  client = createQueryClient();
});
afterEach(() => client.clear());

it("remet en cache ce que la file contient, sans doublon", () => {
  const file: MutationLocale[] = [
    {
      id: "c",
      type: "create",
      creeLe: T,
      livreId: "local:1",
      livre: { titre: "Dune", auteur: "H", editeur: "L", annee: 1965, lu: false },
    },
    { id: "n", type: "note", creeLe: T, livreId: "local:1", contenu: "Bien" },
  ];

  rejouerLocalement(client, file);
  rejouerLocalement(client, file);

  expect(client.getQueryData<Book>(bookKeys.detail("local:1"))?.titre).toBe("Dune");
  expect(client.getQueryData<Note[]>(noteKeys.all("local:1"))).toHaveLength(1);
});
