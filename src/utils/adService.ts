/**
 * Ad service — real AdMob integration via react-native-google-mobile-ads.
 *
 * Two ad types (banners removed by design):
 *   - Rewarded: opt-in, user watches → gets a reward (life, cosmetic)
 *   - Interstitial: every 5 levels + world completion, with guardrails
 *
 * All ad calls no-op on web so the Vercel preview keeps working.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useGameStore } from '@/src/store';
import {
  AD_UNIT_IDS,
  ADS_SUPPORTED,
  INTERSTITIAL_EVERY_N_LEVELS,
  INTERSTITIAL_GRACE_LEVELS,
  INTERSTITIAL_SESSION_CAP,
} from '@/src/data/adConfig';
import { log } from '@/src/lib/logger';

// ─── Lazy native import ────────────────────────────────────────────

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

export async function showRewardedAd(): Promise<AdResult> {
  // Subscribers + ads-removed users bypass entirely.
  try {
    const state = useGameStore.getState();
    if (state.isSubscribed()) return { granted: true, bypass: 'subscriber' };
    if (state.adsRemoved) return { granted: true, bypass: 'ads_removed' };
  } catch {}

  const counter = await loadCounter();
  if (counter.count >= DAILY_LIMIT) {
    return { granted: false, reason: 'limit_reached' };
  }

  const AdMob = getAdMob();
  if (!AdMob) {
    // Web / unsupported — grant the reward anyway (better than blocking)
    await saveCounter({ date: counter.date, count: counter.count + 1 });
    return { granted: true };
  }

  try {
    const { RewardedAd, RewardedAdEventType, AdEventType } = AdMob;
    const rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED);

    return await new Promise<AdResult>((resolve) => {
      let earned = false;

      const earnedUnsub = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => { earned = true; },
      );

      const closedUnsub = rewarded.addAdEventListener(
        AdEventType.CLOSED,
        async () => {
          earnedUnsub(); closedUnsub(); errorUnsub();
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

      const errorUnsub = rewarded.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          earnedUnsub(); closedUnsub(); errorUnsub();
          log.warn('ads', 'rewarded ad error', { error: String(error) });
          resolve({ granted: false, reason: 'unavailable' });
        },
      );

      const loadedUnsub = rewarded.addAdEventListener(
        AdEventType.LOADED,
        () => { loadedUnsub(); rewarded.show(); },
      );

      rewarded.load();
    });
  } catch (e) {
    log.error('ads', 'showRewardedAd threw', e);
    return { granted: false, reason: 'error' };
  }
}

// ─── Interstitial ads (with full guardrail system) ─────────────────

/** Levels completed since the last interstitial. In-memory only. */
let _levelsSinceLastAd = 0;

/** Interstitials shown this session. Capped at INTERSTITIAL_SESSION_CAP. */
let _sessionAdCount = 0;

/**
 * Call after every successful level completion. Checks all guardrails
 * and shows an interstitial if conditions are met.
 *
 * @param isWorldCompletion  Pass true when the level was the last in
 *                           its world — always triggers an ad (if
 *                           guardrails allow) regardless of the
 *                           5-level counter.
 * @param totalLevelsEverCompleted  The player's all-time completed
 *                                  level count. Used for the
 *                                  onboarding grace period.
 * @param isDailyChallenge  Pass true for daily challenge levels —
 *                          interstitials are never shown on these.
 */
export async function maybeShowInterstitial(opts: {
  isWorldCompletion?: boolean;
  totalLevelsEverCompleted?: number;
  isDailyChallenge?: boolean;
} = {}): Promise<boolean> {
  const {
    isWorldCompletion = false,
    totalLevelsEverCompleted = 999,
    isDailyChallenge = false,
  } = opts;

  _levelsSinceLastAd += 1;

  // ── Guardrail 1: never on daily challenge ──
  if (isDailyChallenge) return false;

  // ── Guardrail 2: subscriber or ads removed ──
  try {
    const state = useGameStore.getState();
    if (state.isSubscribed() || state.adsRemoved) {
      _levelsSinceLastAd = 0;
      return false;
    }
  } catch {}

  // ── Guardrail 3: onboarding grace period ──
  // First N levels ever played are ad-free so new users get hooked
  // before seeing any monetisation friction.
  if (totalLevelsEverCompleted <= INTERSTITIAL_GRACE_LEVELS) {
    return false;
  }

  // ── Guardrail 4: session cap ──
  // Prevents power users from getting hammered during long sessions.
  if (_sessionAdCount >= INTERSTITIAL_SESSION_CAP) {
    return false;
  }

  // ── Guardrail 5: cadence check ──
  // World completion always qualifies (natural narrative break).
  // Otherwise, check the 5-level counter.
  const isTime = isWorldCompletion || _levelsSinceLastAd >= INTERSTITIAL_EVERY_N_LEVELS;
  if (!isTime) return false;

  // ── All guardrails passed — show the ad ──
  const AdMob = getAdMob();
  if (!AdMob) {
    _levelsSinceLastAd = 0;
    return false;
  }

  try {
    const { InterstitialAd, AdEventType } = AdMob;
    const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL);

    await new Promise<void>((resolve) => {
      const closedUnsub = interstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => { closedUnsub(); errorUnsub(); resolve(); },
      );
      const errorUnsub = interstitial.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          closedUnsub(); errorUnsub();
          log.warn('ads', 'interstitial error', { error: String(error) });
          resolve();
        },
      );
      const loadedUnsub = interstitial.addAdEventListener(
        AdEventType.LOADED,
        () => { loadedUnsub(); interstitial.show(); },
      );
      interstitial.load();
    });

    _levelsSinceLastAd = 0;
    _sessionAdCount += 1;
    log.breadcrumb('ads', 'interstitial shown', {
      sessionCount: _sessionAdCount,
      isWorldCompletion,
      totalLevelsEverCompleted,
    });
    return true;
  } catch (e) {
    log.error('ads', 'maybeShowInterstitial threw', e);
    _levelsSinceLastAd = 0;
    return false;
  }
}

/** Reset session state — call when the app returns from a long
 *  background pause (> 5 min) or on fresh launch. */
export function resetInterstitialSession(): void {
  _levelsSinceLastAd = 0;
  _sessionAdCount = 0;
}
