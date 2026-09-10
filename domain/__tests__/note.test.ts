import { NOTE_MAX_LENGTH, NoteDraftSchema, sortNotes, type Note } from "@/domain";

function note(id: string, createdAt: string): Note {
  return { id, livreId: "l-1", contenu: `Note ${id}`, createdAt };
}

describe("NoteDraftSchema", () => {
  it("refuses an empty note, before any round trip", () => {
    const result = NoteDraftSchema.safeParse({ contenu: "   " });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Une note de lecture ne peut pas etre vide.");
  });

  it("trims the surrounding whitespace instead of refusing it", () => {
    const result = NoteDraftSchema.safeParse({ contenu: "  Traduction inegale.  " });

    expect(result.data?.contenu).toBe("Traduction inegale.");
  });

  it("refuses beyond the length the server accepts", () => {
    const result = NoteDraftSchema.safeParse({ contenu: "a".repeat(NOTE_MAX_LENGTH + 1) });

    expect(result.success).toBe(false);
  });

  it("accepts exactly the length the server accepts", () => {
    const result = NoteDraftSchema.safeParse({ contenu: "a".repeat(NOTE_MAX_LENGTH) });

    expect(result.success).toBe(true);
  });
});

describe("sortNotes", () => {
  it("puts the most recent note first", () => {
    const sorted = sortNotes([
      note("old", "2026-07-10T09:40:06.361Z"),
      note("new", "2026-07-28T09:40:06.361Z"),
    ]);

    expect(sorted.map((entry) => entry.id)).toEqual(["new", "old"]);
  });

  it("leaves the received list untouched", () => {
    const received = [note("a", "2026-01-01T00:00:00.000Z"), note("b", "2026-02-01T00:00:00.000Z")];
    sortNotes(received);

    expect(received.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("places a note written just now above the ones the server returned", () => {
    const sorted = sortNotes([
      note("server", "2026-07-28T09:40:06.361Z"),
      note("local", new Date().toISOString()),
    ]);

    expect(sorted[0]?.id).toBe("local");
  });
});
