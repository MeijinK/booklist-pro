import type { Book } from "@/domain";
import type { CoverSize } from "@/services/api/openlibrary";
import { resolveCover, type Cover } from "@/services/cover";

import { useBookEnrichment } from "./useBookEnrichment";

export type UseBookCoverOptions = {
  size?: CoverSize;
  /** Set to false to stay strictly on the shop's own catalogue. */
  enrich?: boolean;
};

/**
 * The cover to display for a record, third-party fallback included.
 *
 * Precedence matters: the shop's own cover always wins. OpenLibrary is only
 * consulted when the field is empty, which halves the lookups and keeps a
 * bookseller's deliberate choice from being overridden by a stranger's guess.
 *
 * Chaining the two candidates lives here rather than in a component, so that
 * `resolveCover` stays the single place where a cover address is decided.
 */
export function useBookCover(
  book: Pick<Book, "couverture" | "titre">,
  options: UseBookCoverOptions = {},
): Cover {
  const shouldEnrich = (options.enrich ?? true) && book.couverture === null;

  const { enrichment } = useBookEnrichment(book.titre, {
    enabled: shouldEnrich,
    size: options.size,
  });

  return resolveCover(book.couverture ?? enrichment.coverUrl, book.titre);
}
