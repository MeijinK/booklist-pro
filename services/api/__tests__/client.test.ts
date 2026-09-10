import { ApiError, BookSchema, type Book } from "@/domain";
import { request, requestNoContent } from "@/services/api/client";

// L'URL de base et le delai sont bouchonnes : les tests ne dependent pas de
// l'environnement, et le delai court garde la suite rapide.
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

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function stubFetch(implementation: jest.Mock): jest.Mock {
  global.fetch = implementation as unknown as typeof fetch;
  return implementation;
}

const vraiFetch = global.fetch;

afterEach(() => {
  global.fetch = vraiFetch;
});

describe("request", () => {
  it("rejoue un GET apres un 503 et rend la donnee validee", async () => {
    const appels = stubFetch(
      jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(503, { erreur: "indisponible" }))
        .mockResolvedValueOnce(jsonResponse(200, livre)),
    );

    await expect(request("/books/abc", { schema: BookSchema })).resolves.toEqual(livre);
    expect(appels).toHaveBeenCalledTimes(2);
  });

  it("n'insiste pas sur un 422 : la saisie ne deviendra pas valide en reessayant", async () => {
    const appels = stubFetch(
      jest.fn().mockResolvedValue(
        jsonResponse(422, { erreur: "validation", champs: { titre: "obligatoire" } }),
      ),
    );

    await expect(request("/books/abc", { schema: BookSchema })).rejects.toBeInstanceOf(ApiError);
    expect(appels).toHaveBeenCalledTimes(1);
  });

  it("ne rejoue jamais un POST, meme sur 503, pour ne pas creer de doublon", async () => {
    const appels = stubFetch(jest.fn().mockResolvedValue(jsonResponse(503, {})));

    await expect(
      request("/books", { method: "POST", body: { titre: "Neuf" }, schema: BookSchema }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(appels).toHaveBeenCalledTimes(1);
  });

  it("abandonne quand le serveur ne repond pas a temps", async () => {
    stubFetch(
      jest.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new Error("abandon")));
          }),
      ),
    );

    await expect(
      request("/books", { method: "POST", body: {}, schema: BookSchema }),
    ).rejects.toMatchObject({ detail: { kind: "network" } });
  });

  it("signale une reponse hors schema plutot que de la propager", async () => {
    const appels = stubFetch(jest.fn().mockResolvedValue(jsonResponse(200, { titre: "incomplet" })));

    await expect(request("/books/abc", { schema: BookSchema })).rejects.toMatchObject({
      detail: { kind: "network" },
    });
    // Un 200 n'est pas rejouable : insister ne produirait pas un autre corps.
    expect(appels).toHaveBeenCalledTimes(1);
  });

  it("laisse remonter une annulation sans la convertir en erreur applicative", async () => {
    stubFetch(jest.fn().mockRejectedValue(new Error("abandon")));

    const controleur = new AbortController();
    controleur.abort();

    // Une requete annulee n'est pas une panne : la convertir ferait clignoter un
    // ecran d'erreur a chaque frappe dans la barre de recherche.
    await expect(
      request("/books", { schema: BookSchema, signal: controleur.signal }),
    ).rejects.not.toBeInstanceOf(ApiError);
  });

  it("transmet les en-tetes fournis, dont If-Match", async () => {
    const appels = stubFetch(jest.fn().mockResolvedValue(jsonResponse(200, livre)));

    await request("/books/abc", {
      method: "PUT",
      body: livre,
      schema: BookSchema,
      headers: { "If-Match": "7" },
    });

    const [, init] = appels.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({ "If-Match": "7", "Content-Type": "application/json" });
  });
});

describe("requestNoContent", () => {
  it("accepte un 204 sans corps", async () => {
    stubFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => {
          throw new SyntaxError("corps vide");
        },
      } as unknown as Response),
    );

    await expect(requestNoContent("/books/abc", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
