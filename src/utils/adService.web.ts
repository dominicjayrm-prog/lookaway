/**
 * Ad service — WEB STUB.
 *
 * Metro automatically picks this file over adService.ts when bundling
 * for web. It exports the same interface but with pure no-op
 * implementations that never touch react-native-google-mobile-ads,
 * which doesn't exist on web and crashes the bundler if resolved.
 *
 * The native version (adService.ts) has the real AdMob integration.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '@/src/store';

export type AdFailureReason = 'limit_reached' | 'unavailable' | 'dismissed' | 'error' | 'unsupported';

export interface AdResult {
  granted: boolean;
  reason?: AdFailureReason;
  bypass?: 'subscriber' | 'ads_removed';
}

const DAILY_LIMIT = 5;
const STORAGE_KEY = 'blanked_ads_watched';

function todayUtc(): string {
  return new Date().toISOString().split('T')[0];
}

async function loadCounter() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayUtc(), count: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayUtc()) return { date: todayUtc(), count: 0 };
    return parsed;
  } catch {
    return { date: todayUtc(), count: 0 };
  }
}

async function saveCounter(counter: { date: string; count: number }) {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(counter)); } catch {}
}

export async function getRemainingAdWatches(): Promise<number> {
  const counter = await loadCounter();
  return Math.max(0, DAILY_LIMIT - counter.count);
}

/** On web, rewarded ads grant the reward immediately (no ad to show). */
export async function showRewardedAd(): Promise<AdResult> {
  try {
    const state = useGameStore.getState();
    if (state.isSubscribed()) return { granted: true, bypass: 'subscriber' };
    if (state.adsRemoved) return { granted: true, bypass: 'ads_removed' };
  } catch {}
  const counter = await loadCounter();
  if (counter.count >= DAILY_LIMIT) return { granted: false, reason: 'limit_reached' };
  await saveCounter({ date: counter.date, count: counter.count + 1 });
  return { granted: true };
}

/** On web, interstitials are a no-op. */
export async function maybeShowInterstitial(_opts?: {
  isWorldCompletion?: boolean;
  totalLevelsEverCompleted?: number;
  isDailyChallenge?: boolean;
}): Promise<boolean> {
  return false;
}

export function resetInterstitialSession(): void {}
