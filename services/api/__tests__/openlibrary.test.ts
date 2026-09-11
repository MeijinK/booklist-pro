import { NO_ENRICHMENT } from "@/domain";
import { fetchEnrichment } from "@/services/api/openlibrary";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function stubFetch(implementation: jest.Mock): jest.Mock {
  global.fetch = implementation as unknown as typeof fetch;
  return implementation;
}

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
});

describe("fetchEnrichment", () => {
  it("reduces a full answer to what the counter needs", async () => {
    stubFetch(
      jest.fn().mockResolvedValue(
        jsonResponse(200, {
          numFound: 42,
          docs: [{ title: "The Hobbit", first_publish_year: 1937 }],
        }),
      ),
    );

    await expect(fetchEnrichment("The Hobbit")).resolves.toEqual({
      editionCount: 42,
      firstPublishYear: 1937,
    });
  });

  it("treats zero editions as a normal answer, not a failure", async () => {
    stubFetch(jest.fn().mockResolvedValue(jsonResponse(200, { numFound: 0, docs: [] })));

    await expect(fetchEnrichment("Ouvrage saisi a la va-vite")).resolves.toEqual(NO_ENRICHMENT);
  });

  it("keeps the edition count when the referenced work has no publication year", async () => {
    stubFetch(
      jest.fn().mockResolvedValue(jsonResponse(200, { numFound: 3, docs: [{ title: "Sans date" }] })),
    );

    await expect(fetchEnrichment("Sans date")).resolves.toEqual({
      editionCount: 3,
      firstPublishYear: null,
    });
  });

  it("degrades silently when OpenLibrary answers with an error", async () => {
    stubFetch(jest.fn().mockResolvedValue(jsonResponse(500, "")));

    await expect(fetchEnrichment("The Hobbit")).resolves.toEqual(NO_ENRICHMENT);
  });

  it("degrades silently when the network is unreachable", async () => {
    stubFetch(jest.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND")));

    await expect(fetchEnrichment("The Hobbit")).resolves.toEqual(NO_ENRICHMENT);
  });

  it("degrades silently when the answer does not match the expected shape", async () => {
    stubFetch(jest.fn().mockResolvedValue(jsonResponse(200, { unexpected: true })));

    await expect(fetchEnrichment("The Hobbit")).resolves.toEqual(NO_ENRICHMENT);
  });

  it("degrades silently when OpenLibrary is too slow to answer", async () => {
    stubFetch(
      jest.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          }),
      ),
    );

    // A record must never wait on a third party: the timeout resolves to an
    // empty enrichment rather than propagating a failure.
    await expect(fetchEnrichment("The Hobbit", { timeoutMs: 10 })).resolves.toEqual(NO_ENRICHMENT);
  });

  it("lets a cancellation through, since it is not a failure", async () => {
    stubFetch(jest.fn().mockRejectedValue(new Error("aborted")));

    const controller = new AbortController();
    controller.abort();

    await expect(fetchEnrichment("The Hobbit", { signal: controller.signal })).rejects.toThrow();
  });

  it("asks for nothing when there is no title to look up", async () => {
    const calls = stubFetch(jest.fn());

    await expect(fetchEnrichment("   ")).resolves.toEqual(NO_ENRICHMENT);
    expect(calls).not.toHaveBeenCalled();
  });

  it("requests a single result and only the fields it displays", async () => {
    const calls = stubFetch(jest.fn().mockResolvedValue(jsonResponse(200, { numFound: 0, docs: [] })));

    await fetchEnrichment("The Hobbit");

    const [url] = calls.mock.calls[0] as [string];
    expect(url).toContain("limit=1");
    expect(url).toContain("fields=title%2Cfirst_publish_year");
    expect(url).toContain("title=The+Hobbit");
  });
});
