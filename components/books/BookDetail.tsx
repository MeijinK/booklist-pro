import { StyleSheet, View } from "react-native";
import { Chip, Divider, Text } from "react-native-paper";

import { Cover } from "@/components/ui/Cover";
import type { Book } from "@/domain";
import { radius, space, useThemedStyles, type Palette } from "@/theme";

type Props = { book: Book };

/**
 * Presentation of a book record. No network access, no action: this component
 * only displays, which makes it mountable as is in a test.
 */
export function BookDetail({ book }: Props) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <Cover source={book.couverture} title={book.titre} size="detail" />

        <View style={styles.identity}>
          <Text variant="headlineMedium">{book.titre}</Text>
          <Text variant="bodyLarge">{book.auteur}</Text>
          <View style={styles.badges}>
            <Chip compact mode={book.lu ? "flat" : "outlined"}>
              {book.lu ? "lu" : "non lu"}
            </Chip>
            {book.favori ? (
              <Chip compact icon="heart" mode="flat">
                coup de coeur
              </Chip>
            ) : null}
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

/** Falls back to the raw value: an unreadable date beats an "Invalid Date". */
function readableDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    block: { gap: space.xl, padding: space.lg },
    header: { flexDirection: "row", gap: space.lg },
    identity: { flexShrink: 1, gap: space.xs, justifyContent: "flex-start" },
    badges: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
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
