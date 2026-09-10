/**
 * Application palette.
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
 */

export const colors = {
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
