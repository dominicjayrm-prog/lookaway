import type { Level } from '@/src/types/game';

/** Score threshold for 2 stars (percentage) */
export const TWO_STAR_THRESHOLD = 80;

/** Gem rewards by star count */
export const GEM_REWARDS: Record<0 | 1 | 2 | 3, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
};

export function getStarsForScore(
  score: number,
  level: Level,
): 0 | 1 | 2 | 3 {
  if (score >= level.parScore) return 3;
  if (score >= TWO_STAR_THRESHOLD) return 2;
  if (score >= level.requiredScore) return 1;
  return 0;
}

/** Calculate gem reward for first-time completion */
export function calculateGemReward(score: number, totalQuestions: number): number {
  const percentage = Math.round((score / totalQuestions) * 100);
  if (percentage === 100) return 3;
  if (percentage >= 80) return 2;
  if (percentage >= 60) return 1;
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
  gemRefillCost: 80,
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
