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

const ROTATION: Record<number, DailyChallengeModeId> = {
  0: 'phone_number', // Sunday
  1: 'phone_number', // Monday
  2: 'phone_number', // Tuesday
  3: 'phone_number', // Wednesday
  4: 'phone_number', // Thursday
  5: 'phone_number', // Friday
  6: 'phone_number', // Saturday
};

export function getModeForDate(date: Date = new Date()): DailyChallengeModeId {
  return ROTATION[utcDayOfWeek(date)] ?? 'phone_number';
}

/** Display names live alongside the rotation so the home card +
 *  reveal screen can show them without each mode importing i18n
 *  separately. Localised at the call site via t(). */
export const MODE_DISPLAY_NAMES: Record<DailyChallengeModeId, string> = {
  phone_number: 'Phone Number',
  what_changed: 'What Changed',
  names_and_faces: 'Names & Faces',
  the_witness: 'The Witness',
};
