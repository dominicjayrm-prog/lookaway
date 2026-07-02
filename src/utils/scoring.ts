import type { Level } from '@/src/types/game';

/** Score threshold for 2 stars (percentage) */
export const TWO_STAR_THRESHOLD = 80;

/** Gem rewards by star count.
 *
 *  Restored to the design spec ("5-20 gems per level clear",
 *  CLAUDE.md). The economy originally shipped at 1/2/3 — 1/6th of
 *  spec — which made every sink unaffordable: a new player's 50
 *  starting gems couldn't buy a single 80-gem life refill, and ~40
 *  clears were needed to close the gap. Free players learned that
 *  gems buy nothing, which killed the reward loop and made the
 *  paywall feel like the only door out. */
export const GEM_REWARDS: Record<0 | 1 | 2 | 3, number> = {
  0: 0,
  1: 5,
  2: 10,
  3: 15,
};

/** Consolation gems for a failed level. Failing used to pay zero AND
 *  cost a life — a double punishment aimed at exactly the struggling
 *  casual player the game needs to keep. A small effort reward keeps
 *  the loop warm without making failure farmable (2 vs 5+ for a pass). */
export const FAIL_EFFORT_GEMS = 2;

/** Completed-level count below which failing costs no life. Beginner
 *  protection: the first sessions are for learning the mechanic, not
 *  for burning through 5 hearts and hitting the out-of-lives wall in
 *  minutes (production data: strugglers walled inside session 1). */
export const BEGINNER_PROTECTED_CLEARS = 3;

/** Blanked+ subscribers earn 2× gems on every level completion (any
 *  game mode). Applied at every level-completion gem-award site so the
 *  multiplier is consistent. The `doubled` flag is surfaced to result
 *  screens so they can render a "2×" badge next to the reward. */
export const PLUS_GEM_MULTIPLIER = 2;

export function applyPlusGemMultiplier(
  baseGems: number,
  isSubscribed: boolean,
): { gems: number; doubled: boolean } {
  if (!isSubscribed || baseGems <= 0) return { gems: baseGems, doubled: false };
  return { gems: baseGems * PLUS_GEM_MULTIPLIER, doubled: true };
}

export function getStarsForScore(
  score: number,
  level: Level,
): 0 | 1 | 2 | 3 {
  if (score >= level.parScore) return 3;
  if (score >= TWO_STAR_THRESHOLD) return 2;
  if (score >= level.requiredScore) return 1;
  return 0;
}

/** Calculate gem reward for first-time completion. Mirrors
 *  GEM_REWARDS by star tier — keep the two in sync. */
export function calculateGemReward(score: number, totalQuestions: number): number {
  const percentage = Math.round((score / totalQuestions) * 100);
  if (percentage === 100) return GEM_REWARDS[3];
  if (percentage >= 80) return GEM_REWARDS[2];
  if (percentage >= 60) return GEM_REWARDS[1];
  return 0;
}

/** Calculate gem reward for replay — only earn if beating previous stars */
export function calculateReplayReward(previousStars: number, newStars: number): number {
  if (newStars > previousStars) {
    const previousReward = GEM_REWARDS[previousStars as 0 | 1 | 2 | 3] ?? 0;
    const newReward = GEM_REWARDS[newStars as 0 | 1 | 2 | 3] ?? 0;
    return newReward - previousReward;
  }
  return 0;
}

/** Daily challenge gem rewards */
export const DAILY_BASE_GEMS = 5;
export const DAILY_80_BONUS = 5;
export const DAILY_100_BONUS = 5;

export function calculateDailyReward(scorePercent: number): number {
  let gems = DAILY_BASE_GEMS;
  if (scorePercent >= 80) gems += DAILY_80_BONUS;
  if (scorePercent === 100) gems += DAILY_100_BONUS;
  return gems;
}

/** Streak milestones (one-time bonuses) */
export const STREAK_MILESTONES = [
  { days: 3, gems: 5 },
  { days: 7, gems: 15 },
  { days: 14, gems: 30 },
  { days: 30, gems: 50 },
  { days: 60, gems: 100 },
  { days: 100, gems: 200 },
];

export function checkStreakMilestone(currentStreak: number, claimed: number[]): { gems: number; milestone: number | null } {
  for (const m of STREAK_MILESTONES) {
    if (currentStreak >= m.days && !claimed.includes(m.days)) {
      return { gems: m.gems, milestone: m.days };
    }
  }
  return { gems: 0, milestone: null };
}

/** Economy constants */
export const INITIAL_GEMS = 50;
export const LIVES_CONFIG = {
  maxLives: 5,
  regenTimeMinutes: 30,
  // 80 → 40: a refill is now reachable from the 50-gem starting
  // balance and from ~1 session of decent play (5-15 gems/level).
  // The old price was unaffordable for exactly the players who
  // needed it (see docs/RESCUE_PLAN.md, economy math).
  gemRefillCost: 40,
};

/** Power-up costs */
export const POWER_UP_COSTS = {
  slowTime: 30,
  peek: 40,
  fiftyFifty: 25,
  skip: 50,
} as const;

export type PowerUpId = keyof typeof POWER_UP_COSTS;

/** Power-up bundle discount (10% off when buying 3) */
export function bundlePrice(singleCost: number, qty: number): number {
  if (qty >= 3) return Math.floor(singleCost * qty * 0.9);
  return singleCost * qty;
}
