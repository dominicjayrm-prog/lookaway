/**
 * Pure auto-matcher for friend challenges.
 *
 * The unified-journey position is 1-400 — a single number that
 * describes how far a player has come across all modes and all
 * worlds (including the Endgame 20). For a Classic challenge we
 * average both players' positions and bucket into one of the three
 * legacy Easy/Medium/Hard tiers so the existing level-picker /
 * world-spread logic still works.
 *
 * Kept in its own file (no Supabase imports) so unit tests don't have
 * to mock the database just to assert tranche boundaries.
 */

import { TOTAL_POSITIONS } from '@/src/data/unifiedJourney';

export type ChallengeAutoTier = 'easy' | 'medium' | 'hard';

/** Tranche boundaries. Chosen so positions 1-127 → easy (Classic W1-2),
 *  128-254 → medium (Classic W3-4), 255-400 → hard (Classic W5-6 +
 *  Endgame 20). The endgame tier doesn't get its own bucket — a
 *  Grand Master player gets matched against a hard-tier challenge,
 *  same as a player at position 380. The auto-match is for *friend
 *  challenges* (non-elite), not the endgame trial itself. */
export function bucketUnifiedToDifficulty(avgPosition: number): ChallengeAutoTier {
  if (avgPosition < 128) return 'easy';
  if (avgPosition < 255) return 'medium';
  return 'hard';
}

/** Average of two unified positions, floored. Missing or out-of-range
 *  values fall back to 1 so a brand-new player paired against a
 *  veteran still produces a safe average rather than crashing on NaN. */
export function averageUnifiedPosition(a: number | null | undefined, b: number | null | undefined): number {
  const safeA = typeof a === 'number' && a >= 1 && a <= TOTAL_POSITIONS ? a : 1;
  const safeB = typeof b === 'number' && b >= 1 && b <= TOTAL_POSITIONS ? b : 1;
  return Math.floor((safeA + safeB) / 2);
}
