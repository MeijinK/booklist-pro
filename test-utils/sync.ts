import type { Book } from "@/domain";

/** Shared by the synchroniser tests: a record, a canned answer, a fetch stub. */
export const T = "2026-09-11T10:00:00.000Z";

export function livre(id: string, extra: Partial<Book> = {}): Book {
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

export function reponse(status: number, body: unknown): Response {
  const r = {
    ok: status < 300,
    status,
    json: async () => body,
    clone: () => r,
  };
  return r as unknown as Response;
}

export type Appel = { url: string; method: string; body: unknown; bearer: string | undefined };

export function stub(handler: (appel: Appel, index: number) => Response | Promise<Response>): Appel[] {
  const appels: Appel[] = [];
  global.fetch = jest.fn(async (url: string, init: RequestInit) => {
    const headers = (init.headers ?? {}) as Record<string, string>;
    const appel: Appel = {
      url,
      method: init.method ?? "GET",
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
      bearer: headers.Authorization,
    };
    appels.push(appel);
    return handler(appel, appels.length - 1);
  }) as unknown as typeof fetch;
  return appels;
}

