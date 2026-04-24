/**
 * Pure auto-matcher for friend challenges.
 *
 * The unified-journey position is 1-380 — a single number that
 * describes how far a player has come across all modes and all
 * worlds. For a Classic challenge we average both players' positions
 * and bucket into one of the three legacy Easy/Medium/Hard tiers so
 * the existing level-picker / world-spread logic still works.
 *
 * Kept in its own file (no Supabase imports) so unit tests don't have
 * to mock the database just to assert tranche boundaries.
 */

export type ChallengeAutoTier = 'easy' | 'medium' | 'hard';

/** Tranche boundaries. Chosen so positions 1-127 → easy (Classic W1-2),
 *  128-254 → medium (Classic W3-4), 255-380 → hard (Classic W5-6). */
export function bucketUnifiedToDifficulty(avgPosition: number): ChallengeAutoTier {
  if (avgPosition < 128) return 'easy';
  if (avgPosition < 255) return 'medium';
  return 'hard';
}

/** Average of two unified positions, floored. Missing or out-of-range
 *  values fall back to 1 so a brand-new player paired against a
 *  veteran still produces a safe average rather than crashing on NaN. */
export function averageUnifiedPosition(a: number | null | undefined, b: number | null | undefined): number {
  const safeA = typeof a === 'number' && a >= 1 && a <= 380 ? a : 1;
  const safeB = typeof b === 'number' && b >= 1 && b <= 380 ? b : 1;
  return Math.floor((safeA + safeB) / 2);
}
