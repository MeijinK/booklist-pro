import { ApiError, type AuthCode } from "@/domain";
import { errorMessage } from "@/features/errors/messages";

function auth(code: AuthCode) {
  return errorMessage(
    new ApiError({ kind: "auth", code, message: "Role lecteur : action non autorisee." }),
  );
}

describe("messages d'authentification", () => {
  it("explique un 403 en termes de metier", () => {
    // The function answers with catalogue keys, not sentences: it has no access
    // to the language, and the interface is bilingual.
    expect(auth("droits_insuffisants")).toEqual({
      titleKey: "error.forbidden.title",
      detail: { key: "error.forbidden.detail" },
      retryable: false,
    });
  });

  it("dit quand ce sont les identifiants qui sont refuses", () => {
    expect(auth("identifiants_invalides").detail).toEqual({ key: "error.credentials.detail" });
  });

  it.each<AuthCode>(["jeton_absent", "jeton_expire", "jeton_invalide", "refresh_invalide"])(
    "invite a se reconnecter pour %s",
    (code) => {
      expect(auth(code).titleKey).toBe("error.session.title");
      expect(auth(code).retryable).toBe(false);
    },
  );
});
