import { Platform } from "react-native";
import { configureFonts, MD3DarkTheme, MD3LightTheme, type MD3Theme } from "react-native-paper";

import { palettes, type ColorScheme, type Palette } from "./colors";

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
 * library: a component reaching for a palette entry by hand would reintroduce
 * two sources of truth, and the day the palette moves, one of the two would be
 * forgotten.
 *
 * Both schemes are produced by the same function, from the same token names.
 * A variant cannot drift from the other by accident: adding a Material slot
 * here adds it to both at once.
 */
function buildTheme(colors: Palette, base: MD3Theme): MD3Theme {
  return {
    ...base,
    // Material's default corners are rounder than our scale: a single radius
    // aligns buttons, fields and dialogs on the same geometry.
    roundness: 2,
    fonts: configureFonts({ config: { fontFamily: FONT_FAMILY } }),
    colors: {
      ...base.colors,

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
      inverseOnSurface: colors.background,
      inversePrimary: colors.accentBorder,

      surfaceDisabled: colors.surfaceSunken,
      onSurfaceDisabled: colors.textMuted,
      backdrop: "rgba(21, 22, 30, 0.45)",

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
}

const themes: Record<ColorScheme, MD3Theme> = {
  light: buildTheme(palettes.light, MD3LightTheme),
  dark: buildTheme(palettes.dark, MD3DarkTheme),
};

/** Built once per scheme at import: a theme object is stable, rebuilding it on every render would defeat Paper's memoisation. */
export function paperTheme(scheme: ColorScheme): MD3Theme {
  return themes[scheme];
}
