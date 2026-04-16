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

/** Per-question response timer in classic mode. 2x the solo
 *  timeLimit because in 1v1 the combination of "what was in the
 *  scene?" recall + "my opponent's clock is also ticking" still
 *  felt tight at 1.5x — playtesters found it unplayable under
 *  competitive pressure. Doubling keeps the urgency (the clock is
 *  still visible and can still run out) without the panic. */
export const CHALLENGE_QUESTION_TIME_MULT = 2.0;
