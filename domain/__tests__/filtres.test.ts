import { DEFAULT_FILTERS, normalizeFilters } from "@/domain";

describe("normalizeFilters", () => {
  it("applique les defauts du serveur", () => {
    expect(normalizeFilters({})).toMatchObject({
      limit: DEFAULT_FILTERS.limit,
      sort: "titre",
      order: "asc",
    });
  });

  it("laisse un filtre explicite primer sur le defaut", () => {
    expect(normalizeFilters({ sort: "annee", order: "desc" })).toMatchObject({
      sort: "annee",
      order: "desc",
    });
  });

  it("traite une recherche vide comme absente", () => {
    expect(normalizeFilters({ q: "   " }).q).toBeUndefined();
  });

  it("retire les espaces autour d'une recherche", () => {
    expect(normalizeFilters({ q: "  tolkien " }).q).toBe("tolkien");
  });

  it("rend des filtres implicites et explicites identiques, pour n'avoir qu'une entree de cache", () => {
    // Sans cette equivalence, deux ecrans demandant la meme chose declencheraient
    // deux requetes reseau et occuperaient deux entrees de cache distinctes.
    expect(normalizeFilters({})).toEqual(
      normalizeFilters({ sort: "titre", order: "asc", limit: DEFAULT_FILTERS.limit, q: "" }),
    );
  });

  it("conserve la page telle quelle : elle sert la requete, pas la cle de cache", () => {
    expect(normalizeFilters({ page: 3 }).page).toBe(3);
  });
});
