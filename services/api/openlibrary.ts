import { z } from "zod";

import { NO_ENRICHMENT, type BookEnrichment } from "@/domain";

/**
 * Bibliographic enrichment through OpenLibrary.
 *
 * This call deliberately does NOT go through `services/api/client.ts`. That
 * client speaks to the shop's own API: it prefixes its base URL, maps its error
 * envelope, and throws. Here the rules are the opposite ones — a third-party
 * host, and above all a promise that never rejects: an OpenLibrary outage must
 * leave a record perfectly usable, so every failure degrades to NO_ENRICHMENT.
 */

const SEARCH_URL = "https://openlibrary.org/search.json";

/**
 * Shorter than the main API's timeout. Enrichment is a nicety: waiting ten
 * seconds for it would be worse than doing without.
 */
export const ENRICHMENT_TIMEOUT_MS = 5000;

/** Only the two fields we display; `fields` keeps the payload small. */
const SearchResponseSchema = z.object({
  numFound: z.number().int().nonnegative(),
  docs: z.array(
    z.object({
      title: z.string().optional(),
      first_publish_year: z.number().int().optional(),
    }),
  ),
});

function buildUrl(title: string): string {
  const params = new URLSearchParams({
    title,
    limit: "1",
    fields: "title,first_publish_year",
  });

  return `${SEARCH_URL}?${params.toString()}`;
}

export type EnrichmentOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * Never rejects, except when the caller cancels — a cancellation is not a
 * failure, and swallowing it would make TanStack Query treat an abandoned
 * request as an empty result.
 */
export async function fetchEnrichment(
  title: string,
  options: EnrichmentOptions = {},
): Promise<BookEnrichment> {
  const trimmed = title.trim();
  if (trimmed === "") return NO_ENRICHMENT;

  const controller = new AbortController();
  const relayAbort = () => controller.abort();
  const timer = setTimeout(relayAbort, options.timeoutMs ?? ENRICHMENT_TIMEOUT_MS);

  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener("abort", relayAbort, { once: true });
  }

  try {
    const response = await fetch(buildUrl(trimmed), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) return NO_ENRICHMENT;

    const parsed = SearchResponseSchema.safeParse(await response.json());
    if (!parsed.success) return NO_ENRICHMENT;

    return {
      editionCount: parsed.data.numFound,
      firstPublishYear: parsed.data.docs[0]?.first_publish_year ?? null,
    };
  } catch (cause) {
    if (options.signal?.aborted) throw cause;
    return NO_ENRICHMENT;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", relayAbort);
  }
}
