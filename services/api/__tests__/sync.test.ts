import type { MutationLivre } from "@/domain";
import { envoyerLot } from "@/services/api/sync";

jest.mock("@/services/config", () => ({
  getBaseUrl: () => "http://api.test",
  REQUEST_TIMEOUT_MS: 50,
}));

const T = "2026-09-11T10:00:00.000Z";
const vraiFetch = global.fetch;
afterEach(() => {
  global.fetch = vraiFetch;
});

it("traduit la file au format du serveur et valide la reponse", async () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      resultats: [{ id: "a", statut: "ok" }],
      resume: { total: 1, ok: 1, conflits: 0, erreurs: 0 },
      serveurLe: T,
    }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;

  const lot: MutationLivre[] = [
    {
      id: "a",
      type: "create",
      creeLe: T,
      livreId: "local:1",
      livre: { titre: "T", auteur: "A", editeur: "E", annee: 2000, lu: false },
    },
    { id: "b", type: "update", creeLe: T, livreId: "l-1", baseVersion: 3, champs: { titre: "X" } },
    { id: "c", type: "delete", creeLe: T, livreId: "l-2", baseVersion: 1 },
  ];
  const reponse = await envoyerLot(lot);

  expect(reponse.resultats).toEqual([{ id: "a", statut: "ok" }]);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toBe("http://api.test/sync");
  expect(JSON.parse(String(init.body))).toEqual({
    mutations: [
      {
        id: "a",
        type: "create",
        livre: { titre: "T", auteur: "A", editeur: "E", annee: 2000, lu: false },
      },
      { id: "b", type: "update", baseVersion: 3, livre: { id: "l-1", titre: "X" } },
      { id: "c", type: "delete", baseVersion: 1, livreId: "l-2" },
    ],
  });
});
