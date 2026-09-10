import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Book, Page } from "@/domain";
import { useBooks } from "@/features/livres";
import { createQueryClient } from "@/services/queryClient";

// Le hook traverse toute la couche reseau reelle : seul `fetch` est simule,
// pour que le cache, la validation et la conversion des erreurs soient
// reellement exerces.
jest.mock("@/services/config", () => ({
  getBaseUrl: () => "http://api.test",
  REQUEST_TIMEOUT_MS: 50,
}));

const livre: Book = {
  id: "abc",
  titre: "Le Seigneur des anneaux",
  auteur: "Tolkien",
  editeur: "Bourgois",
  annee: 1954,
  lu: true,
  favori: false,
  note: 5,
  couverture: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  version: 7,
};

function page(overrides: Partial<Page<Book>> = {}): Page<Book> {
  return { items: [livre], page: 1, limit: 20, total: 1, totalPages: 1, ...overrides };
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function stubFetch(response: Response): void {
  global.fetch = jest.fn().mockResolvedValue(response) as unknown as typeof fetch;
}

let clientCourant: ReturnType<typeof createQueryClient> | undefined;

function createWrapper() {
  // Constante locale : le wrapper ferme dessus et ne voit jamais `undefined`.
  // La variable de module ne sert qu'au nettoyage entre deux tests.
  const client = createQueryClient();
  clientCourant = client;

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const vraiFetch = global.fetch;

afterEach(() => {
  global.fetch = vraiFetch;
  // Sans cela, le ramasse-miettes du cache laisse tourner un minuteur de cinq
  // minutes apres chaque test et le processus jest ne se termine pas seul.
  clientCourant?.clear();
  clientCourant = undefined;
});

describe("useBooks", () => {
  it("expose les ouvrages de la premiere page", async () => {
    stubFetch(jsonResponse(200, page()));

    const { result } = renderHook(() => useBooks(), { wrapper: createWrapper() });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items).toEqual([livre]);
  });

  it("annonce une page suivante quand le serveur en declare plusieurs", async () => {
    stubFetch(jsonResponse(200, page({ totalPages: 3 })));

    const { result } = renderHook(() => useBooks(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it("n'annonce pas de page suivante sur la derniere", async () => {
    stubFetch(jsonResponse(200, page({ totalPages: 1 })));

    const { result } = renderHook(() => useBooks(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("remonte une erreur discriminee quand le serveur est indisponible", async () => {
    stubFetch(jsonResponse(503, { erreur: "indisponible" }));

    const { result } = renderHook(() => useBooks(), { wrapper: createWrapper() });

    // Le client reessaie avec temporisation avant d'abandonner : le delai
    // d'attente doit couvrir ces tentatives.
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 10000 });
    expect(result.current.error?.detail).toMatchObject({ kind: "network", status: 503 });
  });
});
