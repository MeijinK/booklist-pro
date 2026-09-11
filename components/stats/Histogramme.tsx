import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { useTranslation } from "@/i18n";
import { radius, space, useThemedStyles, type Palette } from "@/theme";

type Barre = { libelle: string; valeur: number };

type Props = { titre: string; barres: readonly Barre[] };

/**
 * Vertical bars, one per value, the tallest filling the box. Heights are
 * percentages of the maximum so the chart follows the screen's width and
 * needs no measurement pass.
 */
export function Histogramme({ titre, barres }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { t, formatNumber } = useTranslation();
  const max = Math.max(1, ...barres.map((b) => b.valeur));

  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" variant="titleMedium">
        {titre}
      </Text>

      {barres.length === 0 ? (
        <Text variant="bodyMedium" style={styles.muted}>
          {t("stats.empty")}
        </Text>
      ) : (
        <View style={styles.chart}>
          {barres.map((b) => (
            <View key={b.libelle} style={styles.column}>
              <Text variant="labelSmall">{formatNumber(b.valeur)}</Text>
              <View style={styles.track}>
                <View
                  accessibilityLabel={t("stats.bar", { label: b.libelle, value: formatNumber(b.valeur) })}
                  style={[styles.bar, { height: `${Math.round((b.valeur / max) * 100)}%` }]}
                />
              </View>
              <Text variant="labelSmall" numberOfLines={1}>
                {b.libelle}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    block: { gap: space.sm },
    chart: { flexDirection: "row", gap: space.xs },
    column: { alignItems: "center", flex: 1, gap: space.xxs },
    track: { height: 120, justifyContent: "flex-end", width: "100%" },
    bar: { backgroundColor: colors.accent, borderRadius: radius.sm, minHeight: 2, width: "100%" },
    muted: { color: colors.textMuted },
  });
