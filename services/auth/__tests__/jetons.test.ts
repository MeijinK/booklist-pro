import { ApiError } from "@/domain";
import {
  chargerJetons,
  effacerJetons,
  enregistrerJetons,
  jetonAcces,
  rafraichir,
  reinitialiserPourTests,
  surSessionPerdue,
} from "@/services/auth/jetons";
import { stockageSecurise } from "@/services/stockageSecurise";

jest.mock("@/services/config", () => ({
  getBaseUrl: () => "http://api.test",
  REQUEST_TIMEOUT_MS: 50,
}));

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
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

describe("le coffre", () => {
  it("ne garde rien en memoire tant que rien n'est charge", async () => {
    await stockageSecurise.write("booklist.jeton.acces", "ancien");
    expect(jetonAcces()).toBeNull();
    expect(await chargerJetons()).toBe(false);
    expect(jetonAcces()).toBe("ancien");
  });

  it("signale la presence d'un jeton de rafraichissement", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "r" });
    reinitialiserPourTests();
    expect(await chargerJetons()).toBe(true);
    expect(jetonAcces()).toBe("a");
  });
});

describe("rafraichir", () => {
  it("ne lance qu'un seul appel pour dix demandes simultanees", async () => {
    await enregistrerJetons({ accessToken: "perime", refreshToken: "r" });
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: "neuf", expiresIn: "120s" }));

    const resultats = await Promise.all(Array.from({ length: 10 }, () => rafraichir()));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(resultats).toEqual(Array(10).fill("neuf"));
    expect(jetonAcces()).toBe("neuf");
  });

  it("envoie le jeton de rafraichissement au serveur sans en-tete Authorization", async () => {
    await enregistrerJetons({ accessToken: "perime", refreshToken: "secret-r" });
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: "neuf", expiresIn: "120s" }));

    await rafraichir();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/auth/refresh");
    expect(JSON.parse(String(init.body))).toEqual({ refreshToken: "secret-r" });
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("accepte un nouvel appel une fois le precedent termine", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "r" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: "b", expiresIn: "120s" }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: "c", expiresIn: "120s" }));

    await rafraichir();
    await expect(rafraichir()).resolves.toBe("c");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("efface tout et previent quand le serveur refuse le jeton", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "r" });
    fetchMock.mockResolvedValue(jsonResponse(401, { erreur: "refresh_invalide" }));
    const perdue = jest.fn();
    surSessionPerdue(perdue);

    await expect(rafraichir()).rejects.toMatchObject({
      detail: { kind: "auth", code: "jeton_invalide" },
    });

    expect(perdue).toHaveBeenCalledTimes(1);
    expect(jetonAcces()).toBeNull();
    expect(await stockageSecurise.read("booklist.jeton.rafraichissement")).toBeNull();
  });

  it("garde les jetons quand c'est le reseau qui flanche", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "r" });
    fetchMock.mockResolvedValue(jsonResponse(503, { erreur: "service_indisponible" }));
    const perdue = jest.fn();
    surSessionPerdue(perdue);

    await expect(rafraichir()).rejects.toMatchObject({
      detail: { kind: "network", status: 503 },
    });

    expect(perdue).not.toHaveBeenCalled();
    expect(jetonAcces()).toBe("a");
  });

  it("perd la session sans appel reseau quand aucun jeton de rafraichissement n'existe", async () => {
    const perdue = jest.fn();
    surSessionPerdue(perdue);

    await expect(rafraichir()).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(perdue).toHaveBeenCalledTimes(1);
  });

  it("ne laisse jamais fuir le jeton de rafraichissement dans une erreur", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "tres-secret" });
    fetchMock.mockResolvedValue(jsonResponse(401, { erreur: "refresh_invalide" }));

    const erreur = await rafraichir().catch((cause: unknown) => cause);
    expect(JSON.stringify(erreur)).not.toContain("tres-secret");
    expect(String(erreur)).not.toContain("tres-secret");
  });
});
