/**
 * HapticsManager — thin wrapper around expo-haptics that honours a
 * user preference toggle persisted via AsyncStorage.
 *
 * Components still import expo-haptics directly in many places; those
 * paths are unaffected. The new settings screen routes through this
 * module, and the `enabled` flag is checked here so the on/off state
 * can be centrally enforced in the future.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const KEY = 'blanked_haptics_enabled';

class HapticsManager {
  private enabled = true;
  private initialised = false;

  async init(): Promise<void> {
    if (this.initialised) return;
    this.initialised = true;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw === 'false') this.enabled = false;
    } catch {}
  }

  isEnabled(): boolean { return this.enabled; }

  setEnabled(value: boolean): void {
    this.enabled = value;
    AsyncStorage.setItem(KEY, value ? 'true' : 'false').catch(() => {});
  }

  impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light): void {
    if (!this.enabled || Platform.OS === 'web') return;
    Haptics.impactAsync(style).catch(() => {});
  }

  notify(type: Haptics.NotificationFeedbackType): void {
    if (!this.enabled || Platform.OS === 'web') return;
    Haptics.notificationAsync(type).catch(() => {});
  }

  selection(): void {
    if (!this.enabled || Platform.OS === 'web') return;
    Haptics.selectionAsync().catch(() => {});
  }
}

export const haptics = new HapticsManager();
