import { ConnexionSchema, peutEcrire, UtilisateurSchema } from "@/domain";

describe("peutEcrire", () => {
  it("n'accorde l'ecriture qu'a l'editeur", () => {
    expect(peutEcrire("editeur")).toBe(true);
    expect(peutEcrire("lecteur")).toBe(false);
    expect(peutEcrire(undefined)).toBe(false);
  });
});

describe("UtilisateurSchema", () => {
  it("refuse un role inconnu", () => {
    expect(
      UtilisateurSchema.safeParse({ id: "u", email: "a@b.fr", role: "admin" }).success,
    ).toBe(false);
  });
});

describe("ConnexionSchema", () => {
  it("exige un email valide et un mot de passe", () => {
    const result = ConnexionSchema.safeParse({ email: "pas-un-email", motDePasse: "" });
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages).toContain("Cet email n'est pas valide.");
    expect(messages).toContain("Le mot de passe est obligatoire.");
  });

  it("nettoie les espaces autour de l'email", () => {
    expect(ConnexionSchema.parse({ email: "  a@b.fr ", motDePasse: "x" }).email).toBe("a@b.fr");
  });
});
