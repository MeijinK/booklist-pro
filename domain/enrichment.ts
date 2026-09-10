/**
 * What a third-party bibliographic service adds to a record, reduced to what a
 * bookseller actually needs at the counter.
 *
 * Every field tolerates absence: enrichment is a bonus on top of the shop's own
 * catalogue, never a condition for displaying it.
 */
export type BookEnrichment = {
  /**
   * How many editions the service references.
   * Zero is a normal answer for a book nobody catalogued, not a failure.
   */
  editionCount: number;
  firstPublishYear: number | null;
  /** Absolute cover address, or null when no image is referenced. */
  coverUrl: string | null;
};

/** What every failure degrades to: an answer, never an exception. */
export const NO_ENRICHMENT: BookEnrichment = {
  editionCount: 0,
  firstPublishYear: null,
  coverUrl: null,
};
