import { useQuery } from "@tanstack/react-query";

import { NO_ENRICHMENT, type BookEnrichment } from "@/domain";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fetchEnrichment, type CoverSize } from "@/services/api/openlibrary";
import { enrichmentKeys } from "@/services/queryKeys";

/**
 * A book's bibliographic record barely changes from one week to the next, and
 * the answer costs a third-party round trip: it is worth keeping far longer
 * than catalogue data.
 */
const ENRICHMENT_STALE_TIME_MS = 24 * 60 * 60 * 1000;

export type UseBookEnrichmentOptions = {
  /** Non-zero where the title is being typed; left at zero for a fixed title. */
  debounceMs?: number;
  size?: CoverSize;
  enabled?: boolean;
};

/**
 * Enrichment for one title.
 *
 * `data` always holds an answer once resolved, never an error: the underlying
 * service degrades to NO_ENRICHMENT rather than rejecting, so a caller never
 * has to guard a record against a third party being down.
 */
export function useBookEnrichment(title: string, options: UseBookEnrichmentOptions = {}) {
  const debouncedTitle = useDebouncedValue(title.trim(), options.debounceMs ?? 0);
  const enabled = (options.enabled ?? true) && debouncedTitle !== "";

  const query = useQuery({
    queryKey: enrichmentKeys.byTitle(debouncedTitle),
    queryFn: ({ signal }) => fetchEnrichment(debouncedTitle, { signal, size: options.size }),
    enabled,
    staleTime: ENRICHMENT_STALE_TIME_MS,
    gcTime: ENRICHMENT_STALE_TIME_MS,
  });

  const enrichment: BookEnrichment = query.data ?? NO_ENRICHMENT;

  return { ...query, enrichment };
}
