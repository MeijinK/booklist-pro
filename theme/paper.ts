import { Platform } from "react-native";
import { configureFonts, MD3LightTheme, type MD3Theme } from "react-native-paper";

import { colors } from "./colors";

/**
 * A single family, the system one: the application runs on heterogeneous till
 * workstations, and a font loaded at startup delays the first paint without
 * bringing anything to a data-entry tool.
 */
export const FONT_FAMILY = Platform.select({
  web: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  ios: "system-ui",
  default: "sans-serif",
});

/**
 * Translation of our tokens into the Material 3 vocabulary React Native Paper
 * expects.
 *
 * The theme is the only contact point between the project palette and the
 * library: a component reaching for `colors.accent` by hand would reintroduce
 * two sources of truth, and the day the palette moves, one of the two would be
 * forgotten.
 *
 * Light mode is the only one declared: the usage scene (a till workstation in
 * front of a sunlit shop window) settles it, and an untested dark theme would
 * be worse than no dark theme at all.
 */
export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  // Material's default corners are rounder than our scale: a single radius
  // aligns buttons, fields and dialogs on the same geometry.
  roundness: 2,
  fonts: configureFonts({ config: { fontFamily: FONT_FAMILY } }),
  colors: {
    ...MD3LightTheme.colors,

    primary: colors.accent,
    onPrimary: colors.textInverse,
    primaryContainer: colors.accentBackground,
    onPrimaryContainer: colors.accentPressed,

    secondary: colors.text,
    onSecondary: colors.textInverse,
    secondaryContainer: colors.surfaceSunken,
    onSecondaryContainer: colors.textStrong,

    tertiary: colors.accent,
    onTertiary: colors.textInverse,
    tertiaryContainer: colors.accentBackground,
    onTertiaryContainer: colors.accentPressed,

    error: colors.destructive,
    onError: colors.textInverse,
    errorContainer: colors.destructiveBackground,
    onErrorContainer: colors.destructivePressed,

    background: colors.background,
    onBackground: colors.text,
    surface: colors.surface,
    onSurface: colors.textStrong,
    surfaceVariant: colors.surfaceSunken,
    onSurfaceVariant: colors.textMuted,

    outline: colors.borderStrong,
    outlineVariant: colors.border,

    inverseSurface: colors.inverse,
    inverseOnSurface: colors.textInverse,
    inversePrimary: colors.accentBorder,

    surfaceDisabled: colors.surfaceSunken,
    onSurfaceDisabled: colors.textMuted,
    backdrop: "rgba(47, 49, 64, 0.45)",

    // Material tints surfaces according to their elevation. Ours are flat: we
    // neutralise the tint rather than suffer it halfway.
    elevation: {
      level0: "transparent",
      level1: colors.surface,
      level2: colors.surface,
      level3: colors.surfaceSunken,
      level4: colors.surfaceSunken,
      level5: colors.surfaceActive,
    },
  },
};
