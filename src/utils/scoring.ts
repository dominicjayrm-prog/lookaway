import type { Level } from '@/src/types/game';

/** Score threshold for 2 stars (percentage) */
export const TWO_STAR_THRESHOLD = 80;

/** Gem rewards by star count */
export const GEM_REWARDS: Record<0 | 1 | 2 | 3, number> = {
  0: 0,
  1: 5,
  2: 10,
  3: 20,
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
