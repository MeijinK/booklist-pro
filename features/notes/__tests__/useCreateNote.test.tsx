import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Note } from "@/domain";
import { isLocalNote, useCreateNote } from "@/features/notes/useCreateNote";
import { useDeleteNote } from "@/features/notes/useDeleteNote";
import { createQueryClient } from "@/services/queryClient";
import { noteKeys } from "@/services/queryKeys";
import { reinitialiserPourTests as resetReseau } from "@/services/reseau";
import { lireFile, reinitialiserFilePourTests } from "@/services/sync/file";
import { reinitialiserSyncPourTests } from "@/services/sync/synchroniser";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = "http://localhost:3000";
const BOOK = "l-1";

function note(id: string, contenu: string, createdAt = "2026-07-10T09:40:06.361Z"): Note {
  return { id, livreId: BOOK, contenu, createdAt };
}

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function cached(client: QueryClient): Note[] {
  return client.getQueryData<Note[]>(noteKeys.all(BOOK)) ?? [];
}

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

function setup<T>(hook: () => T, seeded: Note[]) {
  const created = createQueryClient();
  client = created;
  created.setQueryData<Note[]>(noteKeys.all(BOOK), seeded);

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={created}>{children}</QueryClientProvider>;
  }

  const { result } = renderHook(hook, { wrapper: Wrapper });
  return { client: created, result };
}

let client: QueryClient | undefined;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE;
  fetchMock.mockReset();
  // The queue is local: with no server behind, the sync fails on transport
  // and the queued note stays exactly where the hook put it.
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

describe("useCreateNote", () => {
  it("shows the note first, marked as local, and queues it", async () => {
    const { client, result } = setup(() => useCreateNote(BOOK), [note("n-1", "Deja la.")]);

    await act(async () => {
      result.current.mutate({ contenu: "Traduction inegale." });
    });

    await waitFor(() => expect(cached(client)).toHaveLength(2));
    // Most recent first: what has just been written is read first.
    expect(cached(client)[0]?.contenu).toBe("Traduction inegale.");
    expect(isLocalNote(cached(client)[0] as Note)).toBe(true);
    expect(lireFile()).toEqual([
      expect.objectContaining({ type: "note", livreId: BOOK, contenu: "Traduction inegale." }),
    ]);
  });

  it("keeps the note when the server is unreachable", async () => {
    const { client, result } = setup(() => useCreateNote(BOOK), []);

    await act(async () => {
      result.current.mutate({ contenu: "Traduction inegale." });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cached(client)).toHaveLength(1);
    expect(lireFile()).toHaveLength(1);
  });
});

describe("useDeleteNote", () => {
  it("removes the row before the round trip", async () => {
    fetchMock.mockResolvedValue(response(undefined, 204));
    const { client, result } = setup(() => useDeleteNote(BOOK), [
      note("n-1", "Premiere."),
      note("n-2", "Seconde."),
    ]);

    await act(async () => {
      result.current.mutate("n-1");
    });

    await waitFor(() => expect(cached(client)).toHaveLength(1));
    expect(cached(client)[0]?.id).toBe("n-2");
  });

  it("brings the note back, text intact, when the server refuses", async () => {
    fetchMock.mockResolvedValue(response({ erreur: "indisponible" }, 503));
    const { client, result } = setup(() => useDeleteNote(BOOK), [note("n-1", "Premiere.")]);

    await act(async () => {
      result.current.mutate("n-1");
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 10_000 });
    expect(cached(client)).toHaveLength(1);
    expect(cached(client)[0]?.contenu).toBe("Premiere.");
  });

  it("deletes the note through its book, the only route the server exposes", async () => {
    fetchMock.mockResolvedValue(response(undefined, 204));
    const { result } = setup(() => useDeleteNote(BOOK), [note("n-1", "Premiere.")]);

    await act(async () => {
      result.current.mutate("n-1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE}/books/l-1/notes/n-1`);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("DELETE");
  });
});
