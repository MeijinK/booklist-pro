import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Chip, Divider, List } from "react-native-paper";

import { FavouriteButton } from "@/components/ui/FavouriteButton";
import type { Book } from "@/domain";
import { space } from "@/theme";

type Props = {
  book: Book;
  onOpen: (id: string) => void;
  onToggleFavourite: (book: Book) => void;
};

/**
 * One row of the collection.
 *
 * Two reading levels only: the title, then the attribution line. The bookseller
 * scans the list sideways between two customers; a third piece of information
 * per row would slow that scan without ever helping a decision.
 *
 * The heart sits outside the row's pressable area rather than inside it. Nested
 * pressables bubble on the web: a tap on the heart would toggle the coup de
 * coeur and open the record in the same gesture.
 *
 * Memoised on the book's identity: a keystroke in the search bar, or a coup de
 * coeur on a neighbour, redraws nothing here. The parent hands down callbacks
 * with a stable identity, which is what makes the comparison meaningful.
 */
export const BookRow = memo(function BookRow({ book, onOpen, onToggleFavourite }: Props) {
  return (
    <>
      <View style={styles.row}>
        <List.Item
          accessibilityRole="link"
          accessibilityLabel={`${book.titre}, ${book.auteur}${book.lu ? ", lu" : ""}`}
          onPress={() => onOpen(book.id)}
          style={styles.entry}
          title={book.titre}
          titleNumberOfLines={1}
          // The middle dot separates three pieces of information of equal rank
          // without imposing three columns, which would break below 480 px.
          description={`${book.auteur} · ${book.editeur} · ${book.annee}`}
          descriptionNumberOfLines={1}
          right={() =>
            book.lu ? (
              // Always text, never a colour dot alone: the status must stay
              // readable with altered colour vision.
              <Chip compact mode="flat" style={styles.status}>
                lu
              </Chip>
            ) : null
          }
        />

        <View style={styles.heart}>
          <FavouriteButton
            favourite={book.favori}
            title={book.titre}
            onToggle={() => onToggleFavourite(book)}
          />
        </View>
      </View>
      <Divider />
    </>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row" },
  entry: { flexShrink: 1, flexGrow: 1 },
  status: { alignSelf: "center" },
  heart: { paddingRight: space.sm },
});
