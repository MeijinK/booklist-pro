import { StyleSheet, View } from "react-native";
import { Chip, Divider, List } from "react-native-paper";

import { Cover } from "@/components/ui/Cover";
import type { Book } from "@/domain";
import { space } from "@/theme";

type Props = {
  book: Book;
  onOpen: (id: string) => void;
};

/**
 * One row of the collection.
 *
 * Two reading levels only: the title, then the attribution line. The bookseller
 * scans the list sideways between two customers; a third piece of information
 * per row would slow that scan without ever helping a decision.
 */
export function BookRow({ book, onOpen }: Props) {
  return (
    <>
      <List.Item
        accessibilityRole="link"
        accessibilityLabel={`${book.titre}, ${book.auteur}${book.lu ? ", lu" : ""}`}
        onPress={() => onOpen(book.id)}
        title={book.titre}
        titleNumberOfLines={1}
        // The middle dot separates three pieces of information of equal rank
        // without imposing three columns, which would break below 480 px.
        description={`${book.auteur} · ${book.editeur} · ${book.annee}`}
        descriptionNumberOfLines={1}
        left={() => (
          <View style={styles.cover}>
            <Cover source={book.couverture} title={book.titre} />
          </View>
        )}
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
      <Divider />
    </>
  );
}

const styles = StyleSheet.create({
  cover: { justifyContent: "center", paddingLeft: space.lg },
  status: { alignSelf: "center" },
});
