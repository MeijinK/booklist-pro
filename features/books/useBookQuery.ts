import { useCallback, useMemo, useState } from "react";

import {
  DEFAULT_LIMIT,
  type BookFilters,
  type ReadStatus,
  type SortChoice,
  type SortOrder,
} from "@/domain";

/**
 * What the bookseller has asked of the collection: a search, a status, a
 * preference for coups de coeur, an order.
 *
 * Kept in one object rather than five states: they travel together into a
 * single cache key, and five separate setters would let two of them be applied
 * in two renders, hence two requests for one intention.
 */
export type BookQuery = {
  q: string;
  status: ReadStatus | undefined;
  /** `true` restricts to coups de coeur; `undefined` asks for everything. */
  favori: true | undefined;
  sort: SortChoice;
  order: SortOrder;
};

export const DEFAULT_BOOK_QUERY: BookQuery = {
  q: "",
  status: undefined,
  favori: undefined,
  sort: "titre",
  order: "asc",
};

/** True as soon as the displayed collection is no longer the whole collection. */
export function isNarrowed(query: BookQuery): boolean {
  return query.q.trim() !== "" || query.status !== undefined || query.favori !== undefined;
}

export function useBookQuery() {
  const [query, setQuery] = useState<BookQuery>(DEFAULT_BOOK_QUERY);

  // Each setter returns the previous object when nothing changes. Without that,
  // the debounced search would push an identical value at the end of every
  // pause and re-render the whole list for nothing.
  const setSearch = useCallback((q: string) => {
    setQuery((previous) => (previous.q === q ? previous : { ...previous, q }));
  }, []);

  const setStatus = useCallback((status: ReadStatus | undefined) => {
    setQuery((previous) => (previous.status === status ? previous : { ...previous, status }));
  }, []);

  const setFavourites = useCallback((only: boolean) => {
    const favori = only ? true : undefined;
    setQuery((previous) => (previous.favori === favori ? previous : { ...previous, favori }));
  }, []);

  const setSort = useCallback((sort: SortChoice) => {
    setQuery((previous) => (previous.sort === sort ? previous : { ...previous, sort }));
  }, []);

  const setOrder = useCallback((order: SortOrder) => {
    setQuery((previous) => (previous.order === order ? previous : { ...previous, order }));
  }, []);

  const clear = useCallback(() => setQuery(DEFAULT_BOOK_QUERY), []);

  /**
   * Translation into API parameters. The server filters, sorts and paginates:
   * nothing here narrows anything, it only says what to ask for.
   */
  const filters = useMemo<BookFilters>(
    () => ({
      limit: DEFAULT_LIMIT,
      q: query.q,
      status: query.status,
      favori: query.favori,
      sort: query.sort,
      order: query.order,
    }),
    [query],
  );

  return { query, filters, setSearch, setStatus, setFavourites, setSort, setOrder, clear };
}
