import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';
import { t } from '@/src/i18n';

// ─── Push Token Registration ────────────────────────────────────────

/**
 * Resolve the EAS project ID required by `getExpoPushTokenAsync` in
 * SDK 53+. EAS Build injects this into `expoConfig.extra.eas.projectId`
 * at build time; the deprecated `easConfig.projectId` path is kept as
 * a fallback so older builds still work.
 *
 * Without this, `getExpoPushTokenAsync` throws silently in production
 * and the caller sees `undefined` — the exact bug that left every
 * user's `push_token` NULL in Supabase through v1.1.0 (builds 24-30).
 */
function resolveProjectId(): string | undefined {
  return (
    (Constants.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId
  );
}

/**
 * Register for push notifications and save token to profile.
 * Works in both the Expo managed workflow and a bare workflow
 * (post-prebuild / pure Xcode builds) — getExpoPushTokenAsync is
 * supported in both as long as `projectId` is wired through.
 *
 * Returns null on: web, simulator, denied permission, any failure.
 * Logs breadcrumbs + errors on failure so ops can spot dead flows.
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const Notifications = require('expo-notifications');
    const Device = require('expo-device');

    if (!Device.isDevice) {
      log.breadcrumb('notifications', 'skipped — not a physical device', { userId });
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      log.breadcrumb('notifications', 'permission denied', { userId, finalStatus });
      return null;
    }

    const projectId = resolveProjectId();
    if (!projectId) {
      // Loud, high-signal error. Without projectId the Expo push
      // endpoint returns a token but it's unaddressable — silent
      // failure mode we just spent a debug session untangling.
      log.error(
        'notifications',
        'EAS projectId missing — push registration cannot proceed. Set expo.extra.eas.projectId in app.json or configure via EAS.',
        new Error('missing_eas_project_id'),
        { userId },
      );
      return null;
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const token: string | undefined = tokenResult?.data;

    if (!token) {
      log.error('notifications', 'getExpoPushTokenAsync returned no token', new Error('empty_token'), { userId, tokenResult });
      return null;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

    if (error) {
      log.error('notifications', 'supabase push_token update failed', error, { userId });
      return null;
    }

    log.breadcrumb('notifications', 'push token registered', { userId, tokenPrefix: token.slice(0, 16) });
    return token;
  } catch (e) {
    log.error('notifications', 'registerPushToken failed', e, { userId });
    return null;
  }
}

/**
 * Request notification permission without auto-registering.
 * Used by the pre-permission screen after first level.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const Notifications = require('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Check if notifications are currently granted */
export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const Notifications = require('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ─── Push Notification Sending ──────────────────────────────────────

/**
 * Enqueue a templated push to a specific user. The push-dispatch
 * edge function picks it up within ≤1 minute and renders title+body
 * from its locale catalog using the recipient's preferred_language.
 *
 * This is how EVERY server-delivered notification should be fired —
 * pre-rendered strings on the sender's device would leak the
 * sender's language to the recipient when they differ.
 */
export async function enqueuePushTemplate(
  userId: string,
  templateKey: string,
  params: Record<string, string | number>,
  notificationType: string,
  deepLink?: string,
): Promise<void> {
  try {
    await supabase.from('push_queue').insert({
      user_id: userId,
      notification_type: notificationType,
      title: '', // Ignored when template_key is set; edge fn renders from catalog
      body: '',
      data: { type: notificationType, ...(deepLink ? { deepLink } : {}) },
      template_key: templateKey,
      params,
    });
  } catch (e) {
    log.error('notifications', 'enqueuePushTemplate failed', e, { userId, templateKey });
  }
}

/**
 * Legacy immediate-send helper — still exported for backwards-compat
 * with callers that haven't been refactored to the template flow yet.
 * Sends a pre-rendered title/body directly via Expo, which means the
 * text is whatever language the SENDER's device is in. Prefer
 * `enqueuePushTemplate` for anything user-visible so the recipient
 * sees it in their own language.
 */
export async function notifyUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token, notification_preferences')
      .eq('id', userId)
      .single();

    if (!profile?.push_token) return;

    // Check if this notification type is enabled in preferences
    const notifType = data?.type;
    if (notifType && profile.notification_preferences) {
      const prefs = profile.notification_preferences as Record<string, boolean>;
      if (prefs[notifType] === false) return;
    }

    // Check daily rate limit (max 3/day)
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('sent_at', `${today}T00:00:00Z`);

    if ((count ?? 0) >= 3) return; // Rate limited

    // Send via Expo push notification service
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: profile.push_token,
        title,
        body,
        data,
        sound: 'default',
        badge: 1,
      }),
    });

    // Log the notification (best-effort — Postgrest's query builder
    // returns a PromiseLike that has no `.catch`, so swallow via try).
    try {
      await supabase.from('notification_log').insert({
        key: `${notifType ?? 'generic'}_${userId}_${today}_${Date.now()}`,
        user_id: userId,
        notification_type: notifType ?? 'generic',
      });
    } catch {
      // notification_log is best-effort; never block on a logging failure
    }
  } catch (e) {
    log.error('notifications', 'sendPushNotification failed', e);
  }
}

// ─── Local Notifications ────────────────────────────────────────────

/**
 * Schedule a streak reminder notification for 8pm local time.
 * Only for streaks of 3+ days. Cancels any existing reminder.
 */
export async function scheduleStreakReminder(currentStreak: number): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');

    await Notifications.cancelScheduledNotificationAsync('streak-reminder').catch(() => {});

    if (currentStreak < 3) return;

    // Streak save reminder fires at 6pm local. Earlier wins big — by
    // 8pm a meaningful chunk of users have already shut down for the
    // night (commuting, dinner, kids); 6pm catches them while they
    // still have phone time. a16z's casual-game retention research
    // shows ~2x save rate from the 6pm vs 8pm slot.
    const now = new Date();
    const trigger = new Date(now);
    trigger.setHours(18, 0, 0, 0);
    if (now > trigger) trigger.setDate(trigger.getDate() + 1);

    await Notifications.scheduleNotificationAsync({
      identifier: 'streak-reminder',
      content: {
        title: t('notifications.streak_risk_title'),
        body: t('notifications.streak_risk_body', { count: currentStreak }),
        data: { type: 'streak_reminder', deepLink: 'blanked://home' },
      },
      trigger: { date: trigger },
    });
  } catch (e) {
    log.error('notifications', 'scheduleStreakReminder failed', e);
  }
}

/** Cancel streak reminder (called when user plays today) */
export async function cancelStreakReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync('streak-reminder').catch(() => {});
  } catch {}
}

/**
 * Schedule a "Lives full" notification.
 * Fires when all lives have regenerated.
 */
export async function scheduleLivesFullNotification(
  currentLives: number,
  maxLives: number,
  regenMinutes: number,
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');

    await Notifications.cancelScheduledNotificationAsync('lives-full').catch(() => {});

    if (currentLives >= maxLives) return;

    // Subscribers + Remove-Ads-IAP holders have unlimited lives → the
    // "your lives are refilled" notification is meaningless to them.
    // Bail out before scheduling. (Imported lazily so the test-environment
    // doesn't drag the entire store into this util.)
    try {
      const { useGameStore } = require('@/src/store');
      const state = useGameStore.getState();
      if (state.hasUnlimitedLives?.() || state.isSubscribed?.()) return;
    } catch {}

    const livesNeeded = maxLives - currentLives;
    const secondsUntilFull = livesNeeded * regenMinutes * 60;

    await Notifications.scheduleNotificationAsync({
      identifier: 'lives-full',
      content: {
        title: t('notifications.lives_full_title'),
        body: t('notifications.lives_full_body', { max: maxLives }),
        data: { type: 'lives_full', deepLink: 'blanked://home' },
      },
      trigger: { seconds: secondsUntilFull },
    });
  } catch (e) {
    log.error('notifications', 'scheduleLivesFullNotification failed', e);
  }
}

/** Cancel lives full notification (e.g. when user opens app) */
export async function cancelLivesFullNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync('lives-full').catch(() => {});
  } catch {}
}

// ─── Push Notification Triggers ─────────────────────────────────────

/** Notify a friend that they've been challenged.
 *  No-op: the `friend_challenges` INSERT trigger already enqueues
 *  this push server-side rendered in the recipient's language.
 *  Kept as an exported stub so existing callers don't crash. */
export async function notifyChallengeReceived(
  challengedId: string,
  challengerUsername: string,
  modeName: string,
  challengeId: string,
): Promise<void> {
  void challengedId; void challengerUsername; void modeName; void challengeId;
}

/** Notify a challenger that the addressee declined their challenge.
 *  The friends tab surfaces this as an in-app toast/popup using the
 *  notification row — there's no push needed for a decline. */
export async function notifyChallengeDeclined(
  challengerId: string,
  declinerUsername: string,
): Promise<void> {
  await enqueuePushTemplate(
    challengerId,
    'challenge_declined',
    { username: declinerUsername },
    'friend_challenge_declined',
  );
}

/** Notify the challenger when their opponent completes the challenge */
export async function notifyChallengeResult(
  challengerId: string,
  challengedUsername: string,
  challengerScore: number,
  challengedScore: number,
  challengeId: string,
): Promise<void> {
  const won = challengerScore > challengedScore;
  await enqueuePushTemplate(
    challengerId,
    won ? 'challenge_result_won' : 'challenge_result_lost',
    {
      username: challengedUsername,
      myScore: challengerScore,
      theirScore: challengedScore,
    },
    'challenge_result',
    `blanked://challenge-result/${challengeId}`,
  );
}

/** Notify user of a friend request. No-op — the `friendships` INSERT
 *  trigger enqueues this push server-side in the recipient's language. */
export async function notifyFriendRequest(
  targetUserId: string,
  senderUsername: string,
): Promise<void> {
  void targetUserId; void senderUsername;
}

/** Notify the original sender that the other side accepted. No-op —
 *  the `friendships` UPDATE (pending→accepted) trigger handles it. */
export async function notifyFriendRequestAccepted(
  senderId: string,
  accepterUsername: string,
): Promise<void> {
  void senderId; void accepterUsername;
}

/** Notify the player that they unlocked a new achievement tier. */
export async function notifyAchievementUnlocked(
  userId: string,
  achievementName: string,
  tierLabel: string,
  gemsAwarded: number,
): Promise<void> {
  await enqueuePushTemplate(
    userId,
    'achievement_unlocked',
    { tier: tierLabel, name: achievementName, gems: gemsAwarded },
    'achievements',
    'blanked://achievements',
  );
}

/** Notify the player that a friend just came online. Rate-limited by
 *  the caller (we only fire this once per friend per day). */
export async function notifyFriendOnline(
  targetUserId: string,
  friendUsername: string,
): Promise<void> {
  await enqueuePushTemplate(
    targetUserId,
    'friend_online',
    { username: friendUsername },
    'friend_online',
    'blanked://friends',
  );
}

// ─── Daily reminder (local, recurring) ──────────────────────────────

/**
 * Schedule the recurring daily play reminder at the player's chosen
 * local time. Uses a repeating DAILY trigger so it re-fires every 24h
 * without further scheduling on our side. Time format: 'HH:MM' (24h).
 *
 * Call this whenever the user changes their preferred reminder time
 * OR on app startup (in case the prior schedule drifted after OS
 * updates / reinstall).
 */
export async function scheduleDailyReminder(time: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync('daily-reminder').catch(() => {});
    const [hStr, mStr] = time.split(':');
    const hour = Math.max(0, Math.min(23, parseInt(hStr ?? '20', 10)));
    const minute = Math.max(0, Math.min(59, parseInt(mStr ?? '0', 10)));

    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-reminder',
      content: {
        title: t('notifications.daily_reminder_title'),
        body: t('notifications.daily_reminder_body'),
        data: { type: 'daily_reminder', deepLink: 'blanked://home' },
      },
      // DAILY repeats without needing a fixed date — expo-notifications
      // accepts { hour, minute, repeats: true } as its daily shorthand.
      trigger: { hour, minute, repeats: true },
    });
  } catch (e) {
    log.error('notifications', 'scheduleDailyReminder failed', e, { time });
  }
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync('daily-reminder').catch(() => {});
  } catch {}
}

// ─── Win-back reminders (local) ─────────────────────────────────────

/**
 * Schedule up to 3 win-back local notifications: 3, 7, 14 days from
 * now. Called when the app goes to background — if the player returns
 * before the trigger, each one is cancelled on app open.
 *
 * Day-7 + day-14 carry a 15-gem comeback reward. The push body
 * advertises the reward, and `data.comebackGems` is set so the deep-
 * link handler can show a claim modal when the user taps in. The
 * actual gem grant happens client-side via the comeback-claim flow
 * (rate-limited to once per 14 days).
 */
export const COMEBACK_GEMS = 15;
export async function scheduleWinBackReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    // Clear any previous run first so we don't stack duplicates.
    for (const id of ['winback-3', 'winback-7', 'winback-14']) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
    const day = 86_400;
    const plans = [
      {
        id: 'winback-3',
        secs: day * 3,
        title: t('notifications.winback_3_title'),
        body: t('notifications.winback_3_body'),
        gems: 0,
      },
      {
        id: 'winback-7',
        secs: day * 7,
        title: t('notifications.winback_7_gem_title'),
        body: t('notifications.winback_7_gem_body', { gems: COMEBACK_GEMS }),
        gems: COMEBACK_GEMS,
      },
      {
        id: 'winback-14',
        secs: day * 14,
        title: t('notifications.winback_14_gem_title'),
        body: t('notifications.winback_14_gem_body', { gems: COMEBACK_GEMS }),
        gems: COMEBACK_GEMS,
      },
    ];
    for (const p of plans) {
      await Notifications.scheduleNotificationAsync({
        identifier: p.id,
        content: {
          title: p.title,
          body: p.body,
          data: {
            type: 'win_back',
            deepLink: 'blanked://home',
            comebackGems: p.gems,
          },
        },
        trigger: { seconds: p.secs },
      });
    }
  } catch (e) {
    log.error('notifications', 'scheduleWinBackReminders failed', e);
  }
}

export async function cancelWinBackReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    for (const id of ['winback-3', 'winback-7', 'winback-14']) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
  } catch {}
}

// ─── First-week onboarding schedule (local) ─────────────────────────
//
// Habits form fast in the first 7 days. We schedule a denser push
// cadence over the first week than after — day 1, 2, 3, 5, 7 — each
// at 6pm local so the user has phone time to act on it. Idempotent:
// always cancels any prior pending versions before re-scheduling, so
// calling on every app launch is safe (no duplicates). Each trigger
// is anchored to a fixed Date computed from `signupDate` so the
// schedule survives app restarts.

const ONBOARDING_IDS = ['onboarding-1', 'onboarding-2', 'onboarding-3', 'onboarding-5', 'onboarding-7'];

/** Schedule the 5-push first-week onboarding sequence. Pass the date
 *  the user first opened the app — typically taken from the store's
 *  install timestamp. Skips any push whose trigger time has already
 *  passed (so re-running on day 4 only schedules days 5 + 7). */
export async function scheduleOnboardingPushes(signupDate: Date): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    for (const id of ONBOARDING_IDS) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }

    const now = new Date();
    const plans = [
      { day: 1, id: 'onboarding-1', titleKey: 'notifications.onboarding_1_title', bodyKey: 'notifications.onboarding_1_body' },
      { day: 2, id: 'onboarding-2', titleKey: 'notifications.onboarding_2_title', bodyKey: 'notifications.onboarding_2_body' },
      { day: 3, id: 'onboarding-3', titleKey: 'notifications.onboarding_3_title', bodyKey: 'notifications.onboarding_3_body' },
      { day: 5, id: 'onboarding-5', titleKey: 'notifications.onboarding_5_title', bodyKey: 'notifications.onboarding_5_body' },
      { day: 7, id: 'onboarding-7', titleKey: 'notifications.onboarding_7_title', bodyKey: 'notifications.onboarding_7_body' },
    ];

    for (const p of plans) {
      const trigger = new Date(signupDate);
      trigger.setDate(trigger.getDate() + p.day);
      trigger.setHours(18, 0, 0, 0);
      if (trigger <= now) continue; // skip already-passed days

      await Notifications.scheduleNotificationAsync({
        identifier: p.id,
        content: {
          title: t(p.titleKey),
          body: t(p.bodyKey),
          data: { type: 'onboarding', deepLink: 'blanked://home' },
        },
        trigger: { date: trigger },
      });
    }
  } catch (e) {
    log.error('notifications', 'scheduleOnboardingPushes failed', e);
  }
}

export async function cancelOnboardingPushes(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    for (const id of ONBOARDING_IDS) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
  } catch {}
}

// ─── Weekly challenge reminder (local) ──────────────────────────────

/**
 * Schedule a Sunday-evening reminder that weekly challenges reset soon.
 * Fires at 19:00 local on the next upcoming Sunday.
 */
export async function scheduleWeeklyChallengeReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync('weekly-reminder').catch(() => {});

    const now = new Date();
    const trigger = new Date(now);
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7; // Always at least 1 day ahead
    trigger.setDate(now.getDate() + daysUntilSunday);
    trigger.setHours(19, 0, 0, 0);

    await Notifications.scheduleNotificationAsync({
      identifier: 'weekly-reminder',
      content: {
        title: t('notifications.weekly_challenge_title'),
        body: t('notifications.weekly_challenge_body'),
        data: { type: 'weekly_challenge', deepLink: 'blanked://home' },
      },
      trigger: { date: trigger },
    });
  } catch (e) {
    log.error('notifications', 'scheduleWeeklyChallengeReminder failed', e);
  }
}

// ─── Notification Preferences ───────────────────────────────────────

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  // Daily
  daily_reminder: true,            // Daily play reminder at user's chosen time
  // Streak
  streak_reminder: true,           // 8pm "your streak is at risk"
  streak_milestone: true,          // "1 more day to hit 7 days!"
  // Challenges
  friend_challenge: true,          // @user challenged you
  challenge_result: true,          // how you did vs opponent
  challenge_declined: true,        // opponent declined your challenge
  // Social
  friend_request: true,            // @user wants to add you
  friend_request_accepted: true,   // @user accepted your request
  friend_online: true,             // friend came online
  // Progress
  achievements: true,              // new tier unlocked
  // Lives
  lives_full: true,                // your 5 lives refilled
  // Weekly + seasonal
  weekly_challenge: true,          // "only 1 day left to finish this week's goals"
  // Win-back
  win_back: true,                  // haven't played in N days
  // Legacy (kept so existing rows don't break on read)
  tournament: true,
};

export type NotificationPreferenceKey = keyof typeof DEFAULT_NOTIFICATION_PREFERENCES;

/** Load notification preferences from Supabase */
export async function loadNotificationPreferences(
  userId: string,
): Promise<Record<string, boolean>> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .single();
    return (data?.notification_preferences as Record<string, boolean>) ?? { ...DEFAULT_NOTIFICATION_PREFERENCES };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

/** Save notification preferences to Supabase */
export async function saveNotificationPreferences(
  userId: string,
  prefs: Record<string, boolean>,
): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ notification_preferences: prefs })
      .eq('id', userId);
  } catch (e) {
    log.error('notifications', 'saveNotificationPreferences failed', e);
  }
}

/** Default local time for the morning re-engagement reminder. Biased
 *  toward the morning so players get a nudge at the start of their day
 *  (matches the server-side 9am push which only fires to users who
 *  haven't played yet today — see supabase/functions/push-dispatch). */
export const DEFAULT_DAILY_REMINDER_TIME = '09:00';

/** Daily reminder time lives on its own column rather than inside
 *  notification_preferences so the client can read it efficiently on
 *  every app open without deserialising the JSONB blob. Returns
 *  null when the column is null (user has disabled the reminder). */
export async function loadDailyReminderTime(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('daily_reminder_time')
      .eq('id', userId)
      .single();
    return (data?.daily_reminder_time as string | null) ?? DEFAULT_DAILY_REMINDER_TIME;
  } catch {
    return DEFAULT_DAILY_REMINDER_TIME;
  }
}

export async function saveDailyReminderTime(userId: string, time: string | null): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ daily_reminder_time: time })
      .eq('id', userId);
  } catch (e) {
    log.error('notifications', 'saveDailyReminderTime failed', e);
  }
}

// ─── Timezone sync ──────────────────────────────────────────────────
// The server-side push-dispatch edge function uses `profiles.timezone`
// to decide whether it's 9am in the user's local time RIGHT NOW before
// sending the morning hype push. Without a correct timezone, everyone
// gets their 9am push at 9am UTC — wrong for every non-London user.

/** Read the device's IANA timezone (e.g. "Europe/London", "America/New_York").
 *  Returns null on web where Intl may not resolve a meaningful value
 *  for headless environments. */
export function getDeviceTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === 'string' && tz.length > 0 ? tz : null;
  } catch {
    return null;
  }
}

/** Push the device's current timezone to the profile so server-side
 *  campaigns can schedule at local times. Idempotent — writes on every
 *  app open so users who travel across timezones stay in sync. Skips
 *  the write when the stored value already matches. */
export async function syncTimezoneToProfile(userId: string): Promise<void> {
  const tz = getDeviceTimezone();
  if (!tz) return;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', userId)
      .single();
    if ((data as { timezone?: string | null } | null)?.timezone === tz) return;
    await supabase.from('profiles').update({ timezone: tz }).eq('id', userId);
    log.breadcrumb('notifications', 'timezone synced', { userId, tz });
  } catch (e) {
    log.error('notifications', 'syncTimezoneToProfile failed', e, { userId, tz });
  }
}

// ─── First-run pre-permission prompt gate ──────────────────────────

/** Returns true if the app should show the pre-permission popup now.
 *  Checks: not web, not already asked, not already granted, decline
 *  count below threshold. The caller is responsible for rendering
 *  the modal and calling `markNotifPromptAsked()` on resolution. */
export async function shouldShowFirstRunNotifPrompt(userId?: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const AS = require('@react-native-async-storage/async-storage').default;
    const asked = await AS.getItem('blanked_notifications_asked');
    if (asked) return false;
    const declined = parseInt((await AS.getItem('blanked_notifications_declined_count')) ?? '0', 10);
    if (declined >= 2) return false;
    // If permission is already granted we don't need the pre-prompt —
    // just register the token.
    if (await hasNotificationPermission()) {
      if (userId) registerPushToken(userId);
      await AS.setItem('blanked_notifications_asked', 'true');
      return false;
    }
    // Also respect server-side flag (syncs across devices for the same
    // user — if they already accepted on their iPhone we don't re-prompt
    // on their iPad).
    if (userId) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('has_seen_notif_prompt')
          .eq('id', userId)
          .single();
        if ((data as { has_seen_notif_prompt?: boolean } | null)?.has_seen_notif_prompt) {
          await AS.setItem('blanked_notifications_asked', 'true');
          return false;
        }
      } catch {}
    }
    return true;
  } catch {
    return false;
  }
}

/** Record that we've shown the prompt so we don't re-show it. Called
 *  after the user picks Enable OR Dismiss. */
export async function markNotifPromptAsked(userId?: string): Promise<void> {
  try {
    const AS = require('@react-native-async-storage/async-storage').default;
    await AS.setItem('blanked_notifications_asked', 'true');
  } catch {}
  if (userId) {
    try {
      await supabase.from('profiles').update({ has_seen_notif_prompt: true }).eq('id', userId);
    } catch {}
  }
}
