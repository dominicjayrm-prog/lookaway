/**
 * Daily Challenge local notifications.
 *
 * Two notifications per day, both fired by expo-notifications via
 * one-off date triggers (NOT daily repeats). One-offs let us
 * suppress today's pending fires the instant the player completes
 * today's challenge — a daily-repeat trigger would have fired
 * regardless because there's no per-instance cancellation API.
 *
 * Coverage: schedule the next 7 days each time we touch the
 * schedule. That covers a typical week of dormancy. On every app
 * open, completion, and timezone-relevant event we reschedule
 * fresh from the current device clock.
 *
 * Per spec 1.10:
 *   - Morning at 8am LOCAL: rotating variants, no streak in body.
 *   - Evening at 6pm LOCAL: streak-aware copy, only scheduled
 *     when current streak >= 2.
 *   - Cancel today's pending fires the moment the user completes.
 *   - Both notifications respect the in-app Settings toggles.
 *   - Apple guideline 4.5.4: service notifications, no promo,
 *     no IAP nudges, no external links.
 *
 * Replaces the legacy scheduleDailyReminder which was a generic
 * "play your daily" ping at the user-configured time. The morning
 * notification here is its successor and reuses the existing
 * daily_reminder preference key.
 */
import { Platform } from 'react-native';
import { log } from '@/src/lib/logger';
import { createSeededRng, dateToSeed, todayUtcIso } from './seededRandom';

const SCHEDULE_DAYS = 7;
const MORNING_HOUR = 8;
const EVENING_HOUR = 18;

const MORNING_VARIANTS = [
  { title: 'Your Daily Challenge is ready ✨', body: 'A small puzzle awaits. Two minutes for your sharper self.' },
  { title: "Good morning. Today's challenge awaits.", body: "A new memory is fresh out the gate." },
  { title: 'A new memory awaits ☕', body: "Today's daily is ready when you are." },
  { title: "Today's Daily is fresh out of the oven 🥐", body: "Open whenever you're ready." },
  { title: 'Time for your daily mental stretch.', body: 'A few minutes is all it takes.' },
  { title: 'Five minutes for your sharper self.', body: "Today's challenge is live." },
  { title: "Today's challenge is live", body: 'Open whenever you have a moment.' },
];

function morningVariantFor(date: Date) {
  // Same date = same variant for every player worldwide. Stays
  // predictable + makes screenshots reproducible for support.
  const rng = createSeededRng(dateToSeed(date) ^ 0xA1B2C3D4);
  return rng.pick(MORNING_VARIANTS);
}

function eveningCopyFor(streakCount: number): { title: string; body: string } {
  if (streakCount >= 100) {
    return {
      title: `🔥 ${streakCount}-day streak`,
      body: "You've come this far. One challenge to go.",
    };
  }
  if (streakCount >= 30) {
    return {
      title: `🔥 ${streakCount} days strong`,
      body: 'Keep your streak alive. Two minutes.',
    };
  }
  if (streakCount >= 7) {
    return {
      title: `🔥 ${streakCount}-day streak`,
      body: "Don't lose it tonight.",
    };
  }
  return {
    title: `Your ${streakCount}-day streak is waiting`,
    body: 'One challenge to keep it alive.',
  };
}

function localFireDate(daysAhead: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function morningId(daysAhead: number): string {
  // Date-stamp the id so a re-schedule that re-uses the same day
  // overwrites cleanly via expo-notifications' identifier dedup.
  const d = localFireDate(daysAhead, MORNING_HOUR);
  return `dc_morning_${todayUtcIso(d)}`;
}

function eveningId(daysAhead: number): string {
  const d = localFireDate(daysAhead, EVENING_HOUR);
  return `dc_evening_${todayUtcIso(d)}`;
}

interface ScheduleArgs {
  enableMorning: boolean;
  enableEvening: boolean;
  /** Used to compute streak-aware evening copy. The schedule is
   *  built from TODAY's value; we don't try to predict tomorrow's
   *  streak (which would require play-day prediction). The 6pm
   *  evening copy reflects the streak as it stood when scheduled,
   *  which is the same value the player will see in-app today. */
  streakCount: number;
  /** True if the player has already played today's challenge.
   *  Suppresses today's morning + evening notifications (they
   *  shouldn't get nagged for something they've already done). */
  playedToday: boolean;
}

/** Cancel + reschedule the next `SCHEDULE_DAYS` days of daily
 *  challenge notifications. Idempotent — safe to call on every
 *  app open. */
export async function scheduleDailyChallengeNotifications(args: ScheduleArgs): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');

    // Wipe everything we previously scheduled. Iterate the OS's
    // pending list rather than guessing IDs — covers stale entries
    // from an earlier app version with a different ID format.
    const pending: { identifier: string }[] = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      pending
        .filter((n) => n.identifier?.startsWith('dc_morning_') || n.identifier?.startsWith('dc_evening_'))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})),
    );

    if (!args.enableMorning && !args.enableEvening) return;

    const now = Date.now();
    for (let day = 0; day < SCHEDULE_DAYS; day++) {
      // Today (day === 0) is suppressed entirely if the player has
      // already played; the morning may also be in the past which
      // expo-notifications would silently drop anyway.
      const isToday = day === 0;
      if (isToday && args.playedToday) continue;

      if (args.enableMorning) {
        const fireAt = localFireDate(day, MORNING_HOUR);
        if (fireAt.getTime() > now) {
          const variant = morningVariantFor(fireAt);
          await Notifications.scheduleNotificationAsync({
            identifier: morningId(day),
            content: {
              title: variant.title,
              body: variant.body,
              data: { type: 'daily_challenge_morning', deepLink: 'blanked://daily-challenge' },
            },
            trigger: fireAt,
          }).catch((e: unknown) => log.warn('notifications', 'dc morning schedule failed', { error: String(e), day }));
        }
      }

      // Evening only when streak is alive enough to be at risk.
      if (args.enableEvening && args.streakCount >= 2) {
        const fireAt = localFireDate(day, EVENING_HOUR);
        if (fireAt.getTime() > now) {
          const copy = eveningCopyFor(args.streakCount);
          await Notifications.scheduleNotificationAsync({
            identifier: eveningId(day),
            content: {
              title: copy.title,
              body: copy.body,
              data: { type: 'daily_challenge_evening', deepLink: 'blanked://daily-challenge' },
            },
            trigger: fireAt,
          }).catch((e: unknown) => log.warn('notifications', 'dc evening schedule failed', { error: String(e), day }));
        }
      }
    }
  } catch (e) {
    log.error('notifications', 'scheduleDailyChallengeNotifications failed', e);
  }
}

/** Cancel TODAY's pending morning + evening only. Called the
 *  moment a player completes today's challenge so they aren't
 *  pinged later for something they've already done. Doesn't
 *  touch tomorrow + onward. */
export async function cancelTodaysDailyChallengeNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(morningId(0)).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(eveningId(0)).catch(() => {});
  } catch (e) {
    log.warn('notifications', 'cancelTodaysDailyChallengeNotifications failed', { error: String(e) });
  }
}

export async function cancelAllDailyChallengeNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    const pending: { identifier: string }[] = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      pending
        .filter((n) => n.identifier?.startsWith('dc_morning_') || n.identifier?.startsWith('dc_evening_'))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})),
    );
  } catch {}
}
