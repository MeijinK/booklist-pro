import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { Note } from "@/domain";
import { isLocalNote, useCreateNote } from "@/features/notes/useCreateNote";
import { useDeleteNote } from "@/features/notes/useDeleteNote";
import { createQueryClient } from "@/services/queryClient";
import { noteKeys } from "@/services/queryKeys";

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
  const client = createQueryClient();
  client.setQueryData<Note[]>(noteKeys.all(BOOK), seeded);

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  const { result } = renderHook(hook, { wrapper: Wrapper });
  return { client, result };
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE;
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("useCreateNote", () => {
  it("shows the note before the server has recorded it", async () => {
    fetchMock.mockResolvedValue(response(note("n-2", "Traduction inegale.")));
    const { client, result } = setup(() => useCreateNote(BOOK), [note("n-1", "Deja la.")]);

    await act(async () => {
      result.current.mutate({ contenu: "Traduction inegale." });
    });

    await waitFor(() => expect(cached(client)).toHaveLength(2));
    // Most recent first: what has just been written is read first.
    expect(cached(client)[0]?.contenu).toBe("Traduction inegale.");
  });

  it("replaces the temporary note with the recorded one", async () => {
    fetchMock.mockResolvedValue(response(note("n-2", "Traduction inegale.")));
    const { client, result } = setup(() => useCreateNote(BOOK), []);

    await act(async () => {
      result.current.mutate({ contenu: "Traduction inegale." });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(cached(client)).toHaveLength(1);
    expect(cached(client)[0]?.id).toBe("n-2");
    expect(cached(client).some(isLocalNote)).toBe(false);
  });

  it("puts the list back as it was when the server refuses", async () => {
    fetchMock.mockResolvedValue(
      response({ erreur: "validation", champs: { contenu: "contenu obligatoire" } }, 422),
    );
    const { client, result } = setup(() => useCreateNote(BOOK), [note("n-1", "Deja la.")]);

    await act(async () => {
      result.current.mutate({ contenu: "Traduction inegale." });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(cached(client)).toHaveLength(1);
    expect(cached(client)[0]?.id).toBe("n-1");
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
