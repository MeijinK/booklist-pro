import { ApiError, type AuthCode } from "@/domain";
import { errorMessage } from "@/features/errors/messages";

function auth(code: AuthCode) {
  return errorMessage(
    new ApiError({ kind: "auth", code, message: "Role lecteur : action non autorisee." }),
  );
}

describe("messages d'authentification", () => {
  it("explique un 403 en termes de metier", () => {
    expect(auth("droits_insuffisants")).toEqual({
      title: "Action reservee aux libraires titulaires",
      detail:
        "Votre compte est en lecture seule. Demandez a un titulaire d'effectuer cette modification.",
      retryable: false,
    });
  });

  it("dit quand ce sont les identifiants qui sont refuses", () => {
    expect(auth("identifiants_invalides").detail).toBe("Email ou mot de passe incorrect.");
  });

  it.each<AuthCode>(["jeton_absent", "jeton_expire", "jeton_invalide", "refresh_invalide"])(
    "invite a se reconnecter pour %s",
    (code) => {
      expect(auth(code).title).toBe("Votre session n'est plus valide");
      expect(auth(code).retryable).toBe(false);
    },
  );
});
