import { StyleSheet, View } from "react-native";
import { Button, IconButton } from "react-native-paper";

import { space, useAppTheme } from "@/theme";

/** The scale the API accepts. */
const MAX_RATING = 5;

type Props = {
  /** `null` when the team has not rated the book yet. */
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
};

/**
 * The team's rating, out of five.
 *
 * Five radio buttons rather than a slider: a bookseller rates between two
 * customers, and a discrete choice is one tap where a slider is a drag with an
 * uncertain landing.
 *
 * Removing a rating is an explicit button, not a second tap on the current
 * star. A gesture whose effect cannot be guessed gets tried twice, and the
 * second try would restore what the first had just cleared.
 *
 * The API also accepts a rating of zero, which we do not offer: on a list, a
 * zero and an absence look identical, and a bookseller who wants to say "bad"
 * has the reading notes for that. A zero already stored is displayed correctly,
 * and reads out differently from an absence.
 */
export function StarRating({ value, onChange, disabled = false }: Props) {
  const { colors } = useAppTheme();
  const stars = Array.from({ length: MAX_RATING }, (_, index) => index + 1);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={`Note de l'equipe : ${spokenValue(value)}`}
      style={styles.block}
    >
      <View style={styles.stars}>
        {stars.map((star) => {
          const filled = value !== null && star <= value;

          return (
            <IconButton
              key={star}
              accessibilityRole="radio"
              accessibilityLabel={`Noter ${star} sur ${MAX_RATING}`}
              accessibilityState={{ checked: value === star, disabled }}
              disabled={disabled}
              icon={filled ? "star" : "star-outline"}
              iconColor={filled ? colors.accent : colors.textMuted}
              onPress={() => onChange(star)}
              // Paper centres a 24 px glyph in a 40 px container; the explicit
              // size brings the touch target to the 44 points the brief asks for.
              size={24}
              style={styles.star}
            />
          );
        })}
      </View>

      {value === null || disabled ? null : (
        <Button compact mode="text" onPress={() => onChange(null)}>
          Retirer la note
        </Button>
      )}
    </View>
  );
}

/** What a screen reader announces for the group as a whole. */
function spokenValue(value: number | null): string {
  if (value === null) return "pas encore notee";
  return `${value} sur ${MAX_RATING}`;
}

const styles = StyleSheet.create({
  block: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  stars: { flexDirection: "row" },
  star: { height: 44, margin: 0, width: 44 },
});
