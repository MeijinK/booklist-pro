import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ApiError, type Book } from "@/domain";
import { useBooks } from "@/features/livres/useBooks";
import { createQueryClient } from "@/services/queryClient";

const BASE = "http://localhost:3000";

function livre(id: string): Book {
  return {
    id,
    titre: `Ouvrage ${id}`,
    auteur: "Auteur",
    editeur: "Editeur",
    annee: 2000,
    lu: false,
    favori: false,
    note: null,
    couverture: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    version: 1,
  };
}

function page(numero: number, ids: string[]) {
  return { items: ids.map(livre), page: numero, limit: 20, total: 500, totalPages: 25 };
}

function reponse(corps: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corps,
  } as Response;
}

function enveloppe() {
  const client = createQueryClient();
  return function Enveloppe({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE;
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("useBooks", () => {
  it("ne demande qu'une page au premier chargement", async () => {
    fetchMock.mockResolvedValue(reponse(page(1, ["a", "b"])));

    const { result } = renderHook(() => useBooks(), { wrapper: enveloppe() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Le fonds compte cinq cents ouvrages : en charger vingt est le contrat.
    expect(result.current.data?.pages[0]?.items).toHaveLength(2);
    expect(result.current.data?.pages[0]?.total).toBe(500);
  });

  it("envoie les filtres normalises dans la chaine de requete", async () => {
    fetchMock.mockResolvedValue(reponse(page(1, ["a"])));

    const { result } = renderHook(() => useBooks({ q: "  tolkien  " }), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = fetchMock.mock.calls[0]?.[0] ?? "";
    expect(url).toContain("q=tolkien");
    expect(url).toContain("page=1");
    expect(url).toContain("limit=20");
  });

  it("annonce une page suivante tant que le serveur en declare", async () => {
    fetchMock.mockResolvedValue(reponse(page(1, ["a"])));

    const { result } = renderHook(() => useBooks(), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(true);
  });

  it("s'arrete a la derniere page", async () => {
    fetchMock.mockResolvedValue(
      reponse({ items: [livre("z")], page: 25, limit: 20, total: 500, totalPages: 25 }),
    );

    const { result } = renderHook(() => useBooks(), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it("remonte une erreur applicative discriminee, et non un echec brut", async () => {
    fetchMock.mockResolvedValue(
      reponse({ erreur: "indisponible", message: "Service momentanement indisponible." }, 503),
    );

    const { result } = renderHook(() => useBooks(), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 10_000 });

    const erreur = result.current.error;
    expect(erreur).toBeInstanceOf(ApiError);
    expect(erreur?.detail.kind).toBe("network");
  });

  it("refuse une reponse dont la forme ne correspond pas au contrat", async () => {
    fetchMock.mockResolvedValue(reponse({ items: [{ id: 1 }], page: 1 }));

    const { result } = renderHook(() => useBooks(), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Reponse inattendue du serveur.");
  });
});
