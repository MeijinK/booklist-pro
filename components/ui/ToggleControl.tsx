import { StyleSheet, View } from "react-native";
import { Icon, Text, TouchableRipple } from "react-native-paper";

import { radius, space, useAppTheme, useThemedStyles, type Palette } from "@/theme";

type Props = {
  checked: boolean;
  /** Shown on screen. May state the value itself: "Lu" against "Non lu". */
  label: string;
  /** Announced by a screen reader. Names what is being flipped, not its value. */
  name: string;
  /** Filled glyph when on, hollow when off. */
  icon: { on: string; off: string };
  onToggle: (next: boolean) => void;
};

/**
 * A state a bookseller flips in one tap, with its name written next to it.
 *
 * Built on TouchableRipple rather than on Paper's Button: Button pins its
 * accessibility state to `disabled`, so a switch built from it would announce
 * its role without ever announcing whether it is on.
 *
 * The visible label carries the value, the accessible name carries the subject,
 * and the state travels separately. Whoever hears "statut de lecture, coche"
 * gets the same thing as whoever reads "Lu" in a filled box.
 */
export function ToggleControl({ checked, label, name, icon, onToggle }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();

  return (
    <TouchableRipple
      accessibilityLabel={name}
      accessibilityRole="switch"
      // Both spellings, on purpose. React Native reads the nested state object;
      // react-native-web ignores it and only maps the flat ARIA props, so the
      // browser, which is target no. 1, would announce a switch with no state.
      accessibilityState={{ checked }}
      aria-checked={checked}
      borderless
      onPress={() => onToggle(!checked)}
      style={[styles.control, checked ? styles.on : styles.off]}
    >
      <View style={styles.content}>
        <Icon
          size={20}
          source={checked ? icon.on : icon.off}
          color={checked ? colors.accent : colors.textMuted}
        />
        <Text variant="labelLarge" style={checked ? styles.labelOn : styles.labelOff}>
          {label}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    control: {
      borderRadius: radius.md,
      borderWidth: 1,
      height: 44,
      justifyContent: "center",
      paddingHorizontal: space.md,
    },
    on: { backgroundColor: colors.accentBackground, borderColor: colors.accentBorder },
    off: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
    content: { alignItems: "center", flexDirection: "row", gap: space.sm },
    labelOn: { color: colors.accentPressed },
    labelOff: { color: colors.text },
  });
