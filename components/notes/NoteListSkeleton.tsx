import { StyleSheet, View } from "react-native";

import { LoadingArea, Skeleton } from "@/components/ui/Skeleton";
import { useTranslation } from "@/i18n";
import { space, useThemedStyles, type Palette } from "@/theme";

type Props = { rows?: number };

/**
 * Skeleton of the reading notes, traced over NoteRow: a short timestamp line,
 * then one or two lines of prose. Two rows and not eight, because that is what
 * a book usually carries, and a longer skeleton would announce a wait that the
 * arriving content contradicts.
 */
export function NoteListSkeleton({ rows = 2 }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  return (
    <LoadingArea label={t("notes.loading")}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton height={12} width={160} />
          <Skeleton height={14} width={index % 2 === 0 ? "94%" : "76%"} />
          <Skeleton height={14} width={index % 2 === 0 ? "58%" : "42%"} />
        </View>
      ))}
    </LoadingArea>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      gap: space.sm,
      paddingBottom: space.md,
      paddingTop: space.sm,
    },
  });
