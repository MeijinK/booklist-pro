import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { Skeleton } from "@/components/ui/Skeleton";
import { useTranslation } from "@/i18n";
import { space } from "@/theme";

type Props = {
  /** Number of books already displayed. */
  loaded: number;
  /** Size of the collection, as the server announces it. */
  total: number;
  /** Number of books the next page would bring. */
  perPage: number;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
};

/**
 * Foot of the list: what is loaded, what is left, and how to get more.
 *
 * The counter is not decorative. Without it, a twenty-row list drawn from a
 * five-hundred-book collection suggests the collection holds twenty rows, and
 * the bookseller concludes a book is missing when it is on page three.
 */
export function ListFooter({ loaded, total, perPage, hasMore, loading, onLoadMore }: Props) {
  const { t, plural, formatNumber } = useTranslation();
  const next = Math.min(perPage, total - loaded);

  return (
    <View style={styles.block}>
      <Text accessibilityLiveRegion="polite" variant="labelMedium">
        {plural("list.counted", loaded, { total: formatNumber(total) })}
      </Text>

      {loading ? (
        <View
          accessibilityLabel={t("list.more.loading")}
          accessibilityRole="progressbar"
          aria-busy
        >
          <Skeleton height={20} width={220} />
        </View>
      ) : hasMore ? (
        <Button mode="outlined" onPress={onLoadMore}>
          {plural("list.more", next)}
        </Button>
      ) : (
        <Text variant="labelMedium" style={styles.end}>
          {t("list.end")}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: "center",
    gap: space.sm,
    paddingBottom: space.xxxl,
    paddingTop: space.xl,
  },
  end: { fontStyle: "italic" },
});
