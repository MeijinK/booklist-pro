import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ProgressBar } from "react-native-paper";

import { BookListSkeleton } from "@/components/books/BookListSkeleton";
import { BookRow } from "@/components/books/BookRow";
import { ListFooter } from "@/components/books/ListFooter";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { DEFAULT_LIMIT, type Book } from "@/domain";
import { useThemedStyles, type Palette } from "@/theme";

import { useBooks } from "./useBooks";

type Props = {
  onOpen: (id: string) => void;
  onCreate: () => void;
};

/**
 * Collection screen: the four required states, and nothing else.
 *
 * Navigation arrives through callbacks rather than through the router: the list
 * therefore stays mountable in a test without a router, and the screen in
 * `app/` keeps the responsibility for routes.
 *
 * Deletion is not triggered here but from the book record: the five-second
 * grace period must appear where the bookseller just acted, and an open record
 * shows them exactly what they are about to lose.
 */
export function BookList({ onOpen, onCreate }: Props) {
  const styles = useThemedStyles(makeStyles);
  const query = useBooks({ limit: DEFAULT_LIMIT });

  const books = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const total = query.data?.pages[0]?.total ?? 0;

  // First load: nothing on screen, hence a skeleton. Later refreshes keep the
  // list and report themselves through the thin bar.
  if (query.isPending) return <BookListSkeleton />;

  if (query.isError && books.length === 0) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  if (books.length === 0) {
    return (
      <EmptyState
        title="Le fonds est vide"
        description="Aucun ouvrage n'a encore ete saisi pour cette boutique. Commencez par en ajouter un : le cahier se remplit ensuite tout seul."
        action={{ label: "Ajouter un ouvrage", onPress: onCreate }}
      />
    );
  }

  return (
    <View style={styles.block}>
      {/* A background refresh reports itself through a thin bar, without
          replacing the list: replacing it with a skeleton would make the screen
          flicker on every revalidation. Laid above the content and transparent
          to clicks, otherwise it intercepts the first row. */}
      <View style={styles.progress}>
        <ProgressBar indeterminate visible={query.isFetching && !query.isFetchingNextPage} />
      </View>

      {/* An error that occurs while data is already displayed does not erase it:
          the bookseller keeps consulting what they have. */}
      {query.isError ? (
        <ErrorState banner error={query.error} onRetry={() => void query.refetch()} />
      ) : null}

      <FlatList
        data={books}
        keyExtractor={bookKey}
        renderItem={({ item }) => <BookRow book={item} onOpen={onOpen} />}
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
    </View>
  );
}

function bookKey(book: Book): string {
  return book.id;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    block: { backgroundColor: colors.background, flex: 1 },
  // On the web, ProgressBar takes the full height of its parent: it needs a box
  // with a fixed height, otherwise it pushes the list off the screen.
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
