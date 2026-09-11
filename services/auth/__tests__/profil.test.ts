import { ecrireUtilisateur, effacerUtilisateur, lireUtilisateur } from "@/services/auth/profil";
import { storage } from "@/services/storage";

beforeEach(() => effacerUtilisateur());

describe("le profil range localement", () => {
  it("revient tel qu'il a ete ecrit", async () => {
    await ecrireUtilisateur({ id: "u", email: "a@b.fr", role: "lecteur" });
    expect(await lireUtilisateur()).toEqual({ id: "u", email: "a@b.fr", role: "lecteur" });
  });

  it("est ignore s'il est illisible ou d'une autre forme", async () => {
    await storage.write("booklist.session.utilisateur", "{pas du json");
    expect(await lireUtilisateur()).toBeNull();
    await storage.write("booklist.session.utilisateur", JSON.stringify({ id: "u", role: "admin" }));
    expect(await lireUtilisateur()).toBeNull();
  });
});
