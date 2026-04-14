/**
 * Small date utilities used across the app.
 */

/** Today's date as a local YYYY-MM-DD string. */
export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
