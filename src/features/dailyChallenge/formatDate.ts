/**
 * Locale-aware date formatting helpers for the Daily Challenge.
 *
 * Pre-i18n we shipped a hardcoded English month list which always
 * formatted as "Mar 27" / "March 27, 2026" regardless of the user's
 * language. The Spanish locale would still see English month names,
 * which read as "this app forgot about me" for a 35+ Spanish-
 * speaking audience.
 *
 * Now we use Intl.DateTimeFormat keyed off the active i18n locale,
 * with a graceful fallback to the old English month list if Intl
 * isn't available (extremely rare on modern engines, but the
 * fallback means a missing-Intl crash can't take down the share
 * card or the result screen).
 */
import { i18n } from '@/src/i18n';

function bcp47ForLocale(locale: string): string {
  // i18n stores 'en' / 'es'. Intl prefers full BCP 47 tags. Map the
  // current value to a sensible regional default — UK English vs.
  // Spain Spanish — so date formatting feels native.
  if (locale === 'es') return 'es-ES';
  return 'en-GB';
}

function parseUtcDate(yyyymmdd: string): Date | null {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function fallbackShortMonth(month: number, locale: string): string {
  const en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const es = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return (locale === 'es' ? es : en)[month - 1] ?? '';
}

/** Short form for compact UI: "Mar 27" / "27 mar". */
export function formatHumanDate(yyyymmdd: string): string {
  const date = parseUtcDate(yyyymmdd);
  if (!date) return yyyymmdd;
  const localeTag = bcp47ForLocale(i18n.locale);
  try {
    return new Intl.DateTimeFormat(localeTag, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    const m = fallbackShortMonth(date.getUTCMonth() + 1, i18n.locale);
    return i18n.locale === 'es' ? `${date.getUTCDate()} ${m}` : `${m} ${date.getUTCDate()}`;
  }
}

/** Long form for share-card hero typography: "March 27, 2026" /
 *  "27 de marzo de 2026". */
export function formatLongDate(yyyymmdd: string): string {
  const date = parseUtcDate(yyyymmdd);
  if (!date) return yyyymmdd;
  const localeTag = bcp47ForLocale(i18n.locale);
  try {
    return new Intl.DateTimeFormat(localeTag, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return formatHumanDate(yyyymmdd);
  }
}
