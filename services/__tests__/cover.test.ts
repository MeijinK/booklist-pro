import { resolveCover, titleInitials } from "@/services/cover";

const BASE = "http://localhost:3000";

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE;
});

describe("resolveCover", () => {
  it("prefixes a path served by the API", () => {
    expect(resolveCover("/covers/abc.svg", "Dune")).toEqual({
      kind: "remote",
      uri: `${BASE}/covers/abc.svg`,
    });
  });

  it("prefixes the second path shape as well", () => {
    expect(resolveCover("/media/abc.png", "Dune")).toEqual({
      kind: "remote",
      uri: `${BASE}/media/abc.png`,
    });
  });

  it("leaves a full address untouched", () => {
    const remote = "https://covers.openlibrary.org/b/id/42-L.jpg";

    expect(resolveCover(remote, "Dune")).toEqual({ kind: "remote", uri: remote });
  });

  it("falls back to the initials when the cover is missing", () => {
    expect(resolveCover(null, "La Horde du Contrevent")).toEqual({
      kind: "fallback",
      initials: "LH",
    });
  });

  it("treats an empty string as a missing cover", () => {
    expect(resolveCover("   ", "Dune")).toEqual({ kind: "fallback", initials: "D" });
  });

  it("prefers a readable fallback over an unknown shape", () => {
    expect(resolveCover("covers/abc.svg", "Dune")).toEqual({
      kind: "fallback",
      initials: "D",
    });
  });
});

describe("titleInitials", () => {
  it("takes the first two initials", () => {
    expect(titleInitials("le seigneur des anneaux")).toBe("LS");
  });

  it("ignores leading punctuation", () => {
    expect(titleInitials("« Dune »")).toBe("D");
  });

  it("yields a substitute rather than nothing for a title without letters", () => {
    expect(titleInitials("   ")).toBe("?");
  });
});
