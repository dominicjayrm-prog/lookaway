import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';

// ─── Push Token Registration ────────────────────────────────────────

/**
 * Register for push notifications and save token to profile.
 * Only works on physical devices (iOS/Android).
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const Notifications = require('expo-notifications');
    const Device = require('expo-device');

    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);

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
 * Send a push notification to a user via their stored push token.
 * Checks notification preferences before sending.
 * Respects daily rate limit (max 3/day).
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

    const now = new Date();
    const eightPm = new Date(now);
    eightPm.setHours(20, 0, 0, 0);
    if (now > eightPm) eightPm.setDate(eightPm.getDate() + 1);

    await Notifications.scheduleNotificationAsync({
      identifier: 'streak-reminder',
      content: {
        title: 'Your streak is at risk!',
        body: `Play before midnight to keep your ${currentStreak}-day streak alive.`,
        data: { type: 'streak_reminder', deepLink: 'blanked://home' },
      },
      trigger: { date: eightPm },
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

    const livesNeeded = maxLives - currentLives;
    const secondsUntilFull = livesNeeded * regenMinutes * 60;

    await Notifications.scheduleNotificationAsync({
      identifier: 'lives-full',
      content: {
        title: 'Lives are full!',
        body: `You have ${maxLives} lives ready. Time to play!`,
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

/** Notify a friend that they've been challenged */
export async function notifyChallengeReceived(
  challengedId: string,
  challengerUsername: string,
  modeName: string,
  challengeId: string,
): Promise<void> {
  await notifyUser(
    challengedId,
    `${challengerUsername} challenged you!`,
    `Can you beat them at ${modeName}?`,
    { type: 'friend_challenge', deepLink: `blanked://challenge/${challengeId}`, challengeId },
  );
}

/** Notify a challenger that the addressee declined their challenge.
 *  The friends tab surfaces this as an in-app toast/popup using the
 *  notification row — there's no push needed for a decline. */
export async function notifyChallengeDeclined(
  challengerId: string,
  declinerUsername: string,
): Promise<void> {
  await notifyUser(
    challengerId,
    `${declinerUsername} declined your challenge`,
    'Maybe another time!',
    { type: 'friend_challenge_declined', declinerUsername },
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
  const resultText = won
    ? `You won! ${challengerScore}% to ${challengedScore}%`
    : `${challengedUsername} beat you ${challengedScore}% to ${challengerScore}%`;

  await notifyUser(
    challengerId,
    `Challenge result vs @${challengedUsername}`,
    resultText,
    { type: 'challenge_result', deepLink: `blanked://challenge-result/${challengeId}`, challengeId },
  );
}

/** Notify user of a friend request */
export async function notifyFriendRequest(
  targetUserId: string,
  senderUsername: string,
): Promise<void> {
  await notifyUser(
    targetUserId,
    'New friend request',
    `@${senderUsername} wants to add you as a friend.`,
    { type: 'friend_request', deepLink: 'blanked://friends' },
  );
}

/** Notify the original sender that the other side accepted. */
export async function notifyFriendRequestAccepted(
  senderId: string,
  accepterUsername: string,
): Promise<void> {
  await notifyUser(
    senderId,
    'Friend request accepted',
    `@${accepterUsername} is now your friend. Send them a challenge?`,
    { type: 'friend_request_accepted', deepLink: 'blanked://friends' },
  );
}

/** Notify the player that they unlocked a new achievement tier. */
export async function notifyAchievementUnlocked(
  userId: string,
  achievementName: string,
  tierLabel: string,
  gemsAwarded: number,
): Promise<void> {
  await notifyUser(
    userId,
    `${tierLabel} unlocked!`,
    `You just earned "${achievementName}" — ${gemsAwarded} gems added.`,
    { type: 'achievements', deepLink: 'blanked://achievements' },
  );
}

/** Notify the player that a friend just came online. Rate-limited by
 *  the caller (we only fire this once per friend per day). */
export async function notifyFriendOnline(
  targetUserId: string,
  friendUsername: string,
): Promise<void> {
  await notifyUser(
    targetUserId,
    `@${friendUsername} is online`,
    'Challenge them while they\u2019re active?',
    { type: 'friend_online', deepLink: 'blanked://friends' },
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
        title: 'Time to train your memory',
        body: 'A quick level keeps the streak alive.',
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
 * now. Called when the app goes to background — if the player
 * returns before the trigger, each one is cancelled on app open.
 */
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
      { id: 'winback-3', secs: day * 3, title: "Your brain's getting rusty \u{1F9E0}", body: 'A 2-minute round brings you back.' },
      { id: 'winback-7', secs: day * 7, title: 'A week without Blanked?', body: 'Your streak shields are waiting.' },
      { id: 'winback-14', secs: day * 14, title: 'Remember that memory score?', body: 'Your daily limit reset. Come claim it.' },
    ];
    for (const p of plans) {
      await Notifications.scheduleNotificationAsync({
        identifier: p.id,
        content: {
          title: p.title,
          body: p.body,
          data: { type: 'win_back', deepLink: 'blanked://home' },
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
        title: 'Weekly challenges end tonight',
        body: 'Last chance to grab this week\u2019s gem rewards.',
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
    return (data?.daily_reminder_time as string | null) ?? '20:00';
  } catch {
    return '20:00';
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
