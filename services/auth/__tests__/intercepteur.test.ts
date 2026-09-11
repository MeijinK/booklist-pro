import { BookSchema, type Book } from "@/domain";
import { request } from "@/services/api/client";
import {
  effacerJetons,
  enregistrerJetons,
  reinitialiserPourTests,
  surSessionPerdue,
} from "@/services/auth/jetons";

jest.mock("@/services/config", () => ({
  getBaseUrl: () => "http://api.test",
  REQUEST_TIMEOUT_MS: 50,
}));

const livre: Book = {
  id: "abc",
  titre: "Dune",
  auteur: "Herbert",
  editeur: "Laffont",
  annee: 1965,
  lu: false,
  favori: false,
  note: null,
  couverture: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 1,
};

function jsonResponse(status: number, body: unknown): Response {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    clone: () => jsonResponse(status, body),
  };
  return response as unknown as Response;
}

type Appel = { url: string; init: RequestInit };

function appels(fetchMock: jest.Mock): Appel[] {
  return fetchMock.mock.calls.map(([url, init]) => ({ url, init }) as Appel);
}

function autorisation(appel: Appel): string | undefined {
  return (appel.init.headers as Record<string, string>)["Authorization"];
}

const vraiFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(async () => {
  reinitialiserPourTests();
  await effacerJetons();
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = vraiFetch;
});

/** Answers like the API: 401 jeton_expire for a stale token, 200 otherwise. */
function serveurQuiExpire(jetonValide: string) {
  return (url: string, init: RequestInit) => {
    if (url.endsWith("/auth/refresh")) {
      return Promise.resolve(jsonResponse(200, { accessToken: jetonValide, expiresIn: "120s" }));
    }
    const porteur = (init.headers as Record<string, string>)["Authorization"];
    return Promise.resolve(
      porteur === `Bearer ${jetonValide}`
        ? jsonResponse(200, livre)
        : jsonResponse(401, { erreur: "jeton_expire", message: "Jeton expire." }),
    );
  };
}

describe("l'intercepteur", () => {
  it("injecte le jeton d'acces", async () => {
    await enregistrerJetons({ accessToken: "acces", refreshToken: "r" });
    fetchMock.mockResolvedValue(jsonResponse(200, livre));

    await request("/books/abc", { schema: BookSchema });

    expect(autorisation(appels(fetchMock)[0])).toBe("Bearer acces");
  });

  it("n'en met pas sur les routes d'authentification", async () => {
    await enregistrerJetons({ accessToken: "acces", refreshToken: "r" });
    fetchMock.mockResolvedValue(jsonResponse(200, livre));

    await request("/auth/login", { method: "POST", body: {}, schema: BookSchema, auth: false });

    expect(autorisation(appels(fetchMock)[0])).toBeUndefined();
  });

  it("rafraichit puis rejoue une requete dont le jeton a expire", async () => {
    await enregistrerJetons({ accessToken: "perime", refreshToken: "r" });
    fetchMock.mockImplementation(serveurQuiExpire("neuf"));

    await expect(request("/books/abc", { schema: BookSchema })).resolves.toEqual(livre);

    const urls = appels(fetchMock).map((appel) => appel.url);
    expect(urls).toEqual([
      "http://api.test/books/abc",
      "http://api.test/auth/refresh",
      "http://api.test/books/abc",
    ]);
    expect(autorisation(appels(fetchMock)[2])).toBe("Bearer neuf");
  });

  it("ne lance qu'un rafraichissement pour dix requetes expirees en meme temps", async () => {
    await enregistrerJetons({ accessToken: "perime", refreshToken: "r" });
    fetchMock.mockImplementation(serveurQuiExpire("neuf"));

    const resultats = await Promise.all(
      Array.from({ length: 10 }, (_, i) => request(`/books/${i}`, { schema: BookSchema })),
    );

    expect(resultats).toHaveLength(10);
    const rafraichissements = appels(fetchMock).filter((a) => a.url.endsWith("/auth/refresh"));
    expect(rafraichissements).toHaveLength(1);
    // 10 first attempts + 1 refresh + 10 replays.
    expect(fetchMock).toHaveBeenCalledTimes(21);
  });

  it("ne rejoue qu'une fois : un second 401 remonte tel quel", async () => {
    await enregistrerJetons({ accessToken: "perime", refreshToken: "r" });
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith("/auth/refresh")
          ? jsonResponse(200, { accessToken: "neuf", expiresIn: "120s" })
          : jsonResponse(401, { erreur: "jeton_expire" }),
      ),
    );

    await expect(request("/books/abc", { schema: BookSchema })).rejects.toMatchObject({
      detail: { kind: "auth", code: "jeton_expire" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("laisse passer un 401 qui n'est pas une expiration", async () => {
    await enregistrerJetons({ accessToken: "acces", refreshToken: "r" });
    fetchMock.mockResolvedValue(jsonResponse(401, { erreur: "jeton_invalide" }));

    await expect(request("/books/abc", { schema: BookSchema })).rejects.toMatchObject({
      detail: { kind: "auth", code: "jeton_invalide" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("perd la session quand le rafraichissement est refuse", async () => {
    await enregistrerJetons({ accessToken: "perime", refreshToken: "r" });
    const perdue = jest.fn();
    surSessionPerdue(perdue);
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith("/auth/refresh")
          ? jsonResponse(401, { erreur: "refresh_invalide" })
          : jsonResponse(401, { erreur: "jeton_expire" }),
      ),
    );

    await expect(request("/books/abc", { schema: BookSchema })).rejects.toMatchObject({
      detail: { kind: "auth", code: "jeton_invalide" },
    });
    expect(perdue).toHaveBeenCalledTimes(1);
  });
});
