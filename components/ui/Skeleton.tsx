import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type DimensionValue } from "react-native";

import { radius, useThemedStyles, type Palette } from "@/theme";

/** One full round trip of the pulse. */
const PULSE_DURATION_MS = 1200;

type Props = {
  width?: DimensionValue;
  height?: number;
  /** Rounded corners of a block rather than of a line of text. */
  block?: boolean;
};

/**
 * A pulsing grey block, placed exactly where the expected content will land.
 *
 * The brief rules out the full-screen spinner: the skeleton says where the
 * content will appear and how much of it there will be, where a spinner only
 * says "wait". Its shape must therefore follow the real content, not the other
 * way round.
 */
export function Skeleton({ width = "100%", height = 14, block = false }: Props) {
  const styles = useThemedStyles(makeStyles);
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const cycle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: PULSE_DURATION_MS / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: PULSE_DURATION_MS / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    cycle.start();
    return () => cycle.stop();
  }, [opacity]);

  return (
    <Animated.View
      // No role: a screen reader has nothing to announce about absent content,
      // it is the list's loading state that carries the information.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        { height, width, borderRadius: block ? radius.sm : radius.round },
        { opacity },
      ]}
    />
  );
}

/** A group of skeletons announced as one block, so the wait is not repeated. */
export function LoadingArea({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} aria-busy>
      {children}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    base: { backgroundColor: colors.surfaceActive },
  });
