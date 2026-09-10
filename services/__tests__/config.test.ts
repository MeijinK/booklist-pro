import { resolveBaseUrl } from "@/services/config";

describe("resolveBaseUrl", () => {
  it("accepts an absolute URL without a trailing slash", () => {
    expect(resolveBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("ignores whitespace around the value", () => {
    expect(resolveBaseUrl("  http://localhost:3000  ")).toBe("http://localhost:3000");
  });

  it("says what to do when the variable is missing", () => {
    expect(() => resolveBaseUrl(undefined)).toThrow(/Copiez \.env\.example/);
  });

  it("treats an empty value as a missing variable", () => {
    expect(() => resolveBaseUrl("   ")).toThrow(/EXPO_PUBLIC_API_URL est absente/);
  });

  it("rejects a value that is not an absolute URL", () => {
    expect(() => resolveBaseUrl("localhost:3000")).toThrow(/URL absolue/);
  });

  it("rejects a trailing slash, which would produce doubled paths", () => {
    expect(() => resolveBaseUrl("http://localhost:3000/")).toThrow(/barre oblique/);
  });
});
