import { StyleSheet, View } from "react-native";

import { LoadingArea, Skeleton } from "@/components/ui/Skeleton";
import { radius, space, useThemedStyles, type Palette } from "@/theme";

/** Skeleton of the book record, traced over the BookDetail layout. */
export function BookDetailSkeleton() {
  const styles = useThemedStyles(makeStyles);

  return (
    <LoadingArea label="Chargement de la fiche">
      <View style={styles.block}>
        <View style={styles.header}>
          <Skeleton block height={186} width={132} />
          <View style={styles.identity}>
            <Skeleton height={28} width="82%" />
            <Skeleton height={18} width="54%" />
            <Skeleton height={22} width={72} />
          </View>
        </View>

        <View style={styles.fields}>
          {[68, 54, 76, 62].map((width, index) => (
            <View key={index} style={styles.row}>
              <Skeleton height={12} width={`${width}%`} />
              <Skeleton height={16} width={`${width - 20}%`} />
            </View>
          ))}
        </View>
      </View>
    </LoadingArea>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    block: { gap: space.xl, padding: space.lg },
    header: { flexDirection: "row", gap: space.lg },
    identity: { flexShrink: 1, gap: space.md, paddingTop: space.xs },
    fields: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    row: {
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      gap: space.sm,
      padding: space.md,
    },
  });
