/**
 * Streak recovery — detects missed days on app open, prices recovery,
 * and handles the 3 outcomes: shield auto-use (1-day), gem recovery,
 * or permanent reset.
 *
 * Recovery window: when the player is detected as having missed 2+ days,
 * a 1-hour timer starts. During this window the recovery modal is
 * available. After 1 hour the streak resets permanently.
 *
 * All mutations go through Supabase so the window and gem balance stay
 * in sync across devices. The game store is updated locally in lockstep
 * via the caller so the UI reflects changes immediately.
 */
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';
import { logEconomyEvent, ECONOMY_EVENTS } from '@/src/utils/economyLogger';

/** 1-hour recovery window, in ms. After this elapses the streak resets. */
export const RECOVERY_WINDOW_MS = 60 * 60 * 1000;
/** Below this threshold, tiny streaks aren't worth protecting. */
const MIN_PROTECTABLE_STREAK = 3;
/** Above this gap, the streak is gone forever regardless of gems owned. */
export const MAX_RECOVERABLE_DAYS_MISSED = 14;

/** Count whole days between two UTC calendar dates.
 *  `lastPlayDate` is stored as `new Date().toISOString().split('T')[0]`,
 *  which is UTC. Comparing against local-midnight `now` would break for
 *  players who travel timezones, so this routine works entirely in UTC.
 *  Returns 0 if the same day; positive if `now` is later; never negative. */
export function getDaysMissed(lastPlayDate: string | null, now: Date = new Date()): number {
  if (!lastPlayDate) return 0;
  // Parse lastPlayDate as UTC midnight
  const last = new Date(`${lastPlayDate}T00:00:00Z`);
  // Today in UTC midnight
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diffMs = todayUtc.getTime() - last.getTime();
  if (diffMs <= 0) return 0;
  // Played yesterday → diff = 1 day, missed = 0. Played 2 days ago → missed = 1.
  return Math.max(0, Math.floor(diffMs / 86400000) - 1);
}

/** Price book — exact copy of the spec's getRecoveryPrice. Returns -1 for
 *  unrecoverable gaps (15+ days). */
export function getRecoveryPrice(streak: number, daysMissed: number): number {
  if (daysMissed <= 0) return 0;
  if (daysMissed === 1) return 10;
  if (daysMissed === 2) return 25;
  if (daysMissed === 3) return 40;
  if (daysMissed <= 7) return Math.round(streak * 0.3 + daysMissed * 10);
  if (daysMissed <= MAX_RECOVERABLE_DAYS_MISSED) return Math.round(streak * 0.5 + daysMissed * 15);
  return -1;
}

/** Shield+gem pricing for 2-3 day misses when the player has a shield. */
export function getShieldComboPrice(daysMissed: number): number {
  if (daysMissed === 1) return 0;   // Shield alone handles this (auto-use path)
  if (daysMissed === 2) return 15;
  if (daysMissed === 3) return 25;
  return -1; // Shields don't help for 4+ days
}

/** Set the recovery window start on the profile. Called once per missed-day
 *  situation (subsequent app opens read the existing value and measure
 *  elapsed time). Returns true on success so the caller can decide whether
 *  to mirror to local state — keeping cloud + local in lockstep. */
export async function startRecoveryWindow(userId: string, startAt: Date = new Date()): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ recovery_window_start: startAt.toISOString() })
      .eq('id', userId);
    if (error) throw error;
    return true;
  } catch (e) {
    log.warn('streak', 'startRecoveryWindow failed', { error: String(e), userId });
    return false;
  }
}

/** Clear the window (on successful recovery or permanent reset). */
export async function clearRecoveryWindow(userId: string): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ recovery_window_start: null })
      .eq('id', userId);
  } catch (e) {
    log.warn('streak', 'clearRecoveryWindow failed', { error: String(e), userId });
  }
}

/** Decide what should happen when the app opens, given the state read
 *  from the store + Supabase. The caller applies the outcome (show a
 *  modal, fire a toast, or nothing). */
export type AppOpenStreakOutcome =
  | { kind: 'ok' }                                 // Played recently, nothing to do
  | { kind: 'shield_auto_used'; daysMissed: 1 }    // 1 day + had a shield — silent save
  | { kind: 'modal'; daysMissed: number; streak: number; recoverable: boolean; recoveryStart: Date; windowElapsedMs: number }
  | { kind: 'reset'; streak: number };             // Window expired, streak gone

export interface AppOpenCheckState {
  userId: string;
  lastPlayDate: string | null;
  streakCount: number;
  streakShields: number;
  /** ISO timestamp or null. Reads from profiles.recovery_window_start. */
  recoveryWindowStart: string | null;
  now?: Date;
}

export function computeAppOpenOutcome(state: AppOpenCheckState): AppOpenStreakOutcome {
  const now = state.now ?? new Date();
  if (state.streakCount < MIN_PROTECTABLE_STREAK) return { kind: 'ok' };

  const daysMissed = getDaysMissed(state.lastPlayDate, now);
  if (daysMissed <= 0) return { kind: 'ok' };

  // 1-day miss + has a shield → silent auto-save before any modal shows
  if (daysMissed === 1 && state.streakShields > 0) {
    return { kind: 'shield_auto_used', daysMissed: 1 };
  }

  // 2+ days or no shield — recovery window path
  if (state.recoveryWindowStart) {
    const elapsed = now.getTime() - new Date(state.recoveryWindowStart).getTime();
    if (elapsed >= RECOVERY_WINDOW_MS) {
      return { kind: 'reset', streak: state.streakCount };
    }
    return {
      kind: 'modal',
      daysMissed,
      streak: state.streakCount,
      recoverable: daysMissed <= MAX_RECOVERABLE_DAYS_MISSED,
      recoveryStart: new Date(state.recoveryWindowStart),
      windowElapsedMs: elapsed,
    };
  }

  // First detection — start the window now
  return {
    kind: 'modal',
    daysMissed,
    streak: state.streakCount,
    recoverable: daysMissed <= MAX_RECOVERABLE_DAYS_MISSED,
    recoveryStart: now,
    windowElapsedMs: 0,
  };
}

/** Spend gems to restore the streak. Returns true on success.
 *  Caller is responsible for updating local store (gems + streak + lastPlayDate). */
export async function recoverWithGems(
  userId: string,
  cost: number,
  currentStreak: number,
): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];
    // Atomic-ish: read profile, verify gems, update in one RPC-style sequence
    const { data: profile } = await supabase
      .from('profiles')
      .select('gems')
      .eq('id', userId)
      .single();
    if (!profile || (profile.gems ?? 0) < cost) return false;

    await supabase.from('profiles').update({
      gems: (profile.gems ?? 0) - cost,
      recovery_window_start: null,
      streak_last_date: today,
      // streak_count stays at currentStreak — we're preserving it
    }).eq('id', userId);

    logEconomyEvent(userId, ECONOMY_EVENTS.GEM_SPEND_LIVES, -cost, {
      reason: 'streak_recovery',
      streak: currentStreak,
    });
    return true;
  } catch (e) {
    log.error('streak', 'recoverWithGems failed', e, { userId, cost });
    return false;
  }
}

/** Consume a shield to restore the streak. For 1-day auto-saves AND
 *  shield+gem combos on 2-3 day misses (pass gemCost > 0 for those). */
export async function recoverWithShield(
  userId: string,
  gemCost: number = 0,
): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: profile } = await supabase
      .from('profiles')
      .select('gems, streak_shields')
      .eq('id', userId)
      .single();
    const currentShields = profile?.streak_shields ?? 0;
    const currentGems = profile?.gems ?? 0;
    if (currentShields < 1) return false;
    if (gemCost > 0 && currentGems < gemCost) return false;

    await supabase.from('profiles').update({
      streak_shields: currentShields - 1,
      gems: currentGems - gemCost,
      recovery_window_start: null,
      streak_last_date: today,
    }).eq('id', userId);

    if (gemCost > 0) {
      logEconomyEvent(userId, ECONOMY_EVENTS.GEM_SPEND_LIVES, -gemCost, {
        reason: 'streak_recovery_shield_combo',
      });
    }
    return true;
  } catch (e) {
    log.error('streak', 'recoverWithShield failed', e, { userId, gemCost });
    return false;
  }
}

/** Let the streak reset to zero (explicit dismissal). Clears window too. */
export async function letStreakReset(userId: string): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ streak_count: 0, recovery_window_start: null, streak_last_date: null })
      .eq('id', userId);
  } catch (e) {
    log.warn('streak', 'letStreakReset failed', { error: String(e), userId });
  }
}
