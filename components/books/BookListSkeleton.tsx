import { StyleSheet, View } from "react-native";

import { LoadingArea, Skeleton } from "@/components/ui/Skeleton";
import { colors, space } from "@/theme";

type Props = { rows?: number };

/**
 * Skeleton of the collection list.
 *
 * Its shape matches BookRow exactly: same thumbnail, same pair of text lines,
 * same height. A skeleton that does not look like the final content produces a
 * layout jump when the data arrives.
 */
export function BookListSkeleton({ rows = 8 }: Props) {
  return (
    <LoadingArea label="Chargement du fonds">
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton block height={56} width={40} />
          <View style={styles.texts}>
            {/* Uneven widths: identical bars read as a grid, not as text being
                awaited. */}
            <Skeleton height={16} width={index % 3 === 0 ? "52%" : "72%"} />
            <Skeleton height={12} width={index % 2 === 0 ? "38%" : "46%"} />
          </View>
        </View>
      ))}
    </LoadingArea>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  texts: { flexGrow: 1, gap: space.sm },
});
