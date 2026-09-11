import { connexion } from "@/services/api/auth";
import { effacerJetons, jetonAcces, reinitialiserPourTests } from "@/services/auth/jetons";
import { stockageSecurise } from "@/services/stockageSecurise";

jest.mock("@/services/config", () => ({
  getBaseUrl: () => "http://api.test",
  REQUEST_TIMEOUT_MS: 50,
}));

function jsonResponse(status: number, body: unknown): Response {
  const response = {
    ok: status < 300,
    status,
    json: async () => body,
    clone: () => jsonResponse(status, body),
  };
  return response as unknown as Response;
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

describe("connexion", () => {
  it("range les jetons et ne rend que l'utilisateur", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        accessToken: "a",
        refreshToken: "r",
        expiresIn: "120s",
        utilisateur: { id: "u-1", email: "editeur@booklist.fr", role: "editeur" },
      }),
    );

    const utilisateur = await connexion("editeur@booklist.fr", "editeur123");

    expect(utilisateur).toEqual({ id: "u-1", email: "editeur@booklist.fr", role: "editeur" });
    expect(Object.keys(utilisateur)).not.toContain("refreshToken");
    expect(jetonAcces()).toBe("a");
    expect(await stockageSecurise.read("booklist.jeton.rafraichissement")).toBe("r");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/auth/login");
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("remonte des identifiants refuses comme erreur d'authentification", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        erreur: "identifiants_invalides",
        message: "Email ou mot de passe incorrect.",
      }),
    );

    await expect(connexion("x@y.fr", "faux")).rejects.toMatchObject({
      detail: { kind: "auth", code: "identifiants_invalides" },
    });
    expect(jetonAcces()).toBeNull();
  });
});
