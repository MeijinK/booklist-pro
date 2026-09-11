import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { useTranslation } from "@/i18n";
import { radius, space, useAppTheme, useThemedStyles, type Palette } from "@/theme";

type Segment = { libelle: string; valeur: number };

type Props = { titre: string; segments: readonly Segment[] };

/**
 * One horizontal bar split in proportion — read and unread, typically.
 *
 * Plain views, no chart library: the same code draws on the till's browser,
 * on a phone and under Jest, and every share carries its own accessible
 * sentence, which is how a screen reader receives a chart.
 */
export function BarreEmpilee({ titre, segments }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();
  const { t, formatNumber } = useTranslation();
  const total = segments.reduce((somme, s) => somme + s.valeur, 0);
  const palette = [colors.accent, colors.accentBorder, colors.borderStrong];

  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" variant="titleMedium">
        {titre}
      </Text>

      {total === 0 ? (
        <Text variant="bodyMedium" style={styles.muted}>
          {t("stats.empty")}
        </Text>
      ) : (
        <>
          <View style={styles.bar}>
            {segments.map((s, index) => {
              const percent = Math.round((s.valeur / total) * 100);
              return (
                <View
                  key={s.libelle}
                  accessibilityLabel={t("stats.share", {
                    label: s.libelle,
                    value: formatNumber(s.valeur),
                    total: formatNumber(total),
                    percent,
                  })}
                  style={[
                    styles.segment,
                    { flexBasis: `${percent}%`, backgroundColor: palette[index % palette.length] },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.legend}>
            {segments.map((s, index) => (
              <View key={s.libelle} style={styles.legendItem}>
                <View
                  style={[styles.swatch, { backgroundColor: palette[index % palette.length] }]}
                />
                <Text variant="bodyMedium">{`${s.libelle} ${formatNumber(s.valeur)}`}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    block: { gap: space.sm },
    bar: {
      borderRadius: radius.sm,
      flexDirection: "row",
      height: 24,
      overflow: "hidden",
    },
    segment: { flexGrow: 0, flexShrink: 0, height: "100%" },
    legend: { flexDirection: "row", flexWrap: "wrap", gap: space.lg },
    legendItem: { alignItems: "center", flexDirection: "row", gap: space.xs },
    swatch: { borderRadius: radius.sm, height: 12, width: 12 },
    muted: { color: colors.textMuted },
  });
