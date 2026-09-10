import { QueryClientProvider, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Book, Page } from "@/domain";
import { useToggleBook } from "@/features/books/useToggleBook";
import { createQueryClient } from "@/services/queryClient";
import { bookKeys } from "@/services/queryKeys";

const BASE = "http://localhost:3000";

function book(overrides: Partial<Book> = {}): Book {
  return {
    id: "l-1",
    titre: "La Horde du Contrevent",
    auteur: "Alain Damasio",
    editeur: "La Volte",
    annee: 2004,
    lu: false,
    favori: false,
    note: null,
    couverture: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
    version: 3,
    ...overrides,
  };
}

type ListData = InfiniteData<Page<Book>>;

const LIST_FILTERS = { limit: 20, sort: "titre", order: "asc" } as const;

function seed(client: QueryClient, entry: Book): void {
  client.setQueryData<ListData>(bookKeys.list(LIST_FILTERS), {
    pages: [{ items: [entry, book({ id: "l-2" })], page: 1, limit: 20, total: 2, totalPages: 1 }],
    pageParams: [1],
  });
  client.setQueryData<Book>(bookKeys.detail(entry.id), entry);
}

function listed(client: QueryClient, id: string): Book | undefined {
  const data = client.getQueryData<ListData>(bookKeys.list(LIST_FILTERS));
  return data?.pages[0]?.items.find((entry) => entry.id === id);
}

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

/**
 * A request held open on purpose, then released.
 *
 * A promise that never settles would leave the mutation pending when the test
 * ends and hang the runner; this one lets the assertion happen mid-flight and
 * still hands the request back its answer.
 */
function heldRequest() {
  let release!: (value: Response) => void;
  const promise = new Promise<Response>((resolve) => {
    release = resolve;
  });

  return { promise, release };
}

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

function setup() {
  const client = createQueryClient();
  seed(client, book());

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  const { result } = renderHook(() => useToggleBook(), { wrapper: Wrapper });
  return { client, result };
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE;
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("useToggleBook", () => {
  it("flips the state before the server has answered", async () => {
    const held = heldRequest();
    fetchMock.mockReturnValue(held.promise);
    const { client, result } = setup();

    await act(async () => {
      result.current.mutate({ id: "l-1", changes: { favori: true } });
    });

    // The request has not answered yet: what is asserted is the screen the
    // bookseller sees while it travels.
    await waitFor(() => expect(listed(client, "l-1")?.favori).toBe(true));
    expect(client.getQueryData<Book>(bookKeys.detail("l-1"))?.favori).toBe(true);

    await act(async () => held.release(response(book({ favori: true, version: 4 }))));
  });

  it("leaves the other books of the page untouched", async () => {
    const held = heldRequest();
    fetchMock.mockReturnValue(held.promise);
    const { client, result } = setup();
    const neighbour = listed(client, "l-2");

    await act(async () => {
      result.current.mutate({ id: "l-1", changes: { favori: true } });
    });
    await waitFor(() => expect(listed(client, "l-1")?.favori).toBe(true));

    // Same object, not merely an equal one: this identity is what lets the
    // memoised row skip its redraw.
    expect(listed(client, "l-2")).toBe(neighbour);

    await act(async () => held.release(response(book({ favori: true, version: 4 }))));
  });

  it("puts the previous state back when the server refuses", async () => {
    fetchMock.mockResolvedValue(response({ erreur: "indisponible" }, 503));
    const { client, result } = setup();

    await act(async () => {
      result.current.mutate({ id: "l-1", changes: { favori: true } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 10_000 });
    expect(listed(client, "l-1")?.favori).toBe(false);
    expect(client.getQueryData<Book>(bookKeys.detail("l-1"))?.favori).toBe(false);
  });

  it("writes back the record the server returns, version included", async () => {
    fetchMock.mockResolvedValue(response(book({ lu: true, version: 4 })));
    const { client, result } = setup();

    await act(async () => {
      result.current.mutate({ id: "l-1", changes: { lu: true } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData<Book>(bookKeys.detail("l-1"))?.version).toBe(4);
    expect(listed(client, "l-1")?.version).toBe(4);
  });

  it("does not send a version: a boolean toggle contradicts no correction", async () => {
    fetchMock.mockResolvedValue(response(book({ favori: true, version: 4 })));
    const { result } = setup();

    await act(async () => {
      result.current.mutate({ id: "l-1", changes: { favori: true } });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const headers = (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>;
    expect(headers["If-Match"]).toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("PATCH");
  });

  it("does not refetch the lists on success, so the row stays under the finger", async () => {
    fetchMock.mockResolvedValue(response(book({ favori: true, version: 4 })));
    const { result } = setup();

    await act(async () => {
      result.current.mutate({ id: "l-1", changes: { favori: true } });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // One call: the PATCH. A list refetch would make a book leave the screen
    // the moment its coup de coeur is removed under a "coups de coeur" filter.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
