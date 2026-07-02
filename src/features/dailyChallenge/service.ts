/**
 * Supabase read/write for daily challenge results.
 *
 * Single-attempt-per-day is enforced at the DB level via the
 * UNIQUE(user_id, challenge_date) constraint, so even if a client
 * raced two submissions only the first lands.
 *
 * On a successful submission the gameStore's main streak is bumped
 * via incrementStreak — per the user's direction the daily challenge
 * is just another way to play, so completing it counts the same as
 * completing a campaign level for streak purposes (no separate
 * daily-challenge streak counter).
 */
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';
import { useGameStore } from '@/src/store';
import { calculateDailyReward } from '@/src/utils/scoring';
import { logEconomyEvent, ECONOMY_EVENTS } from '@/src/utils/economyLogger';
import type { DailyChallengeModeId, DailyChallengeResult } from './types';
import { todayUtcIso } from './seededRandom';
import {
  cancelTodaysDailyChallengeNotifications,
  scheduleDailyChallengeNotifications,
} from './notifications';
import { loadNotificationPreferences } from '@/src/utils/notifications';

export interface SubmitArgs {
  mode: DailyChallengeModeId;
  score: number;
  timeSeconds: number;
  shareCardEmojiBlocks: string;
  challengeDate?: string;
}

export type SubmitOutcome =
  | { ok: true; result: DailyChallengeResult; alreadyPlayed: false }
  | { ok: true; result: DailyChallengeResult; alreadyPlayed: true }
  | { ok: false; reason: 'no_session' | 'network' | 'unknown' };

export async function submitDailyChallenge(args: SubmitArgs): Promise<SubmitOutcome> {
  const challengeDate = args.challengeDate ?? todayUtcIso();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, reason: 'no_session' };

  // Optimistic shape returned even if the insert fails for the
  // duplicate-key reason (player already played today). Lets the
  // result screen render with their existing data after the read.
  const localResult: DailyChallengeResult = {
    mode: args.mode,
    score: args.score,
    timeSeconds: args.timeSeconds,
    shareCardEmojiBlocks: args.shareCardEmojiBlocks,
    challengeDate,
  };

  try {
    const { error } = await supabase.from('daily_challenge_results').insert({
      user_id: userId,
      challenge_date: challengeDate,
      mode: args.mode,
      score: args.score,
      time_seconds: args.timeSeconds,
    });

    if (error) {
      // Postgres 23505 = unique_violation. Player already submitted
      // today; fetch the existing row + return it so the UI can show
      // their original score rather than blowing up.
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        // Already played today — stamp the local cache so the home
        // card stays in done-state even if a later read fails.
        try {
          useGameStore.getState().setLastDailyPlayedDate(challengeDate);
        } catch {}
        const existing = await fetchResultForDate(userId, challengeDate);
        if (existing) {
          return { ok: true, result: existing, alreadyPlayed: true };
        }
        return { ok: true, result: localResult, alreadyPlayed: true };
      }
      log.error('dailyChallenge', 'submit failed', error, { mode: args.mode });
      return { ok: false, reason: 'unknown' };
    }

    // Bump the main streak. Daily challenge counts as "played
    // today" for the same reason a campaign level does.
    try {
      useGameStore.getState().incrementStreak();
    } catch (e) {
      log.warn('dailyChallenge', 'incrementStreak failed', { error: String(e) });
    }
    // Pay the daily reward (5 base, +5 at 80%, +5 at 100% — see
    // calculateDailyReward). The daily previously granted nothing
    // visible, which left "why come back tomorrow?" unanswered for
    // new players. Single-attempt-per-day is DB-enforced (unique
    // constraint above), so this can't be farmed — the 23505 branch
    // never reaches here.
    try {
      const gems = calculateDailyReward(args.score);
      if (gems > 0) {
        useGameStore.getState().addGems(gems);
        logEconomyEvent(userId, ECONOMY_EVENTS.GEM_EARN_DAILY, gems, {
          mode: args.mode,
          scorePercent: args.score,
        });
      }
    } catch (e) {
      log.warn('dailyChallenge', 'daily gem award failed', { error: String(e) });
    }
    // Stamp the local "daily played today" cache so the home card
    // can keep the done-state visible even when a follow-up Supabase
    // round-trip briefly returns no row (transient session refresh
    // or RLS read race after a tab swap).
    try {
      useGameStore.getState().setLastDailyPlayedDate(challengeDate);
    } catch (e) {
      log.warn('dailyChallenge', 'setLastDailyPlayedDate failed', { error: String(e) });
    }

    // Cancel today's pending notifications so the player doesn't
    // get nagged for something they've already done. Reschedule
    // the next 7 days using the freshly-bumped streak so tomorrow's
    // evening copy reflects the right number.
    cancelTodaysDailyChallengeNotifications().catch(() => {});
    refreshDailyChallengeSchedule(userId).catch(() => {});

    return { ok: true, result: localResult, alreadyPlayed: false };
  } catch (e) {
    log.error('dailyChallenge', 'submit threw', e, { mode: args.mode });
    return { ok: false, reason: 'network' };
  }
}

export async function fetchResultForDate(
  userId: string,
  date: string,
): Promise<DailyChallengeResult | null> {
  try {
    const { data, error } = await supabase
      .from('daily_challenge_results')
      .select('mode, score, time_seconds, challenge_date')
      .eq('user_id', userId)
      .eq('challenge_date', date)
      .maybeSingle();
    if (error || !data) return null;
    return {
      mode: data.mode as DailyChallengeModeId,
      score: data.score,
      timeSeconds: Number(data.time_seconds),
      // Emoji blocks aren't persisted (mode-specific, derivable from
      // score via correctness re-derivation isn't reliable post-hoc),
      // so we leave it blank when reading from cloud. Share card
      // displays the in-session correctness array instead.
      shareCardEmojiBlocks: '',
      challengeDate: data.challenge_date,
    };
  } catch (e) {
    log.warn('dailyChallenge', 'fetchResultForDate failed', { error: String(e), date });
    return null;
  }
}

/** Returns true when the current authenticated user has already
 *  submitted today's challenge. Drives the home card's "played
 *  today" state. Cheap (single indexed lookup, RLS scopes to the
 *  user). */
export async function hasPlayedToday(): Promise<{ played: boolean; result: DailyChallengeResult | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return { played: false, result: null };
  const today = todayUtcIso();
  const result = await fetchResultForDate(userId, today);
  if (result) {
    // Refresh the local cache whenever the cloud confirms played.
    // This keeps cross-device installs in sync and seeds the cache
    // for users who submitted before the field existed.
    try {
      useGameStore.getState().setLastDailyPlayedDate(today);
    } catch {}
  }
  return { played: !!result, result };
}

/** Reschedule the next 7 days of daily challenge notifications
 *  using the user's current preferences + streak + today's
 *  played-status. Safe to call on app open, foreground, completion,
 *  and after the user toggles a notification setting. */
export async function refreshDailyChallengeSchedule(userId: string): Promise<void> {
  try {
    const prefs = await loadNotificationPreferences(userId);
    const streakCount = useGameStore.getState().streakCount;
    const playedToday = (await hasPlayedToday()).played;
    await scheduleDailyChallengeNotifications({
      enableMorning: prefs.daily_challenge_morning !== false,
      enableEvening: prefs.daily_challenge_evening !== false,
      streakCount,
      playedToday,
    });
  } catch (e) {
    log.warn('dailyChallenge', 'refreshDailyChallengeSchedule failed', { error: String(e), userId });
  }
}
