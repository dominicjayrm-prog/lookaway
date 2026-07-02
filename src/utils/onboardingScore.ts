/**
 * Local scoring + brain-type derivation for the 3-round onboarding
 * warm-up. The numbers are tuned to feel meaningful and WARM — a
 * celebratory first impression, not a clinical assessment and not a
 * funnel toward an upsell. Keep all logic here so the results screen
 * stays a thin renderer.
 *
 * NOT to be confused with `computeMemoryScore` in `memoryAnalytics.ts`,
 * which derives the running Memory Score from real play history.
 * These two scores live in different worlds: this one runs on three
 * pre-auth rounds; the other runs after the user has played real
 * levels and has data to draw from.
 */

export interface RoundResult {
  /** Did the user pick the correct option for this round's question? */
  correct: boolean;
  /** Time from question shown to answer tapped, in milliseconds. */
  reactionMs: number;
}

export interface OnboardingScoreOutput {
  /** 0-100 memory score for the headline number on the results screen. */
  score: number;
  /** Generous percentile when applicable. Null when the score is so
   *  low that "Top X%" copy would feel dishonest, in which case the
   *  results screen falls back to "Your starting point" framing. */
  percentileTopPct: number | null;
  /** Headline brain-type archetype derived from which rounds the user
   *  nailed. Drives copy on the results + blurred-profile screens. */
  brainType: BrainType;
}

export interface BrainType {
  id:
    | 'quick_recall'
    | 'pattern_spotter'
    | 'detail_hunter'
    | 'deep_memory'
    | 'balanced_mind'
    | 'untapped_potential';
  /** Localisation key for the displayed name (without the i18n.t() call). */
  nameKey: string;
  /** Localisation key for the one-line tagline shown under the name. */
  taglineKey: string;
}

const BRAIN_TYPES: Record<BrainType['id'], BrainType> = {
  quick_recall: {
    id: 'quick_recall',
    nameKey: 'onboarding.test.brain_type.quick_recall.name',
    taglineKey: 'onboarding.test.brain_type.quick_recall.tagline',
  },
  pattern_spotter: {
    id: 'pattern_spotter',
    nameKey: 'onboarding.test.brain_type.pattern_spotter.name',
    taglineKey: 'onboarding.test.brain_type.pattern_spotter.tagline',
  },
  detail_hunter: {
    id: 'detail_hunter',
    nameKey: 'onboarding.test.brain_type.detail_hunter.name',
    taglineKey: 'onboarding.test.brain_type.detail_hunter.tagline',
  },
  deep_memory: {
    id: 'deep_memory',
    nameKey: 'onboarding.test.brain_type.deep_memory.name',
    taglineKey: 'onboarding.test.brain_type.deep_memory.tagline',
  },
  balanced_mind: {
    id: 'balanced_mind',
    nameKey: 'onboarding.test.brain_type.balanced_mind.name',
    taglineKey: 'onboarding.test.brain_type.balanced_mind.tagline',
  },
  // Honest but not crushing: when correctCount === 0 we shouldn't
  // tell them they're "balanced" with "no glaring weakness". This
  // archetype acknowledges they got every round wrong while framing
  // it as "lots to gain by training" rather than "you're terrible".
  untapped_potential: {
    id: 'untapped_potential',
    nameKey: 'onboarding.test.brain_type.untapped_potential.name',
    taglineKey: 'onboarding.test.brain_type.untapped_potential.tagline',
  },
};

/** Compute the headline 0–100 memory score from 3 round results.
 *  Base: 30 per correct round (max 90). Speed bonus: up to +10 spread
 *  across rounds based on reaction time (faster = more bonus). Always
 *  caps at 100 and floors at 0. */
export function computeOnboardingScore(rounds: RoundResult[]): number {
  if (rounds.length === 0) return 0;
  let score = 0;
  for (const r of rounds) {
    if (!r.correct) continue;
    score += 30;
    // Reaction-time bonus: under 2.5s = +3, under 4s = +2, under 6s = +1.
    // Caps speed bonus at +9 across 3 rounds + 1 floor bonus = 100 max.
    const ms = Math.max(0, r.reactionMs);
    if (ms < 2500) score += 3;
    else if (ms < 4000) score += 2;
    else if (ms < 6000) score += 1;
  }
  // Floor +1 so even all-wrong scores show a non-zero (avoid the "0 / 100"
  // gut-punch that kills conversion before the user reaches the paywall).
  if (score === 0) score = 12;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Generous percentile lookup. Skews favourable on real scores so the
 *  copy reads like a flattering finish, while ultra-low scores fall
 *  through to a value the results screen renders as "starting point"
 *  copy instead of a misleading "Top X% of players" pill (see
 *  `percentileTopPct === null` branch on the results screen). */
export function getPercentileTop(score: number): number | null {
  if (score >= 90) return 5;
  if (score >= 80) return 12;
  if (score >= 70) return 22;
  if (score >= 55) return 35;
  if (score >= 40) return 48;
  if (score >= 25) return 60;
  // Below 25 the user got effectively nothing right. Returning null
  // tells the results screen to show "Your starting point" pill copy
  // rather than a flattering top-percentile claim.
  return null;
}

/** Map round-by-round performance to a flattering brain-type archetype.
 *  Logic prioritises speed over correctness for "Quick Recall", weighs
 *  later-round success for "Deep Memory", and falls through to
 *  "Balanced Mind" when nothing else stands out. */
export function deriveBrainType(rounds: RoundResult[]): BrainType {
  if (rounds.length < 3) return BRAIN_TYPES.untapped_potential;
  const [r1, r2, r3] = rounds;
  const correctCount = rounds.filter((r) => r.correct).length;
  const avgReaction = rounds.reduce((s, r) => s + r.reactionMs, 0) / rounds.length;

  // Got everything wrong: don't pretend they're "balanced". Honest
  // archetype that frames the score as room to grow. Caught FIRST so
  // it can never fall through to balanced_mind.
  if (correctCount === 0) return BRAIN_TYPES.untapped_potential;
  // Got the hardest one (round 3): Deep Memory beats everything else.
  if (r3.correct) return BRAIN_TYPES.deep_memory;
  // Both first two correct, fast reactions: Quick Recall.
  if (r1.correct && r2.correct && avgReaction < 4000) return BRAIN_TYPES.quick_recall;
  // Got the position-based round (r2) but nothing else specific: Pattern Spotter.
  if (r2.correct && !r1.correct) return BRAIN_TYPES.pattern_spotter;
  // Got round 1 (colour detail) but missed position: Detail Hunter.
  if (r1.correct && !r2.correct) return BRAIN_TYPES.detail_hunter;
  // Mid-tier (1 of 3 correct, fell into none of the above): treat as
  // balanced rather than untapped.
  return BRAIN_TYPES.balanced_mind;
}

export function buildOnboardingScoreOutput(rounds: RoundResult[]): OnboardingScoreOutput {
  const score = computeOnboardingScore(rounds);
  return {
    score,
    percentileTopPct: getPercentileTop(score),
    brainType: deriveBrainType(rounds),
  };
}
