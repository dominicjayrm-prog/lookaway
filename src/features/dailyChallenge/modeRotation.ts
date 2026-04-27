/**
 * Day-of-week to mode mapping.
 *
 * Phase 2 ships with only Phone Number, so every day plays Phone
 * Number. When future modes ship, only this constant changes; the
 * rotation infrastructure (date seed -> day -> mode -> instance)
 * is mode-agnostic.
 *
 * Eventual full rotation, kept commented for reference:
 *   Mon: names_and_faces  Tue: what_changed   Wed: phone_number
 *   Thu: the_witness      Fri: names_and_faces Sat: what_changed
 *   Sun: the_witness
 *
 * Days are indexed Sunday=0 through Saturday=6 to match
 * Date.getUTCDay() so callers don't need a translation layer.
 */
import type { DailyChallengeModeId } from './types';
import { utcDayOfWeek } from './seededRandom';
import { t } from '@/src/i18n';

// Phase 3 rotation: Phone Number + What Changed alternate so the
// player never gets the same mode two days running. Sunday stays
// on Phone Number for now; Names & Faces / The Witness will slot
// into the gaps as Phases 4+5 ship.
//
// TEMPORARY (QA): Monday is overridden from phone_number ->
// what_changed so the developer can play-test the new mode on
// release day instead of waiting for Tuesday. Revert this Monday
// entry to 'phone_number' before shipping production.
const ROTATION: Record<number, DailyChallengeModeId> = {
  0: 'phone_number',  // Sunday
  1: 'what_changed',  // Monday — TEMP QA OVERRIDE, revert to phone_number before prod
  2: 'what_changed',  // Tuesday
  3: 'phone_number',  // Wednesday
  4: 'what_changed',  // Thursday
  5: 'phone_number',  // Friday
  6: 'what_changed',  // Saturday
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
