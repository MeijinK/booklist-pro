import { BookDraftSchema, BookSchema, maxPublicationYear, MIN_PUBLICATION_YEAR } from "@/domain";

const brouillon = {
  titre: "Le Seigneur des anneaux",
  auteur: "Tolkien",
  editeur: "Bourgois",
  annee: 1954,
  lu: false,
};

describe("BookDraftSchema", () => {
  it("accepte une saisie complete", () => {
    expect(BookDraftSchema.safeParse(brouillon).success).toBe(true);
  });

  it("refuse un titre vide ou reduit a des espaces", () => {
    expect(BookDraftSchema.safeParse({ ...brouillon, titre: "   " }).success).toBe(false);
  });

  it("retire les espaces autour des champs textuels", () => {
    const resultat = BookDraftSchema.safeParse({ ...brouillon, titre: "  Bilbo  " });

    expect(resultat.success && resultat.data.titre).toBe("Bilbo");
  });

  it("refuse une annee anterieure a l'imprimerie", () => {
    expect(BookDraftSchema.safeParse({ ...brouillon, annee: MIN_PUBLICATION_YEAR - 1 }).success).toBe(
      false,
    );
  });

  it("accepte l'annee prochaine, pour les parutions annoncees", () => {
    expect(BookDraftSchema.safeParse({ ...brouillon, annee: maxPublicationYear() }).success).toBe(
      true,
    );
  });

  it("refuse une annee au-dela de l'annee prochaine", () => {
    expect(
      BookDraftSchema.safeParse({ ...brouillon, annee: maxPublicationYear() + 1 }).success,
    ).toBe(false);
  });

  it("refuse une annee non entiere", () => {
    expect(BookDraftSchema.safeParse({ ...brouillon, annee: 1954.5 }).success).toBe(false);
  });
});

describe("BookSchema", () => {
  const livre = {
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

  it("accepte une fiche complete", () => {
    expect(BookSchema.safeParse(livre).success).toBe(true);
  });

  it("refuse une fiche a laquelle il manque la version, indispensable a la detection de conflit", () => {
    const { version, ...sansVersion } = livre;
    void version;

    expect(BookSchema.safeParse(sansVersion).success).toBe(false);
  });

  it("accepte une note et une couverture nulles", () => {
    expect(BookSchema.safeParse({ ...livre, note: null, couverture: null }).success).toBe(true);
  });

  it("laisse passer une annee hors bornes : le fonds existant n'a pas a etre rejete", () => {
    // Le sujet signale qu'une partie du fonds a ete saisie a la va-vite. Refuser
    // une fiche existante rendrait le catalogue inconsultable, alors que le
    // libraire doit justement pouvoir la corriger.
    expect(BookSchema.safeParse({ ...livre, annee: 1200 }).success).toBe(true);
  });
});
