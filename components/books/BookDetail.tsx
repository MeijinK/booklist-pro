import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Divider, Text } from "react-native-paper";

import { StarRating } from "@/components/ui/StarRating";
import { ToggleControl } from "@/components/ui/ToggleControl";
import type { Book } from "@/domain";
import { useTranslation } from "@/i18n";
import { radius, space, useThemedStyles, type Palette } from "@/theme";

type Props = {
  book: Book;
  onToggleRead: (lu: boolean) => void;
  onToggleFavourite: (favori: boolean) => void;
  onRate: (note: number | null) => void;
};

/**
 * Presentation of a book record.
 *
 * No network access here: the two states a bookseller flips without opening the
 * form are raised as callbacks, so this component stays mountable as is in a
 * test, and the optimistic write keeps a single owner in features/books.
 */
export function BookDetail({ book, onToggleRead, onToggleFavourite, onRate }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { t, formatDate } = useTranslation();

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text variant="headlineMedium">{book.titre}</Text>
          <Text variant="bodyLarge">{book.auteur}</Text>
          {/* Read status and coup de coeur are the two things the team keeps
              up to date all day: they are flipped here, not behind the form. */}
          <View style={styles.badges}>
            <ToggleControl
              checked={book.lu}
              icon={{ on: "check-circle", off: "check-circle-outline" }}
              label={book.lu ? t("toggle.read.on") : t("toggle.read.off")}
              name={t("toggle.read.name")}
              onToggle={onToggleRead}
            />
            <ToggleControl
              checked={book.favori}
              icon={{ on: "heart", off: "heart-outline" }}
              label={t("toggle.favourite.name")}
              name={t("toggle.favourite.name")}
              onToggle={onToggleFavourite}
            />
          </View>
        </View>
      </View>

      <View style={styles.fields}>
        <Row label={t("field.editeur")} value={book.editeur} />
        <Row label={t("field.annee")} value={String(book.annee)} />
        {/* The only editable field of the block: rating a book is a daily
            gesture, and sending the bookseller through the form for one star
            would put a title correction at risk on every rating. */}
        <Row label={t("field.note")}>
          <StarRating value={book.note} onChange={onRate} />
        </Row>
        <Row label={t("field.updated")} value={formatDate(book.updatedAt)} />
      </View>
    </View>
  );
}

type RowProps = {
  label: string;
  /** A plain value, or a control when the field is editable in place. */
  value?: string;
  children?: ReactNode;
};

function Row({ label, value, children }: RowProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View>
      <View style={styles.row}>
        <Text variant="labelMedium" style={styles.label}>
          {label}
        </Text>
        {children ?? <Text variant="bodyLarge">{value}</Text>}
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
