import { QueryClientProvider, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Book, Page } from "@/domain";
import { useToggleBook } from "@/features/books/useToggleBook";
import { createQueryClient } from "@/services/queryClient";
import { bookKeys } from "@/services/queryKeys";
import { reinitialiserPourTests as resetReseau } from "@/services/reseau";
import { lireFile, reinitialiserFilePourTests } from "@/services/sync/file";
import { reinitialiserSyncPourTests } from "@/services/sync/synchroniser";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

function setup() {
  const created = createQueryClient();
  client = created;
  seed(created, book());

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={created}>{children}</QueryClientProvider>;
  }

  const { result } = renderHook(() => useToggleBook(), { wrapper: Wrapper });
  return { client: created, result };
}

let client: QueryClient | undefined;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE;
  fetchMock.mockReset();
  // No server behind the queue in these tests: the sync fails on transport
  // and leaves the queue exactly as the hook wrote it.
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(async () => {
  client?.clear();
  reinitialiserFilePourTests();
  reinitialiserSyncPourTests();
  resetReseau();
  await AsyncStorage.clear();
});

describe("useToggleBook", () => {
  it("applies the change to the list and the record, and queues one update", async () => {
    const { client, result } = setup();

    await act(async () => {
      result.current.mutate({ id: "l-1", changes: { favori: true } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listed(client, "l-1")?.favori).toBe(true);
    expect(client.getQueryData<Book>(bookKeys.detail("l-1"))?.favori).toBe(true);
    expect(lireFile()).toEqual([
      expect.objectContaining({ type: "update", livreId: "l-1", champs: { favori: true } }),
    ]);
    // No version: a boolean toggle contradicts no correction.
    expect(lireFile()[0]).not.toHaveProperty("baseVersion");
  });

  it("leaves the other books of the page untouched", async () => {
    const { client, result } = setup();
    const neighbour = listed(client, "l-2");

    await act(async () => {
      result.current.mutate({ id: "l-1", changes: { favori: true } });
    });
    await waitFor(() => expect(listed(client, "l-1")?.favori).toBe(true));

    // Same object, not merely an equal one: this identity is what lets the
    // memoised row skip its redraw.
    expect(listed(client, "l-2")).toBe(neighbour);
  });

  it("folds two toggles on the same book into one queued update", async () => {
    const { result } = setup();

    await act(async () => {
      result.current.mutate({ id: "l-1", changes: { favori: true } });
    });
    await act(async () => {
      result.current.mutate({ id: "l-1", changes: { lu: true } });
    });

    await waitFor(() => expect(lireFile()).toHaveLength(1));
    expect(lireFile()[0]).toMatchObject({ champs: { favori: true, lu: true } });
  });

  it("keeps the change and the queue when the server is unreachable", async () => {
    const { client, result } = setup();

    await act(async () => {
      result.current.mutate({ id: "l-1", changes: { lu: true } });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(listed(client, "l-1")?.lu).toBe(true);
    expect(lireFile()).toHaveLength(1);
  });
});
