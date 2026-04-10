import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

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
    console.warn('Push registration failed:', e);
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

    // Log the notification
    await supabase.from('notification_log').insert({
      key: `${notifType ?? 'generic'}_${userId}_${today}_${Date.now()}`,
      user_id: userId,
      notification_type: notifType ?? 'generic',
    }).catch(() => {}); // Don't fail if log insert fails
  } catch (e) {
    console.warn('Push notification failed:', e);
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
    console.warn('scheduleStreakReminder failed:', e);
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
    console.warn('scheduleLivesFullNotification failed:', e);
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

// ─── Notification Preferences ───────────────────────────────────────

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  streak_reminder: true,
  daily_challenge: true,
  friend_challenge: true,
  friend_online: true,
  challenge_result: true,
  lives_full: true,
  tournament: true,
  achievements: true,
  friend_request: true,
  win_back: true,
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
    console.warn('saveNotificationPreferences failed:', e);
  }
}
