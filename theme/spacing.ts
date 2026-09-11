/**
 * Spatial and temporal rhythm.
 *
 * The scale is not linear: small steps glue together two elements that read as
 * one, large steps separate two blocks. A single value used everywhere produces
 * a page without hierarchy.
 */

export const space = {
  /** Glues a chip to its text. */
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  /** Reference inset: screen margin, padding of a list row. */
  lg: 16,
  xl: 24,
  /** Breathing room for an empty state centred on the screen. */
  xxxl: 48,
} as const;

export const radius = {
  /** Chip, small control. */
  sm: 4,
  /** Panel, field group. */
  md: 8,
  /** Skeleton bar, which mimics a line of text. */
  round: 999,
} as const;

/** Maximum width of a text column, in pixels at the base font size. */
export const MAX_TEXT_WIDTH = 640;
