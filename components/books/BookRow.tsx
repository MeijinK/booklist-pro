import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Chip, Divider, Icon, List } from "react-native-paper";

import { FavouriteButton } from "@/components/ui/FavouriteButton";
import type { Book } from "@/domain";
import { useTranslation } from "@/i18n";
import { space, useAppTheme } from "@/theme";

type Props = {
  book: Book;
  onOpen: (id: string) => void;
  onToggleFavourite: (book: Book) => void;
  /** A reader account: the heart is shown when set, never offered. */
  readOnly?: boolean;
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
export const BookRow = memo(function BookRow({
  book,
  onOpen,
  onToggleFavourite,
  readOnly = false,
}: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.row}>
        <List.Item
          accessibilityRole="link"
          accessibilityLabel={t(book.lu ? "row.label.read" : "row.label", {
            titre: book.titre,
            auteur: book.auteur,
          })}
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
                {t("row.read")}
              </Chip>
            ) : null
          }
        />

        <View style={styles.heart}>
          {readOnly ? (
            book.favori ? (
              <View accessibilityLabel="Coup de coeur" style={styles.staticHeart}>
                <Icon size={22} source="heart" color={colors.accent} />
              </View>
            ) : null
          ) : (
            <FavouriteButton
              favourite={book.favori}
              title={book.titre}
              onToggle={() => onToggleFavourite(book)}
            />
          )}
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
  /** Same footprint as the button, so rows keep their height in both modes. */
  staticHeart: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
});
