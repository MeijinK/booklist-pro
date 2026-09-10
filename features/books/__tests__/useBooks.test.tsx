import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ApiError, type Book } from "@/domain";
import { useBooks } from "@/features/books/useBooks";
import { createQueryClient } from "@/services/queryClient";

const BASE = "http://localhost:3000";

function book(id: string): Book {
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

function page(number: number, ids: string[]) {
  return { items: ids.map(book), page: number, limit: 20, total: 500, totalPages: 25 };
}

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function wrapper() {
  const client = createQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
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
  it("asks for a single page on the first load", async () => {
    fetchMock.mockResolvedValue(response(page(1, ["a", "b"])));

    const { result } = renderHook(() => useBooks(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The collection holds five hundred books: loading twenty is the contract.
    expect(result.current.data?.pages[0]?.items).toHaveLength(2);
    expect(result.current.data?.pages[0]?.total).toBe(500);
  });

  it("sends the normalised filters in the query string", async () => {
    fetchMock.mockResolvedValue(response(page(1, ["a"])));

    const { result } = renderHook(() => useBooks({ q: "  tolkien  " }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = fetchMock.mock.calls[0]?.[0] ?? "";
    expect(url).toContain("q=tolkien");
    expect(url).toContain("page=1");
    expect(url).toContain("limit=20");
  });

  it("announces a next page as long as the server declares one", async () => {
    fetchMock.mockResolvedValue(response(page(1, ["a"])));

    const { result } = renderHook(() => useBooks(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(true);
  });

  it("stops at the last page", async () => {
    fetchMock.mockResolvedValue(
      response({ items: [book("z")], page: 25, limit: 20, total: 500, totalPages: 25 }),
    );

    const { result } = renderHook(() => useBooks(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it("surfaces a discriminated application error, and not a raw failure", async () => {
    fetchMock.mockResolvedValue(
      response({ erreur: "indisponible", message: "Service momentanement indisponible." }, 503),
    );

    const { result } = renderHook(() => useBooks(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 10_000 });

    const error = result.current.error;
    expect(error).toBeInstanceOf(ApiError);
    expect(error?.detail.kind).toBe("network");
  });

  it("rejects a response whose shape does not match the contract", async () => {
    fetchMock.mockResolvedValue(response({ items: [{ id: 1 }], page: 1 }));

    const { result } = renderHook(() => useBooks(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Reponse inattendue du serveur.");
  });
});
