/**
 * Dates as a bookseller reads them.
 *
 * Every function falls back to the raw value rather than to "Invalid Date": a
 * timestamp nobody can parse is still information, an error message is not.
 */

function parse(iso: string): Date | undefined {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** "28 juillet 2026". For a record's last modification. */
export function readableDate(iso: string): string {
  const date = parse(iso);
  if (date === undefined) return iso;

  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * "28 juillet 2026 a 09:40". For a reading note.
 *
 * The hour is not decoration: several notes are written on the same day, by
 * different people, and the day alone would not order them.
 */
export function readableDateTime(iso: string): string {
  const date = parse(iso);
  if (date === undefined) return iso;

  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${readableDate(iso)} a ${time}`;
}
