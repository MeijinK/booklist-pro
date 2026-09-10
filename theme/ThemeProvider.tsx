import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import { DEFAULT_THEME_PREFERENCE, type ThemePreference } from "@/domain";
import { useStoredPreference } from "@/hooks/use-stored-preference";
import { readThemePreference, writeThemePreference } from "@/services/preferences";

import { palettes, type ColorScheme, type Palette } from "./colors";

export type AppTheme = {
  colors: Palette;
  /** The scheme actually painted, once "system" has been resolved. */
  scheme: ColorScheme;
  /** What the bookseller asked for, which may be "system". */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** False while the stored choice is read back; lets a caller hold the splash. */
  loaded: boolean;
};

const ThemeContext = createContext<AppTheme | null>(null);

/**
 * Carries the palette to the whole tree.
 *
 * Three states, not two: the bookseller may pick a scheme, or leave the device
 * to decide. "system" is the initial state the subject asks for, and it stays a
 * distinct value rather than being collapsed into whatever the device says
 * today — otherwise switching the workstation to night mode would no longer
 * follow.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useColorScheme();
  const stored = useStoredPreference(readThemePreference, writeThemePreference);

  const preference = stored.value ?? DEFAULT_THEME_PREFERENCE;
  const scheme: ColorScheme =
    preference === "system" ? (deviceScheme === "dark" ? "dark" : "light") : preference;

  const value = useMemo<AppTheme>(
    () => ({
      colors: palettes[scheme],
      scheme,
      preference,
      setPreference: stored.set,
      loaded: stored.loaded,
    }),
    [scheme, preference, stored.set, stored.loaded],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext);

  if (theme === null) {
    throw new Error("useAppTheme must be called inside a ThemeProvider.");
  }

  return theme;
}

/**
 * Builds a stylesheet from the current palette.
 *
 * Colours cannot live in a module-level `StyleSheet.create` any more, since
 * they now change at runtime. Rather than scattering inline styles, a component
 * wraps its existing block in a factory: the layout stays declared in one
 * place, and the sheet is rebuilt only when the palette actually changes.
 *
 * `factory` must be defined outside the component — a new function on every
 * render would rebuild the sheet on every render.
 */
export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const { colors } = useAppTheme();

  return useMemo(() => factory(colors), [factory, colors]);
}
