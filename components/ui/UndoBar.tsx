import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ProgressBar, Snackbar, Text, useTheme } from "react-native-paper";

import { useTranslation } from "@/i18n";
import { space } from "@/theme";

const STEP_MS = 100;

type Props = {
  message: string;
  onUndo: () => void;
  /** Length of the grace period, in milliseconds. The gauge mirrors it exactly. */
  delayMs: number;
  /** Changes on every new operation, to restart the gauge from the beginning. */
  resetKey: string;
};

/**
 * Undo bar shown during the grace period of a destructive operation.
 *
 * The gauge is not decorative: it says how much time is left to change one's
 * mind. Without it, the bookseller does not know whether four seconds remain or
 * half a one, and the button becomes a gamble.
 */
export function UndoBar({ message, onUndo, delayMs, resetKey }: Props) {
  const [remaining, setRemaining] = useState(delayMs);
  const { colors } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    setRemaining(delayMs);
    const start = Date.now();

    const timer = setInterval(() => {
      setRemaining(Math.max(0, delayMs - (Date.now() - start)));
    }, STEP_MS);

    return () => clearInterval(timer);
  }, [resetKey, delayMs]);

  return (
    <Snackbar
      visible
      // The grace period is driven by the deferred mutation, not by the bar:
      // Paper's automatic dismissal must decide nothing.
      onDismiss={() => {}}
      duration={Number.POSITIVE_INFINITY}
      action={{ label: t("record.undo"), onPress: onUndo }}
    >
      <View style={styles.block}>
        <Text style={{ color: colors.inverseOnSurface }}>{message}</Text>
        {/* ProgressBar takes the full height of its parent on the web: the box
            around it therefore sets its own. */}
        <View style={styles.gauge}>
          <ProgressBar color={colors.inversePrimary} progress={remaining / delayMs} />
        </View>
      </View>
    </Snackbar>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  gauge: { height: 4 },
});
