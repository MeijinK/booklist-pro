import { StyleSheet } from "react-native";
import { Chip } from "react-native-paper";

import { colors, radius } from "@/theme";

type Props = {
  /** What the chip shows. Short: the row must survive a 480 px window. */
  label: string;
  /**
   * What a screen reader announces. Spelled out where the label is elliptical:
   * on its own, "Lus" says nothing about what it acts on.
   */
  name: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
};

/**
 * A filter, on or off.
 *
 * The state is carried three ways, because one is never enough: a filled
 * surface for the eye, the accent outline for a screen at an angle, and the
 * word "actif" in the accessible name for whoever hears the interface rather
 * than sees it.
 *
 * The height is set through the label's vertical margin rather than on the
 * container: Paper's ripple takes the height of its content, and forcing the
 * container alone would leave a 44 pt chip with a 32 pt touch target.
 */
export function FilterChip({ label, name, selected, onPress, icon }: Props) {
  return (
    <Chip
      accessibilityLabel={`${name}, ${selected ? "actif" : "inactif"}`}
      icon={icon}
      mode={selected ? "flat" : "outlined"}
      onPress={onPress}
      selected={selected}
      // The check mark would shift every neighbouring chip on selection; the
      // fill already says it, without moving the row.
      showSelectedCheck={false}
      style={[styles.chip, selected ? styles.selected : styles.unselected]}
      textStyle={styles.label}
    >
      {label}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: radius.md },
  selected: { backgroundColor: colors.accentBackground, borderColor: colors.accentBorder },
  unselected: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  /** 20 pt of line plus 2 x 12 of margin: a 44 pt target, ripple included. */
  label: { marginVertical: 12 },
});
