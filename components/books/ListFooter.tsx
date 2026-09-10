import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { Skeleton } from "@/components/ui/Skeleton";
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
  return (
    <View style={styles.block}>
      <Text accessibilityLiveRegion="polite" variant="labelMedium">
        {loaded} ouvrage{loaded > 1 ? "s" : ""} sur {total}
      </Text>

      {loading ? (
        <View accessibilityLabel="Chargement de la suite" accessibilityRole="progressbar" aria-busy>
          <Skeleton height={20} width={220} />
        </View>
      ) : hasMore ? (
        <Button mode="outlined" onPress={onLoadMore}>
          {`Charger ${Math.min(perPage, total - loaded)} ouvrages de plus`}
        </Button>
      ) : (
        <Text variant="labelMedium" style={styles.end}>
          Fin du fonds
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
