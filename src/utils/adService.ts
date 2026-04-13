/**
 * Ad service — real AdMob integration via react-native-google-mobile-ads.
 *
 * Three ad types:
 *   - Rewarded: opt-in, user watches → gets a reward (gems, cosmetic, life)
 *   - Interstitial: shown after every 3rd level, never mid-gameplay
 *   - Banner: persistent strip at the bottom of level map + shop
 *
 * All ad calls no-op on web (Platform.OS === 'web') so the Vercel
 * preview keeps working. On native, the SDK lazy-loads via require()
 * so the web bundle never resolves the native module.
 *
 * The `adsRemoved` flag in gameStore disables interstitials + banners.
 * Rewarded ads are always available (opt-in is the user's choice, and
 * removing them would remove a free path to rewards).
 *
 * Blanked+ subscribers bypass the rewarded ad flow entirely — they
 * get the reward without watching.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useGameStore } from '@/src/store';
import { AD_UNIT_IDS, ADS_SUPPORTED, INTERSTITIAL_EVERY_N_LEVELS } from '@/src/data/adConfig';
import { log } from '@/src/lib/logger';

// ─── Lazy native imports ───────────────────────────────────────────
// Same pattern as purchases.ts — load via require() behind a
// platform guard so the web bundle never tries to resolve native code.

let _AdMob: any = null;

function getAdMob(): any {
  if (!ADS_SUPPORTED) return null;
  if (_AdMob) return _AdMob;
  try {
    _AdMob = require('react-native-google-mobile-ads');
    return _AdMob;
  } catch (e) {
    log.warn('ads', 'could not load react-native-google-mobile-ads', { error: String(e) });
    return null;
  }
}

// ─── Types ─────────────────────────────────────────────────────────

export type AdFailureReason =
  | 'limit_reached'
  | 'unavailable'
  | 'dismissed'
  | 'error'
  | 'unsupported';

export interface AdResult {
  granted: boolean;
  reason?: AdFailureReason;
  bypass?: 'subscriber' | 'ads_removed';
}

// ─── Daily rewarded ad limit ───────────────────────────────────────

const DAILY_LIMIT = 5;
const STORAGE_KEY = 'blanked_ads_watched';

interface AdDayCounter {
  date: string;
  count: number;
}

function todayUtc(): string {
  return new Date().toISOString().split('T')[0];
}

async function loadCounter(): Promise<AdDayCounter> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayUtc(), count: 0 };
    const parsed = JSON.parse(raw) as AdDayCounter;
    if (parsed.date !== todayUtc()) return { date: todayUtc(), count: 0 };
    return parsed;
  } catch {
    return { date: todayUtc(), count: 0 };
  }
}

async function saveCounter(counter: AdDayCounter): Promise<void> {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(counter)); } catch {}
}

export async function getRemainingAdWatches(): Promise<number> {
  const counter = await loadCounter();
  return Math.max(0, DAILY_LIMIT - counter.count);
}

// ─── Rewarded ads ──────────────────────────────────────────────────

/**
 * Show a rewarded ad. Returns `{ granted: true }` when the user
 * earns the reward (watched to completion or bypassed as subscriber).
 */
export async function showRewardedAd(): Promise<AdResult> {
  // Subscribers + ads-removed users bypass entirely.
  try {
    const state = useGameStore.getState();
    if (state.isSubscribed()) return { granted: true, bypass: 'subscriber' };
    if (state.adsRemoved) return { granted: true, bypass: 'ads_removed' };
  } catch {}

  // Daily limit check
  const counter = await loadCounter();
  if (counter.count >= DAILY_LIMIT) {
    return { granted: false, reason: 'limit_reached' };
  }

  // Web / unsupported platform — fall back to granting (better UX
  // than blocking the reward entirely on a platform that can't show ads)
  const AdMob = getAdMob();
  if (!AdMob) {
    await saveCounter({ date: counter.date, count: counter.count + 1 });
    return { granted: true };
  }

  try {
    const { RewardedAd, RewardedAdEventType, AdEventType } = AdMob;
    const rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED);

    return await new Promise<AdResult>((resolve) => {
      let earned = false;

      // Earned the reward (watched long enough)
      const earnedUnsub = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => { earned = true; },
      );

      // Ad closed — resolve based on whether EARNED_REWARD fired
      const closedUnsub = rewarded.addAdEventListener(
        AdEventType.CLOSED,
        async () => {
          earnedUnsub();
          closedUnsub();
          errorUnsub();
          if (earned) {
            await saveCounter({ date: counter.date, count: counter.count + 1 });
            log.breadcrumb('ads', 'rewarded ad completed');
            resolve({ granted: true });
          } else {
            log.breadcrumb('ads', 'rewarded ad dismissed early');
            resolve({ granted: false, reason: 'dismissed' });
          }
        },
      );

      // Ad failed to load or show
      const errorUnsub = rewarded.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          earnedUnsub();
          closedUnsub();
          errorUnsub();
          log.warn('ads', 'rewarded ad error', { error: String(error) });
          resolve({ granted: false, reason: 'unavailable' });
        },
      );

      // Load → show when ready
      const loadedUnsub = rewarded.addAdEventListener(
        AdEventType.LOADED,
        () => {
          loadedUnsub();
          rewarded.show();
        },
      );

      rewarded.load();
    });
  } catch (e) {
    log.error('ads', 'showRewardedAd threw', e);
    return { granted: false, reason: 'error' };
  }
}

// ─── Interstitial ads ──────────────────────────────────────────────

/** Track how many levels have been completed this session for the
 *  interstitial cadence. Stored in-memory only — resets on app restart. */
let _levelsCompletedSinceLastAd = 0;

/** Call after every level completion. If it's time for an interstitial,
 *  shows one and returns true. Otherwise returns false. Respects
 *  adsRemoved and subscriber status. */
export async function maybeShowInterstitial(): Promise<boolean> {
  _levelsCompletedSinceLastAd += 1;

  // Not time yet
  if (_levelsCompletedSinceLastAd < INTERSTITIAL_EVERY_N_LEVELS) return false;

  // Subscriber or ads removed — skip silently
  try {
    const state = useGameStore.getState();
    if (state.isSubscribed() || state.adsRemoved) {
      _levelsCompletedSinceLastAd = 0;
      return false;
    }
  } catch {}

  const AdMob = getAdMob();
  if (!AdMob) {
    _levelsCompletedSinceLastAd = 0;
    return false;
  }

  try {
    const { InterstitialAd, AdEventType } = AdMob;
    const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL);

    await new Promise<void>((resolve) => {
      const closedUnsub = interstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          closedUnsub();
          errorUnsub();
          resolve();
        },
      );
      const errorUnsub = interstitial.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          closedUnsub();
          errorUnsub();
          log.warn('ads', 'interstitial error', { error: String(error) });
          resolve();
        },
      );
      const loadedUnsub = interstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          loadedUnsub();
          interstitial.show();
        },
      );
      interstitial.load();
    });

    _levelsCompletedSinceLastAd = 0;
    log.breadcrumb('ads', 'interstitial shown');
    return true;
  } catch (e) {
    log.error('ads', 'maybeShowInterstitial threw', e);
    _levelsCompletedSinceLastAd = 0;
    return false;
  }
}

/** Reset the interstitial counter — call if you want the next
 *  sequence to start fresh (e.g. after a long background pause). */
export function resetInterstitialCounter(): void {
  _levelsCompletedSinceLastAd = 0;
}
