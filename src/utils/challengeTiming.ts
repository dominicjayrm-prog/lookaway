/**
 * Challenge-mode timer multipliers.
 *
 * Solo gameplay uses the raw timing values baked into each level /
 * mode, tuned for a relaxed self-paced experience. 1v1 changes the
 * psychology entirely — both players are watching the same clock
 * under competitive pressure, so the same values that felt fine
 * solo felt "unbearable" in challenge.
 *
 * These multipliers add a buffer without removing the clock
 * (which is what gives 1v1 its edge). Applied in:
 *
 *  - `app/game/challenge.tsx` (Classic)
 *  - `app/game/challenge-mode.tsx` passes the multiplier to each
 *    exclusive mode component (Speed Recall, Snap Match, Counting
 *    Blitz, Colour Chain). Sequence is turn-based with no viewing
 *    timer, so it's exempt.
 *
 * Solo screens (`side-campaign.tsx`, campaign levels) pass no
 * multiplier and the mode components default to `1.0`.
 */

/** Scene / shape / board viewing phase. Applied to ANY "look at
 *  this and memorise it" countdown in challenge mode. */
export const CHALLENGE_VIEW_TIME_MULT = 1.3;

/** Per-question response timer in classic mode. 3x the solo
 *  timeLimit. 2x still felt tight to playtesters — the user
 *  explicitly asked for more breathing room with the reasoning
 *  that "worst case they complete the questions before the timer
 *  ends, it aint a bad thing". Generous timing turns the clock
 *  from a stressor into a safety net: fast players barely notice
 *  it, slow players don't panic. 1v1 tension now comes from
 *  accuracy + opponent completion time, not wall-clock pressure. */
export const CHALLENGE_QUESTION_TIME_MULT = 3.0;
