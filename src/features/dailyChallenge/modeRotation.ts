/**
 * Day-of-week to mode mapping.
 *
 * Phase 4 rotation balances three modes across the week so no
 * mode plays two days in a row, and the harder Names & Faces day
 * lands on Saturday (when sessions tend to be longer / more
 * leisurely).
 *
 * Days are indexed Sunday=0 through Saturday=6 to match
 * Date.getUTCDay() so callers don't need a translation layer.
 */
import type { DailyChallengeModeId } from './types';
import { utcDayOfWeek } from './seededRandom';
import { t } from '@/src/i18n';

// Phase 6 rotation. Mental Tally takes Monday — the fresh-week slot
// where a crisp numbers challenge lands well — and no mode repeats
// on consecutive days. Weekly mix: Phone Number 1, Mental Tally 1,
// Names & Faces 2, What Changed 2, The Witness 1 — five distinct
// disciplines across seven days:
//   digits → arithmetic → faces → change → prose → change → faces
const ROTATION: Record<number, DailyChallengeModeId> = {
  0: 'phone_number',     // Sunday — Phone Number (hard, by tradition)
  1: 'mental_maths',     // Monday — Mental Tally (running-total arithmetic)
  2: 'names_and_faces',  // Tuesday — Names & Faces (easy)
  3: 'what_changed',     // Wednesday
  4: 'the_witness',      // Thursday — The Witness (reading mode)
  5: 'what_changed',     // Friday
  6: 'names_and_faces',  // Saturday — Names & Faces (hard)
};

export function getModeForDate(date: Date = new Date()): DailyChallengeModeId {
  return ROTATION[utcDayOfWeek(date)] ?? 'phone_number';
}

/** Display name for a mode, resolved against the current i18n
 *  locale. Modes get their own keys under daily_challenge.modes.*
 *  so "Phone Number" reads as "Número de teléfono" in Spanish, etc.
 *
 *  Function instead of a frozen constant so each call re-reads
 *  the active locale — toggling language at runtime updates the
 *  card / result screen / reveal subtitle on the next render. */
export function getModeDisplayName(mode: DailyChallengeModeId): string {
  return t(`daily_challenge.modes.${mode}`);
}

/** Localised tagline shown on the reveal screen under the mode
 *  title ("Memorise the digits..." / "Memorise the grid..."). */
export function getModeRevealSubtitle(mode: DailyChallengeModeId): string {
  // Subtitles live under their own keys so a mode without one can
  // fall back to an empty string without polluting the modes table.
  const key = `daily_challenge.modes.${mode}_subtitle`;
  const value = t(key);
  // i18n-js returns the key string when the lookup misses — guard
  // against that so a missing subtitle key doesn't render the raw
  // dotted path.
  return value === key ? '' : value;
}
