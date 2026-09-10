import { BookDraftSchema, BookFormSchema, maxPublicationYear, MIN_PUBLICATION_YEAR } from "@/domain";

/** Reference valid input, of which each case changes only one field. */
function input(changes: Partial<Record<string, unknown>> = {}) {
  return {
    titre: "La Horde du Contrevent",
    auteur: "Alain Damasio",
    editeur: "La Volte",
    annee: "2004",
    lu: true,
    ...changes,
  };
}

describe("BookFormSchema", () => {
  it("converts the entered year into a number", () => {
    const result = BookFormSchema.safeParse(input());

    expect(result.success).toBe(true);
    expect(result.success && result.data.annee).toBe(2004);
  });

  it("trims whitespace around text fields", () => {
    const result = BookFormSchema.safeParse(input({ titre: "  Dune  " }));

    expect(result.success && result.data.titre).toBe("Dune");
  });

  it("rejects an empty title with a message addressed to the bookseller", () => {
    const result = BookFormSchema.safeParse(input({ titre: "   " }));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Le titre est obligatoire.");
  });

  it("rejects a year that is not an integer", () => {
    const result = BookFormSchema.safeParse(input({ annee: "19x4" }));

    expect(result.error?.issues[0]?.message).toBe("L'annee doit etre un nombre entier.");
  });

  it("rejects a year earlier than the printing press", () => {
    const result = BookFormSchema.safeParse(input({ annee: String(MIN_PUBLICATION_YEAR - 1) }));

    expect(result.success).toBe(false);
  });

  it("accepts next year, for an announced release", () => {
    const result = BookFormSchema.safeParse(input({ annee: String(maxPublicationYear()) }));

    expect(result.success).toBe(true);
  });

  it("rejects a year beyond next year", () => {
    const result = BookFormSchema.safeParse(input({ annee: String(maxPublicationYear() + 1) }));

    expect(result.success).toBe(false);
  });
});

describe("BookDraftSchema", () => {
  it("expects an already numeric year, unlike the form", () => {
    expect(BookDraftSchema.safeParse({ ...input(), annee: "2004" }).success).toBe(false);
    expect(BookDraftSchema.safeParse({ ...input(), annee: 2004 }).success).toBe(true);
  });
});
