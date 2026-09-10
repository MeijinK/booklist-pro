/**
 * Application palette, in two variants.
 *
 * Chosen strategy: neutrals tinted toward midnight-blue ink (OKLCH hue 265),
 * a single accent reserved for primary actions, focus and selection. The brick
 * red only serves destructive actions. No saturated fill covers a large area:
 * the till workstation is stared at eight hours a day.
 *
 * Values are written in hexadecimal, with their OKLCH source in a comment:
 * React Native on native cannot read `oklch()`, whereas hue and chroma are what
 * make the palette re-readable. No `#000` or `#fff`: a pure neutral next to
 * tinted neutrals stands out.
 *
 * The dark variant is not an inversion. Lightness is mirrored while chroma is
 * lowered on large surfaces and raised on the accent, because a colour keeps
 * far less apparent saturation on a dark ground. Both variants carry the same
 * token names, which is what lets a component switch without knowing it did.
 */

export const lightColors = {
  /** Application background. oklch(0.985 0.003 265) */
  background: "#f9f9fb",
  /** Surface laid on the background: list rows, fields, panels. oklch(0.995 0.002 265) */
  surface: "#fdfdfe",
  /** Secondary surface: headers, toolbars. oklch(0.955 0.005 265) */
  surfaceSunken: "#eff0f4",
  /** Surface of a hovered or selected element. oklch(0.93 0.006 265) */
  surfaceActive: "#e8e9ef",

  /** List separator, field outline at rest. oklch(0.91 0.008 265) */
  border: "#e2e3ea",
  /** Stronger outline: hovered field, secondary button outline. oklch(0.86 0.01 265) */
  borderStrong: "#d3d5df",

  /** Title, value, everything read first. oklch(0.26 0.02 265) */
  textStrong: "#2f3140",
  /** Body text. oklch(0.42 0.018 265) */
  text: "#585a6b",
  /** Metadata, caption, disabled text. oklch(0.56 0.015 265) */
  textMuted: "#7b7d8c",
  /** Text laid on the accent or on the destructive color. oklch(0.99 0.002 265) */
  textInverse: "#fbfbfd",

  /** Primary action, focus ring, current element. oklch(0.48 0.13 265) */
  accent: "#3c4ca8",
  /** Pressed accent. oklch(0.41 0.13 265) */
  accentPressed: "#313f92",
  /** Background of an accent-carried element: status chip, selected row. oklch(0.955 0.02 265) */
  accentBackground: "#e9ebf9",
  /** Outline of an accent-carried element. oklch(0.85 0.05 265) */
  accentBorder: "#c3c8ea",

  /** Deletion, input error, failure message. oklch(0.52 0.17 25) */
  destructive: "#b4352c",
  /** Pressed destructive. oklch(0.45 0.16 25) */
  destructivePressed: "#992c24",
  /** Background of an error banner. oklch(0.965 0.02 25) */
  destructiveBackground: "#fbebe8",

  /** Background of the undo bar, laid above the content. oklch(0.30 0.02 265) */
  inverse: "#3a3c4c",
} as const;

/** Every variant answers to this shape; nothing else may be added to one alone. */
export type Palette = { readonly [K in keyof typeof lightColors]: string };

export const darkColors: Palette = {
  /** oklch(0.19 0.012 265) */
  background: "#1b1c24",
  /** oklch(0.23 0.014 265) */
  surface: "#23252f",
  /** oklch(0.16 0.012 265) */
  surfaceSunken: "#15161e",
  /** oklch(0.29 0.016 265) */
  surfaceActive: "#2e303c",

  /** oklch(0.32 0.014 265) */
  border: "#343642",
  /** oklch(0.40 0.016 265) */
  borderStrong: "#45485a",

  /** oklch(0.96 0.004 265) */
  textStrong: "#f2f2f6",
  /** oklch(0.84 0.008 265) */
  text: "#cfd0d9",
  /** oklch(0.66 0.012 265) */
  textMuted: "#9b9cab",
  /**
   * Text laid on the accent or on the destructive colour. Dark here, because
   * both are light on this ground — the token keeps its role, not its value.
   * oklch(0.20 0.015 265)
   */
  textInverse: "#1d1f28",

  /** oklch(0.72 0.11 265) */
  accent: "#8a95e8",
  /** oklch(0.79 0.10 265) */
  accentPressed: "#a0aaef",
  /** oklch(0.28 0.05 265) */
  accentBackground: "#292c4a",
  /** oklch(0.42 0.08 265) */
  accentBorder: "#454a80",

  /** oklch(0.68 0.15 25) */
  destructive: "#e2796a",
  /** oklch(0.75 0.13 25) */
  destructivePressed: "#f0937f",
  /** oklch(0.28 0.06 25) */
  destructiveBackground: "#3d2622",

  /**
   * The undo bar sits above the content and must stay a contrast to it, so on
   * this ground it becomes light. oklch(0.90 0.006 265)
   */
  inverse: "#e2e3e9",
};

export type ColorScheme = "light" | "dark";

export const palettes: Record<ColorScheme, Palette> = {
  light: lightColors,
  dark: darkColors,
};
