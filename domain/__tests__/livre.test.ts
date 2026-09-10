import { BookDraftSchema, maxPublicationYear, MIN_PUBLICATION_YEAR, SaisieLivreSchema } from "@/domain";

/** Saisie valide de reference, dont chaque cas ne modifie qu'un champ. */
function saisie(modifications: Partial<Record<string, unknown>> = {}) {
  return {
    titre: "La Horde du Contrevent",
    auteur: "Alain Damasio",
    editeur: "La Volte",
    annee: "2004",
    lu: true,
    ...modifications,
  };
}

describe("SaisieLivreSchema", () => {
  it("convertit l'annee saisie en nombre", () => {
    const resultat = SaisieLivreSchema.safeParse(saisie());

    expect(resultat.success).toBe(true);
    expect(resultat.success && resultat.data.annee).toBe(2004);
  });

  it("retire les espaces autour des champs texte", () => {
    const resultat = SaisieLivreSchema.safeParse(saisie({ titre: "  Dune  " }));

    expect(resultat.success && resultat.data.titre).toBe("Dune");
  });

  it("refuse un titre vide avec un message adresse au libraire", () => {
    const resultat = SaisieLivreSchema.safeParse(saisie({ titre: "   " }));

    expect(resultat.success).toBe(false);
    expect(resultat.error?.issues[0]?.message).toBe("Le titre est obligatoire.");
  });

  it("refuse une annee qui n'est pas un entier", () => {
    const resultat = SaisieLivreSchema.safeParse(saisie({ annee: "19x4" }));

    expect(resultat.error?.issues[0]?.message).toBe("L'annee doit etre un nombre entier.");
  });

  it("refuse une annee anterieure a l'imprimerie", () => {
    const resultat = SaisieLivreSchema.safeParse(saisie({ annee: String(MIN_PUBLICATION_YEAR - 1) }));

    expect(resultat.success).toBe(false);
  });

  it("accepte l'annee prochaine, pour une parution annoncee", () => {
    const resultat = SaisieLivreSchema.safeParse(saisie({ annee: String(maxPublicationYear()) }));

    expect(resultat.success).toBe(true);
  });

  it("refuse une annee au-dela de l'annee prochaine", () => {
    const resultat = SaisieLivreSchema.safeParse(saisie({ annee: String(maxPublicationYear() + 1) }));

    expect(resultat.success).toBe(false);
  });
});

describe("BookDraftSchema", () => {
  it("attend une annee deja numerique, contrairement au formulaire", () => {
    expect(BookDraftSchema.safeParse({ ...saisie(), annee: "2004" }).success).toBe(false);
    expect(BookDraftSchema.safeParse({ ...saisie(), annee: 2004 }).success).toBe(true);
  });
});
