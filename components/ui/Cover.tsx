import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

import { resolveCover, titleInitials } from "@/services/cover";
import { colors, radius, space } from "@/theme";

type Props = {
  /** The `couverture` field as the server returned it. */
  source: string | null;
  title: string;
  size?: "row" | "detail";
};

const SIZES = {
  row: { width: 40, height: 56 },
  detail: { width: 132, height: 186 },
} as const;

/**
 * Cover thumbnail, with a fallback.
 *
 * The brief rules out the broken image: a load failure switches to the
 * initials, at the same place and the same size, so the list does not jump when
 * an image is missing.
 */
export function Cover({ source, title, size = "row" }: Props) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveCover(source, title);
  const dimensions = SIZES[size];

  if (resolved.kind === "fallback" || failed) {
    const initials = resolved.kind === "fallback" ? resolved.initials : titleInitials(title);

    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.base, styles.fallback, dimensions]}
      >
        <Text variant={size === "detail" ? "headlineSmall" : "labelLarge"} style={styles.initials}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityIgnoresInvertColors
      // The title is already read out on the row: repeating the alternative
      // would double the screen reader announcement without adding anything.
      alt=""
      contentFit="cover"
      onError={() => setFailed(true)}
      source={{ uri: resolved.uri }}
      style={[styles.base, dimensions]}
      transition={120}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceSunken,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  fallback: { alignItems: "center", justifyContent: "center", padding: space.xxs },
  initials: { color: colors.textMuted },
});
