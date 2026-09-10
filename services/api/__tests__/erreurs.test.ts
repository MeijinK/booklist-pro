import type { Book } from "@/domain";
import { toApiError } from "@/services/api/erreurs";

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

/**
 * Reponse minimale plutot qu'un vrai objet Response : l'environnement de test
 * ne fournit pas forcement les globales du reseau, et seules `status` et
 * `json()` sont lues par la fonction testee.
 */
function response(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError("corps illisible");
      return body;
    },
  } as unknown as Response;
}

describe("toApiError", () => {
  it("traduit un 422 en erreur de validation, champ par champ", async () => {
    const erreur = await toApiError(
      response(422, {
        erreur: "validation",
        message: "Saisie refusee.",
        champs: { titre: "titre obligatoire" },
      }),
    );

    expect(erreur.detail).toEqual({
      kind: "validation",
      message: "Saisie refusee.",
      champs: { titre: "titre obligatoire" },
    });
  });

  it("expose des champs vides plutot que de perdre l'information quand l'API n'en donne pas", async () => {
    const erreur = await toApiError(response(422, { erreur: "validation" }));

    expect(erreur.detail.kind).toBe("validation");
    expect(erreur.detail).toMatchObject({ champs: {} });
  });

  it("traduit un 409 en conflit porteur de la fiche serveur", async () => {
    const erreur = await toApiError(
      response(409, {
        erreur: "conflit",
        message: "Ce livre a ete modifie entre temps.",
        serveur: livre,
        versionAttendue: 7,
      }),
    );

    expect(erreur.detail).toEqual({
      kind: "conflict",
      message: "Ce livre a ete modifie entre temps.",
      serveur: livre,
      versionAttendue: 7,
    });
  });

  it("ne pretend pas a un conflit arbitrable quand le corps du 409 est illisible", async () => {
    const erreur = await toApiError(response(409));

    // Sans la fiche serveur, aucune strategie de resolution n'est applicable :
    // annoncer un conflit serait mentir a l'appelant.
    expect(erreur.detail.kind).toBe("network");
  });

  it("traduit un 404 en ressource introuvable, distincte d'une panne", async () => {
    const erreur = await toApiError(response(404, { erreur: "introuvable" }));

    expect(erreur.detail.kind).toBe("notFound");
  });

  it("reprend le code d'authentification renvoye par l'API", async () => {
    const erreur = await toApiError(response(401, { erreur: "jeton_expire" }));

    expect(erreur.detail).toMatchObject({ kind: "auth", code: "jeton_expire" });
  });

  it("deduit droits_insuffisants d'un 403 sans code exploitable", async () => {
    const erreur = await toApiError(response(403, { erreur: "inconnu" }));

    expect(erreur.detail).toMatchObject({ kind: "auth", code: "droits_insuffisants" });
  });

  it("traduit un 503 en panne reseau, en conservant le statut", async () => {
    const erreur = await toApiError(response(503));

    expect(erreur.detail).toMatchObject({ kind: "network", status: 503 });
  });

  it("reste utilisable sur un statut imprevu au corps illisible", async () => {
    const erreur = await toApiError(response(500));

    expect(erreur.detail).toMatchObject({ kind: "network", status: 500 });
    expect(erreur.message).not.toBe("");
  });
});
