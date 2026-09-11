import { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, View, type ListRenderItemInfo } from "react-native";
import { ProgressBar } from "react-native-paper";

import { BookListEmpty } from "@/components/books/BookListEmpty";
import { BookListSkeleton } from "@/components/books/BookListSkeleton";
import { BookRow } from "@/components/books/BookRow";
import { BookToolbar } from "@/components/books/BookToolbar";
import { ListFooter } from "@/components/books/ListFooter";
import { ErrorState } from "@/components/ui/ErrorState";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { DEFAULT_LIMIT, type Book } from "@/domain";
import { useSync } from "@/features/sync/useSync";
import { useThemedStyles, type Palette } from "@/theme";

import { isNarrowed, useBookQuery } from "./useBookQuery";
import { useBooks } from "./useBooks";
import { useToggleBook } from "./useToggleBook";

type Props = {
  onOpen: (id: string) => void;
  onCreate?: () => void;
  readOnly?: boolean;
};

/**
 * Collection screen: search, filters, sort, and the four required states.
 *
 * The toolbar is mounted once and never unmounted. Rebuilding it under a
 * skeleton on every filter change would take the focus and the typed text away
 * from a bookseller in the middle of a search, which is exactly when they can
 * least afford it.
 *
 * Deletion is not triggered here but from the book record: the five-second
 * grace period must appear where the bookseller just acted, and an open record
 * shows them exactly what they are about to lose.
 */
export function BookList({ onOpen, onCreate, readOnly = false }: Props) {
  const criteria = useBookQuery();
  const query = useBooks(criteria.filters);
  const toggle = useToggleBook();
  const styles = useThemedStyles(makeStyles);
  const { enLigne } = useSync();

  const books = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const total = query.data?.pages[0]?.total ?? 0;
  const narrowed = isNarrowed(criteria.query);

  // Destructured rather than called through the object: `mutate` keeps a stable
  // identity across renders where the mutation object does not, and that
  // stability is what lets the memoised rows skip a redraw.
  const { mutate: toggleBook } = toggle;

  const toggleFavourite = useCallback(
    (book: Book) => toggleBook({ id: book.id, changes: { favori: !book.favori } }),
    [toggleBook],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Book>) => (
      <BookRow
        book={item}
        onOpen={onOpen}
        onToggleFavourite={toggleFavourite}
        readOnly={readOnly}
      />
    ),
    [onOpen, toggleFavourite, readOnly],
  );

  return (
    <View style={styles.block}>
      <BookToolbar
        search={criteria.query.q}
        status={criteria.query.status}
        favouritesOnly={criteria.query.favori === true}
        sort={criteria.query.sort}
        order={criteria.query.order}
        onSearchChange={criteria.setSearch}
        onStatusChange={criteria.setStatus}
        onFavouritesChange={criteria.setFavourites}
        onSortChange={criteria.setSort}
        onOrderChange={criteria.setOrder}
      />

      {/* A background refresh reports itself through a thin bar, without
          replacing the list: replacing it with a skeleton would make the screen
          flicker on every revalidation. The box keeps its height at rest, so
          the list does not jump when the bar appears. */}
      <View style={styles.progress}>
        <ProgressBar indeterminate visible={query.isFetching && !query.isFetchingNextPage} />
      </View>

      {query.isPending ? <BookListSkeleton /> : null}

      {query.isError && books.length === 0 ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}

      {/* An error that occurs while data is already displayed does not erase it:
          the bookseller keeps consulting what they have. Offline, it is not
          even an error: the cache is doing its job. */}
      {query.isError && books.length > 0 ? (
        enLigne ? (
          <ErrorState banner error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <OfflineBanner visible />
        )
      ) : null}

      {query.isSuccess && books.length === 0 ? (
        <BookListEmpty
          narrowed={narrowed}
          onClear={criteria.clear}
          onCreate={onCreate}
          search={criteria.query.q}
        />
      ) : null}

      {books.length > 0 ? (
        <FlatList
          data={books}
          keyExtractor={bookKey}
          renderItem={renderItem}
          // The server paginates: we only ask for more on an explicit gesture,
          // page by page, never the five hundred books at once.
          ListFooterComponent={
            <ListFooter
              loaded={books.length}
              total={total}
              perPage={DEFAULT_LIMIT}
              hasMore={query.hasNextPage}
              loading={query.isFetchingNextPage}
              onLoadMore={() => void query.fetchNextPage()}
            />
          }
        />
      ) : null}

    </View>
  );
}

function bookKey(book: Book): string {
  return book.id;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    block: { backgroundColor: colors.background, flex: 1 },
    // On the web, ProgressBar takes the full height of its parent: it needs a
    // box with a fixed height, otherwise it pushes the list off the screen.
    progress: {
      height: 4,
      left: 0,
      pointerEvents: "none",
      position: "absolute",
      right: 0,
      top: 0,
      zIndex: 1,
    },
  });
