import { Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';

/**
 * Register for push notifications and save token to profile.
 * Only works on physical devices (iOS/Android).
 * Returns the push token or null.
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

    // Save to profile
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
 * Send a push notification to a user via their stored push token.
 * Uses Expo's push service directly (no Edge Function needed for now).
 */
export async function notifyUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (!profile?.push_token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: profile.push_token,
        title,
        body,
        data,
        sound: 'default',
      }),
    });
  } catch (e) {
    console.warn('Push notification failed:', e);
  }
}
