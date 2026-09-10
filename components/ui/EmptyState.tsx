import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { space } from "@/theme";

type Props = {
  title: string;
  /** Says why it is empty and what to do next, never "no results". */
  description: string;
  action?: { label: string; onPress: () => void };
};

/**
 * Contextualised empty state.
 *
 * A collection that was never filled and a search with no answer are two
 * different situations: the first calls for a creation, the second for a
 * broader search. The component guesses nothing, the caller says which.
 */
export function EmptyState({ title, description, action }: Props) {
  return (
    <View style={styles.block}>
      <Text variant="headlineSmall">{title}</Text>
      <Text variant="bodyMedium" style={styles.description}>
        {description}
      </Text>

      {action === undefined ? null : (
        <Button mode="contained" onPress={action.onPress} style={styles.button}>
          {action.label}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.xxxl,
  },
  description: { maxWidth: 420, textAlign: "center" },
  button: { marginTop: space.md },
});
