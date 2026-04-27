/**
 * Phone Number mode — pure logic.
 *
 * Sequence of digits flashes, disappears, player taps them back. Per
 * the spec the difficulty ramps across the week (the "Sunday is
 * hard" tradition), and the digits are generated deterministically
 * from the date seed so every player sees the same number.
 *
 * Generation rules (spec 2.1):
 *   - Digits 0-9
 *   - First digit never 0 (looks like a real reference code)
 *   - No more than two of the same digit in a row (no 555 or 7777)
 *
 * Scoring (spec 2.3):
 *   - Each correct digit in correct position = 1 point
 *   - Score = round(correct / total * 100)
 */
import { createSeededRng, dateToSeed, todayUtcIso, utcDayOfWeek } from '../../seededRandom';
import { getModeDisplayName, getModeRevealSubtitle } from '../../modeRotation';
import type { DailyChallengeInstance } from '../../types';

export interface PhoneNumberConfig {
  digits: readonly number[];
  /** Memorise window in seconds; ramps with difficulty so longer
   *  sequences get a touch more time. */
  viewSeconds: number;
}

/** Length-by-day-of-week. Sunday is the hardest by tradition. */
const DIGIT_COUNT_BY_DOW: Record<number, number> = {
  0: 9, // Sunday
  1: 6, // Monday
  2: 6, // Tuesday
  3: 7, // Wednesday
  4: 7, // Thursday
  5: 8, // Friday
  6: 8, // Saturday
};

/** Memorise time per length. Buys the player ~600ms of extra study
 *  per additional digit, lifted from the spec. */
const VIEW_SECONDS_BY_LENGTH: Record<number, number> = {
  6: 4.0,
  7: 4.5,
  8: 5.0,
  9: 5.5,
};

export function generatePhoneNumberConfig(date: Date = new Date()): PhoneNumberConfig {
  const seed = dateToSeed(date);
  const rng = createSeededRng(seed);
  const length = DIGIT_COUNT_BY_DOW[utcDayOfWeek(date)] ?? 6;

  const digits: number[] = [];
  // First digit: 1-9 only. Removes the "starts with 0" foreign-phone
  // look without compromising determinism.
  digits.push(rng.intInclusive(1, 9));

  while (digits.length < length) {
    let candidate = rng.intInclusive(0, 9);
    // Reject if it would create a run of 3 identical digits in a row.
    // Two in a row is fine ("the double is a real-phone-number look")
    // but three feels like a glitch and is harder to memorise.
    if (
      digits.length >= 2 &&
      digits[digits.length - 1] === candidate &&
      digits[digits.length - 2] === candidate
    ) {
      continue;
    }
    digits.push(candidate);
  }

  return {
    digits,
    viewSeconds: VIEW_SECONDS_BY_LENGTH[length] ?? 4,
  };
}

export function buildPhoneNumberInstance(date: Date = new Date()): DailyChallengeInstance<PhoneNumberConfig> {
  return {
    mode: 'phone_number',
    challengeDate: todayUtcIso(date),
    config: generatePhoneNumberConfig(date),
    reveal: {
      // Resolved against the active i18n locale at call time so the
      // reveal animation reads the player's chosen language.
      title: getModeDisplayName('phone_number'),
      subtitle: getModeRevealSubtitle('phone_number'),
      blinkExpression: 'memorise',
    },
  };
}

/** Score a player's recall. Returns the normalised 0-100 score and
 *  the per-digit correctness array (for the reveal phase + share
 *  card emoji blocks). */
export interface PhoneNumberScored {
  score: number;
  correctness: boolean[];
  correctCount: number;
  totalCount: number;
}

export function scorePhoneNumberAttempt(
  config: PhoneNumberConfig,
  recalled: readonly number[],
): PhoneNumberScored {
  const total = config.digits.length;
  // Pad/truncate the recall array to length so missing digits count
  // as wrong rather than silently scoring high. Belt + braces; the
  // recall view auto-submits when full so this should not fire in
  // practice.
  const padded = Array.from({ length: total }, (_, i) => recalled[i] ?? -1);
  const correctness = padded.map((d, i) => d === config.digits[i]);
  const correctCount = correctness.filter(Boolean).length;
  return {
    score: Math.round((correctCount / total) * 100),
    correctness,
    correctCount,
    totalCount: total,
  };
}

/** Phone Number's emoji-block share representation. One block per
 *  digit, purple for correct, black for wrong. The shared share-card
 *  generator just splices this string into the template. */
export function phoneNumberEmojiBlocks(correctness: readonly boolean[]): string {
  return correctness.map((c) => (c ? '🟪' : '⬛')).join('');
}
