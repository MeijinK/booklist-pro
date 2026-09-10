import { StyleSheet, View } from "react-native";
import { Divider, Text } from "react-native-paper";

import { Cover } from "@/components/ui/Cover";
import { readableDate } from "@/components/ui/dates";
import { ToggleControl } from "@/components/ui/ToggleControl";
import type { Book } from "@/domain";
import { radius, space, useThemedStyles, type Palette } from "@/theme";

type Props = {
  book: Book;
  onToggleRead: (lu: boolean) => void;
  onToggleFavourite: (favori: boolean) => void;
};

/**
 * Presentation of a book record.
 *
 * No network access here: the two states a bookseller flips without opening the
 * form are raised as callbacks, so this component stays mountable as is in a
 * test, and the optimistic write keeps a single owner in features/books.
 */
export function BookDetail({ book, onToggleRead, onToggleFavourite }: Props) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Cover source={book.couverture} title={book.titre} size="detail" />

        <View style={styles.identity}>
          <Text variant="headlineMedium">{book.titre}</Text>
          <Text variant="bodyLarge">{book.auteur}</Text>
          {/* Read status and coup de coeur are the two things the team keeps
              up to date all day: they are flipped here, not behind the form. */}
          <View style={styles.badges}>
            <ToggleControl
              checked={book.lu}
              icon={{ on: "check-circle", off: "check-circle-outline" }}
              label={book.lu ? "Lu" : "Non lu"}
              name="Statut de lecture"
              onToggle={onToggleRead}
            />
            <ToggleControl
              checked={book.favori}
              icon={{ on: "heart", off: "heart-outline" }}
              label="Coup de coeur"
              name="Coup de coeur"
              onToggle={onToggleFavourite}
            />
          </View>
        </View>
      </View>

      <View style={styles.fields}>
        <Row label="Editeur" value={book.editeur} />
        <Row label="Annee de publication" value={String(book.annee)} />
        <Row
          label="Note de l'equipe"
          value={book.note === null ? "Pas encore notee" : `${book.note} sur 5`}
        />
        <Row label="Derniere modification" value={readableDate(book.updatedAt)} />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View>
      <View style={styles.row}>
        <Text variant="labelMedium" style={styles.label}>
          {label}
        </Text>
        <Text variant="bodyLarge">{value}</Text>
      </View>
      <Divider />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    block: { gap: space.xl, padding: space.lg },
    header: { flexDirection: "row", gap: space.lg },
    identity: { flexShrink: 1, gap: space.xs, justifyContent: "flex-start" },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm },
    fields: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      overflow: "hidden",
    },
    row: { gap: space.xxs, padding: space.md },
    label: { color: colors.textMuted },
  });
