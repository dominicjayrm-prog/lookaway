/**
 * Streak milestones — gems and streak shields awarded for hitting
 * specific streak day counts.
 *
 * Source of truth for both the seed function and the claim logic.
 * The same 11 entries live as rows in `public.streak_rewards` per user.
 *
 * Higher streaks earn more shields (more valuable protection the further
 * you've climbed). No cosmetics or power-ups here — keep the rewards
 * tangible and aligned with the gem economy.
 */
export interface StreakMilestone {
  /** Streak day count required to claim this reward. */
  day: number;
  /** Legacy alias for `day` — many existing call sites reference `days`. */
  days: number;
  gems: number;
  shields: number;
  /** Display label, derived from day number. */
  title: string;
  /** Accent color used by the celebration modal. */
  color: string;
}

function buildMilestone(day: number, gems: number, shields: number, title: string, color: string): StreakMilestone {
  return { day, days: day, gems, shields, title, color };
}

export const STREAK_MILESTONES: readonly StreakMilestone[] = [
  buildMilestone(3,   3,   0, '3-Day Spark',         '#FF9500'),
  buildMilestone(7,   5,   1, 'One Week Strong',     '#FF6B6B'),
  buildMilestone(14,  10,  0, 'Two Week Warrior',    '#0984E3'),
  buildMilestone(21,  10,  1, 'Three Week Habit',    '#A29BFE'),
  buildMilestone(30,  15,  2, 'Monthly Master',      '#D4A012'),
  buildMilestone(50,  25,  1, 'Half Century',        '#00B894'),
  buildMilestone(75,  30,  2, 'Diamond Mind',        '#74B9FF'),
  buildMilestone(100, 40,  3, 'Triple Digit',        '#6C5CE7'),
  buildMilestone(150, 50,  3, 'Memory Machine',      '#FD79A8'),
  buildMilestone(200, 60,  5, 'Two Hundred Club',    '#00CEC9'),
  buildMilestone(365, 100, 5, 'A Full Year',         '#D4A012'),
];

/** Find the first unclaimed milestone — the next reward the player can
 *  work toward. Returns null when every milestone has been claimed. */
export function getNextMilestone(currentStreak: number, claimedDays: readonly number[] = []): StreakMilestone | null {
  const claimed = new Set(claimedDays);
  for (const m of STREAK_MILESTONES) {
    if (!claimed.has(m.day)) return m;
  }
  return null;
}

/** Backward-compatible: returns the FIRST milestone the player has reached
 *  but not yet claimed. Used by the legacy single-celebration path. */
export function checkStreakMilestone(streak: number, claimed: number[]): StreakMilestone | null {
  const claimedSet = new Set(claimed);
  for (const m of STREAK_MILESTONES) {
    if (streak >= m.day && !claimedSet.has(m.day)) return m;
  }
  return null;
}

/** All milestones the streak qualifies for that haven't been claimed.
 *  Used by `claimDueStreakRewards()` to know how many toasts to queue. */
export function getUnclaimedReached(streak: number, claimed: readonly number[]): StreakMilestone[] {
  const claimedSet = new Set(claimed);
  return STREAK_MILESTONES.filter((m) => streak >= m.day && !claimedSet.has(m.day));
}
