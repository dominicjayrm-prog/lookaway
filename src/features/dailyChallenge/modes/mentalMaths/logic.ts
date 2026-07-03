/**
 * Mental Tally — pure logic.
 *
 * Numbers flash on screen ONE AT A TIME (so they can't be
 * photographed as a single glance — the player must hold a running
 * total in working memory), then the player keys in the total.
 * Three rounds of rising difficulty per daily:
 *
 *   Round 1: 3 numbers, small values           — the warm-up
 *   Round 2: 4 numbers, bigger values          — the stretch
 *   Round 3: 5 numbers, one of them NEGATIVE   — the twist
 *
 * The round-3 minus number is the mode's signature: everyday maths
 * ("…and £4 off with the voucher") that forces a genuine working-
 * memory update rather than rote accumulation. Totals stay positive
 * by construction so the answer is always a natural number.
 *
 * Scoring rewards precision but pays partial credit for close
 * answers — a near-miss on a 5-number tally is real work and a
 * 0 would read as unfair:
 *
 *   exact          = full round points
 *   off by 1-2     = 60% of round points
 *   off by 3-5     = 30% of round points
 *   further        = 0
 *
 * Round points: 30 / 33 / 37 (harder rounds worth more, sums to 100).
 *
 * Generation is deterministic from the date seed XOR'd with a
 * per-mode salt so this mode's RNG sequence is decorrelated from
 * the other modes' sequences on the same date.
 */
import { createSeededRng, dateToSeed, todayUtcIso, utcDayOfWeek, type SeededRng } from '../../seededRandom';
import { getModeDisplayName, getModeRevealSubtitle } from '../../modeRotation';
import type { DailyChallengeInstance } from '../../types';

export interface MentalMathsRound {
  /** The numbers in flash order. Negative values render as "− n". */
  values: readonly number[];
  /** The correct running total (always > 0 by construction). */
  target: number;
  /** Milliseconds each number stays on screen. */
  msPerNumber: number;
}

export interface MentalMathsConfig {
  rounds: readonly [MentalMathsRound, MentalMathsRound, MentalMathsRound];
}

/** Per-round shape by day-of-week. The rotation plays Mental Tally
 *  on Mondays, but every day carries a config (same defensive
 *  pattern as Names & Faces) so a future rotation change can't
 *  strand the mode without one. Sunday, per tradition, is hardest.
 *
 *  count = numbers flashed; lo/hi = value range; negatives = how
 *  many of the values are negative (always the round-3 twist);
 *  ms = per-number display window. Pacing gets slightly tighter as
 *  counts rise — the display window is the real difficulty dial. */
interface RoundShape { count: number; lo: number; hi: number; negatives: number; ms: number }
const SHAPES_BY_DOW: Record<number, [RoundShape, RoundShape, RoundShape]> = {
  1: [ // Monday — the canonical slot
    { count: 3, lo: 2, hi: 9, negatives: 0, ms: 1500 },
    { count: 4, lo: 3, hi: 14, negatives: 0, ms: 1400 },
    { count: 5, lo: 4, hi: 16, negatives: 1, ms: 1300 },
  ],
  2: [
    { count: 3, lo: 2, hi: 9, negatives: 0, ms: 1500 },
    { count: 4, lo: 3, hi: 14, negatives: 0, ms: 1400 },
    { count: 5, lo: 4, hi: 16, negatives: 1, ms: 1300 },
  ],
  3: [
    { count: 3, lo: 2, hi: 11, negatives: 0, ms: 1450 },
    { count: 4, lo: 4, hi: 15, negatives: 0, ms: 1350 },
    { count: 5, lo: 5, hi: 17, negatives: 1, ms: 1250 },
  ],
  4: [
    { count: 3, lo: 2, hi: 11, negatives: 0, ms: 1450 },
    { count: 4, lo: 4, hi: 15, negatives: 0, ms: 1350 },
    { count: 5, lo: 5, hi: 17, negatives: 1, ms: 1250 },
  ],
  5: [
    { count: 3, lo: 3, hi: 12, negatives: 0, ms: 1400 },
    { count: 4, lo: 4, hi: 16, negatives: 1, ms: 1350 },
    { count: 5, lo: 5, hi: 18, negatives: 1, ms: 1250 },
  ],
  6: [
    { count: 3, lo: 3, hi: 12, negatives: 0, ms: 1400 },
    { count: 4, lo: 4, hi: 16, negatives: 1, ms: 1350 },
    { count: 5, lo: 5, hi: 18, negatives: 1, ms: 1250 },
  ],
  0: [ // Sunday — hardest by tradition
    { count: 4, lo: 3, hi: 13, negatives: 0, ms: 1350 },
    { count: 5, lo: 4, hi: 16, negatives: 1, ms: 1300 },
    { count: 6, lo: 5, hi: 19, negatives: 1, ms: 1200 },
  ],
};

/** Max points per round — harder rounds worth more, sums to 100. */
export const ROUND_POINTS = [30, 33, 37] as const;

function generateRound(rng: SeededRng, shape: RoundShape): MentalMathsRound {
  // Generate positives first, then flip `negatives` of the SMALLER
  // values to minus and re-check the total stays comfortably
  // positive. Retry the flip target until it does — bounded because
  // flipping the smallest value of a 4+ number sum in these ranges
  // almost always leaves a positive total.
  for (let attempt = 0; attempt < 20; attempt++) {
    const values: number[] = [];
    for (let i = 0; i < shape.count; i++) {
      let v = rng.intInclusive(shape.lo, shape.hi);
      // No immediate repeats — "7, 7" reads like a display glitch
      // when numbers flash one at a time.
      if (values.length > 0 && Math.abs(values[values.length - 1]) === v) {
        v = v === shape.hi ? shape.lo : v + 1;
      }
      values.push(v);
    }
    if (shape.negatives > 0) {
      // Flip the smallest value(s), but never the first number shown —
      // opening on a minus is disorienting rather than fun.
      const indexes = values
        .map((v, i) => ({ v, i }))
        .filter(({ i }) => i > 0)
        .sort((a, b) => a.v - b.v)
        .slice(0, shape.negatives)
        .map(({ i }) => i);
      for (const i of indexes) values[i] = -values[i];
    }
    const target = values.reduce((sum, v) => sum + v, 0);
    if (target > 0) {
      return { values, target, msPerNumber: shape.ms };
    }
  }
  // Statistically unreachable fallback: all-positive round.
  const values = Array.from({ length: shape.count }, () => rng.intInclusive(shape.lo, shape.hi));
  return { values, target: values.reduce((s, v) => s + v, 0), msPerNumber: shape.ms };
}

export function generateMentalMathsConfig(date: Date = new Date()): MentalMathsConfig {
  // Per-mode salt decorrelates this mode's daily sequence from the
  // other modes generated off the same date seed.
  const rng = createSeededRng(dateToSeed(date) ^ 0x7a11_c0de);
  const shapes = SHAPES_BY_DOW[utcDayOfWeek(date)] ?? SHAPES_BY_DOW[1];
  return {
    rounds: [
      generateRound(rng, shapes[0]),
      generateRound(rng, shapes[1]),
      generateRound(rng, shapes[2]),
    ],
  };
}

export function buildMentalMathsInstance(date: Date = new Date()): DailyChallengeInstance<MentalMathsConfig> {
  return {
    mode: 'mental_maths',
    challengeDate: todayUtcIso(date),
    config: generateMentalMathsConfig(date),
    reveal: {
      title: getModeDisplayName('mental_maths'),
      subtitle: getModeRevealSubtitle('mental_maths'),
      blinkExpression: 'lightning_mind',
    },
  };
}

// ── Scoring ──────────────────────────────────────────────────────────

export type RoundTier = 'exact' | 'close' | 'near' | 'miss';

export interface RoundOutcome {
  target: number;
  entered: number;
  tier: RoundTier;
  points: number;
}

export function scoreRound(target: number, entered: number, roundIndex: 0 | 1 | 2): RoundOutcome {
  const max = ROUND_POINTS[roundIndex];
  const diff = Math.abs(target - entered);
  let tier: RoundTier;
  let points: number;
  if (diff === 0) { tier = 'exact'; points = max; }
  else if (diff <= 2) { tier = 'close'; points = Math.round(max * 0.6); }
  else if (diff <= 5) { tier = 'near'; points = Math.round(max * 0.3); }
  else { tier = 'miss'; points = 0; }
  return { target, entered, tier, points };
}

export function totalScore(outcomes: readonly RoundOutcome[]): number {
  return Math.min(100, outcomes.reduce((s, o) => s + o.points, 0));
}

/** Share-card emoji: one block per round. Green exact, yellow close,
 *  orange near, black miss — mirrors the tier ladder so the share
 *  reads at a glance without spoiling the day's numbers. */
export function mentalMathsEmojiBlocks(outcomes: readonly RoundOutcome[]): string {
  return outcomes
    .map((o) => (o.tier === 'exact' ? '🟩' : o.tier === 'close' ? '🟨' : o.tier === 'near' ? '🟧' : '⬛'))
    .join('');
}
