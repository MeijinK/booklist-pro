/**
 * GET /books parameters. The server filters, sorts and paginates: none of that
 * is redone on the client, the brief explicitly penalises it.
 *
 * The keys and values are those of the API query string; they are not
 * translated.
 */

import { DEFAULT_LIMIT } from "./page";

export const READ_STATUSES = ["lu", "nonlu"] as const;
export const SORT_FIELDS = ["titre", "auteur", "annee", "note", "updatedAt"] as const;
export const SORT_ORDERS = ["asc", "desc"] as const;

export type ReadStatus = (typeof READ_STATUSES)[number];
export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

/** A missing field is not sent: the server then applies its own default. */
export type BookFilters = {
  page?: number;
  limit?: number;
  q?: string;
  status?: ReadStatus;
  favori?: boolean;
  auteur?: string;
  sort?: SortField;
  order?: SortOrder;
};

/** Server defaults, restated here to build stable cache keys. */
export const DEFAULT_FILTERS = {
  limit: DEFAULT_LIMIT,
  sort: "titre",
  order: "asc",
} as const satisfies BookFilters;

/** Trims whitespace, and treats an empty string as a missing filter. */
function cleanText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

/**
 * Brings filters back to a canonical form: server defaults applied, empty
 * values removed.
 *
 * Without this step, `{}` and `{ sort: "titre", order: "asc" }` designate the
 * same server response but produce two distinct cache entries, hence two
 * network requests for nothing.
 */
export function normalizeFilters(filters: BookFilters): BookFilters {
  return {
    page: filters.page,
    limit: filters.limit ?? DEFAULT_FILTERS.limit,
    q: cleanText(filters.q),
    status: filters.status,
    favori: filters.favori,
    auteur: cleanText(filters.auteur),
    sort: filters.sort ?? DEFAULT_FILTERS.sort,
    order: filters.order ?? DEFAULT_FILTERS.order,
  };
}
