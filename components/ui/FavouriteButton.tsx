import { StyleSheet } from "react-native";
import { IconButton } from "react-native-paper";

import { colors } from "@/theme";

type Props = {
  favourite: boolean;
  /** Named in the accessible label: in a list, "coup de coeur" alone is ambiguous. */
  title: string;
  onToggle: () => void;
};

/**
 * The coup de coeur, flipped in one tap.
 *
 * A hollow heart at rest, filled and carried by the accent once set. Never red:
 * red is this project's destructive colour, and a bookseller's favourite is not
 * a warning. The outline-to-fill change also survives altered colour vision,
 * which a colour change alone would not.
 *
 * Announced as a switch rather than a button, so what is read out is a state to
 * flip and not an action whose result has to be guessed.
 */
export function FavouriteButton({ favourite, title, onToggle }: Props) {
  return (
    <IconButton
      accessibilityLabel={`Coup de coeur, ${title}`}
      accessibilityRole="switch"
      // Both spellings, on purpose. React Native reads the nested state object;
      // react-native-web ignores it and only maps the flat ARIA props, so the
      // browser, which is target no. 1, would announce a switch with no state.
      accessibilityState={{ checked: favourite }}
      aria-checked={favourite}
      icon={favourite ? "heart" : "heart-outline"}
      iconColor={favourite ? colors.accent : colors.textMuted}
      onPress={onToggle}
      size={22}
      style={styles.button}
    />
  );
}

const styles = StyleSheet.create({
  /** 44 pt square: the brief's minimum, and Paper's default is below it. */
  button: { height: 44, margin: 0, width: 44 },
});
