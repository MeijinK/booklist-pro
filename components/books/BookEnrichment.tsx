import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { Skeleton } from "@/components/ui/Skeleton";
import { radius, space, useThemedStyles, type Palette } from "@/theme";

type Props = {
  editionCount: number;
  firstPublishYear: number | null;
  loading: boolean;
};

/**
 * What a third-party catalogue knows about this title.
 *
 * Presentational only: the lookup lives in features/books, so this block stays
 * mountable in a test without a network.
 *
 * The source is named on purpose. These figures do not come from the shop, they
 * are matched on the title alone, and a title entered in a hurry can pull up
 * another work entirely. A bookseller who knows where a number comes from can
 * weigh it; one who thinks it is the shop's own data cannot.
 *
 * The block keeps its height while loading. Enrichment arrives after the record
 * is already on screen: growing afterwards would push the reading notes down
 * under the bookseller's eyes.
 */
export function BookEnrichment({ editionCount, firstPublishYear, loading }: Props) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.block}>
      <Text variant="labelMedium" style={styles.caption}>
        Ailleurs dans les catalogues
      </Text>

      {loading ? (
        <View style={styles.line}>
          <Skeleton height={16} width="48%" />
        </View>
      ) : (
        <View style={styles.line}>
          <Text variant="bodyLarge">{editionsLabel(editionCount)}</Text>
          {firstPublishYear === null ? null : (
            <Text variant="bodyMedium" style={styles.detail}>
              {`Premiere publication en ${firstPublishYear}`}
            </Text>
          )}
        </View>
      )}

      <Text variant="labelSmall" style={styles.source}>
        D&apos;apres OpenLibrary
      </Text>
    </View>
  );
}

/**
 * Nothing found is a normal answer for a collection partly entered in a hurry,
 * so it gets a sentence of its own rather than a bare zero. An outage produces
 * the same sentence: the enrichment degrades silently, by design.
 */
function editionsLabel(count: number): string {
  if (count === 0) return "Aucune edition referencee";
  if (count === 1) return "1 edition referencee";

  return `${count.toLocaleString("fr-FR")} editions referencees`;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    block: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      gap: space.xs,
      marginHorizontal: space.lg,
      padding: space.md,
    },
    caption: { color: colors.textMuted },
    // Fixed height: the skeleton and the answer occupy exactly the same space.
    line: { justifyContent: "center", minHeight: 24 },
    detail: { color: colors.textMuted },
    source: { color: colors.textMuted },
  });
