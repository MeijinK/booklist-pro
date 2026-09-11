import { CACHE_MAX_AGE_MS, optionsPersistance } from "@/services/cachePersistant";
import { bookKeys, enrichmentKeys } from "@/services/queryKeys";

type Filtre = NonNullable<
  NonNullable<ReturnType<typeof optionsPersistance>["dehydrateOptions"]>["shouldDehydrateQuery"]
>;
type Query = Parameters<Filtre>[0];

function query(queryKey: readonly unknown[], status: "success" | "error" = "success"): Query {
  return { queryKey, state: { status } } as unknown as Query;
}

function filtre(): Filtre {
  const f = optionsPersistance().dehydrateOptions?.shouldDehydrateQuery;
  if (f === undefined) throw new Error("filtre attendu");
  return f;
}

describe("optionsPersistance", () => {
  it("garde le cache sept jours", () => {
    expect(optionsPersistance().maxAge).toBe(CACHE_MAX_AGE_MS);
    expect(CACHE_MAX_AGE_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("persiste les livres mais pas l'enrichissement Open Library", () => {
    expect(filtre()(query(bookKeys.detail("l-1")))).toBe(true);
    expect(filtre()(query(enrichmentKeys.byTitle("Dune")))).toBe(false);
  });

  it("ne persiste pas une requete en erreur", () => {
    expect(filtre()(query(bookKeys.detail("l-1"), "error"))).toBe(false);
  });
});
