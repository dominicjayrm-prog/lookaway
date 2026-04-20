/**
 * Ad service — real AdMob integration via react-native-google-mobile-ads.
 *
 * Two ad types (banners removed by design):
 *  - Rewarded: opt-in, user watches → gets a reward (life, cosmetic)
 *  - Interstitial: every 5 levels + world completion, with guardrails
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

// ─── ATT + UMP + AdMob initialization ──────────────────────────────
//
// Two platform-specific consent gates, same end goal: tell AdMob
// whether we're allowed to serve personalised ads before the SDK's
// first ad request goes out.
//
//  - iOS: App Tracking Transparency (ATT). Apple guideline 5.1.2 —
//    reject on sight if AdMob loads before the ATT prompt on iOS
//    14.5+. Covered below.
//  - Android: Google's User Messaging Platform (UMP) form, required
//    for EU/UK users under GDPR. Play policy rejects ads served
//    without a consent signal to EU/UK users. Covered below.
//
// Both must fire BEFORE `mobileAds().initialize()`.

let _initStarted = false;

/**
 * Request tracking/consent per platform, then initialize AdMob with
 * the correct consent signals. Idempotent — only runs once per app
 * session.
 *
 * iOS ATT outcomes:
 *  - 'granted' → AdMob can use IDFA, personalised ads
 *  - 'denied' / 'restricted' → AdMob serves non-personalised ads
 *  - 'not-determined' → user dismissed before deciding; treat as denied
 *
 * Android UMP outcomes:
 *  - status 'REQUIRED' → show the consent form, user chooses
 *  - status 'NOT_REQUIRED' → outside EU/UK, no form needed
 *  - status 'OBTAINED' → user already chose on a previous launch
 *
 * Web no-ops cleanly — the AdMob module itself isn't available.
 */
export async function initAdsAndTracking(): Promise<void> {
  if (_initStarted) return;
  _initStarted = true;
  if (Platform.OS === 'web') return;
  const admob = getAdMob();
  if (!admob) return;

  try {
    if (Platform.OS === 'ios') {
      await runIosAttFlow(admob);
    } else if (Platform.OS === 'android') {
      await runAndroidUmpFlow(admob);
    }
    // Boot the SDK. Safe to call after consent flows above — they
    // set the request-configuration signals AdMob needs for the very
    // first ad request.
    await admob.default().initialize();
  } catch (e) {
    log.warn('ads', 'initAdsAndTracking failed', { error: String(e) });
  }
}

async function runIosAttFlow(admob: any): Promise<void> {
  // Lazy-import ATT so it doesn't bloat the JS bundle on Android.
  const TT = require('expo-tracking-transparency');
  const { status: existing } = await TT.getTrackingPermissionsAsync();
  let status = existing;
  if (existing === 'undetermined') {
    const result = await TT.requestTrackingPermissionsAsync();
    status = result.status;
  }
  // Tell AdMob whether we have IDFA permission BEFORE the SDK boots,
  // so the very first ad request goes out with the right signals.
  const granted = status === 'granted';
  try {
    await admob.default().setRequestConfiguration({
      // When ATT is denied, AdMob must serve only non-personalised
      // ads. tagForChildDirectedTreatment stays unset because BLANKED
      // is rated 4+ but not strictly child-directed.
      maxAdContentRating: admob.MaxAdContentRating?.PG ?? 'PG',
      tagForUnderAgeOfConsent: !granted,
    });
  } catch (e) {
    log.warn('ads', 'setRequestConfiguration (iOS) failed', { error: String(e) });
  }
}

async function runAndroidUmpFlow(admob: any): Promise<void> {
  // `AdsConsent` lives inside react-native-google-mobile-ads — the
  // same package already used for iOS. No extra install required.
  const { AdsConsent, AdsConsentStatus } = admob;
  if (!AdsConsent) {
    log.warn('ads', 'UMP unavailable — AdsConsent export missing from react-native-google-mobile-ads');
    return;
  }
  try {
    // Request the latest consent info from Google's servers. This
    // determines whether a form needs to be shown based on the
    // user's geo (EU/UK users see a form, everyone else skips).
    const info = await AdsConsent.requestInfoUpdate();
    // For EU/UK users on first run, show the consent form. If they
    // already consented on a previous launch, status is OBTAINED and
    // this is a no-op.
    if (info.status === AdsConsentStatus.REQUIRED) {
      await AdsConsent.loadAndShowConsentFormIfRequired();
    }
  } catch (e) {
    // UMP form can fail on emulators or in-flight network issues —
    // not fatal. AdMob will still serve non-personalised ads in
    // that case, which is the compliant fallback.
    log.warn('ads', 'Android UMP flow failed', { error: String(e) });
  }
  // Request configuration matching the iOS path — non-personalised
  // baseline + family-friendly content rating. If the user granted
  // consent via the UMP form above, AdMob reads that separately and
  // can still serve personalised ads; this is the safety floor.
  try {
    await admob.default().setRequestConfiguration({
      maxAdContentRating: admob.MaxAdContentRating?.PG ?? 'PG',
    });
  } catch (e) {
    log.warn('ads', 'setRequestConfiguration (Android) failed', { error: String(e) });
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
    // Module didn't load on this platform/build. This used to grant
    // the reward for free which let users unlock cosmetics without
    // watching ads — exactly the "I clicked watch-ad and just got
    // the expression" bug the user reported. Fail loudly instead:
    // the shop surfaces a "Couldn't load an ad" toast and the user
    // can try again.
    log.warn('ads', 'rewarded ad unavailable — AdMob module not loaded');
    return { granted: false, reason: 'unavailable' };
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
 */
export async function maybeShowInterstitial(opts: {
  isWorldCompletion?: boolean;
  totalLevelsEverCompleted?: number;
} = {}): Promise<boolean> {
  const {
    isWorldCompletion = false,
    totalLevelsEverCompleted = 999,
  } = opts;

  _levelsSinceLastAd += 1;

  // ── Guardrail 1: subscriber or ads removed ──
  try {
    const state = useGameStore.getState();
    if (state.isSubscribed() || state.adsRemoved) {
      _levelsSinceLastAd = 0;
      log.breadcrumb('ads', 'interstitial skipped — subscriber / adsRemoved', { isSubscribed: state.isSubscribed(), adsRemoved: state.adsRemoved });
      return false;
    }
  } catch {}

  // ── Guardrail 3: onboarding grace period ──
  // First N levels ever played are ad-free so new users get hooked
  // before seeing any monetisation friction.
  if (totalLevelsEverCompleted <= INTERSTITIAL_GRACE_LEVELS) {
    log.breadcrumb('ads', 'interstitial skipped — in grace period', { totalLevelsEverCompleted, graceCeiling: INTERSTITIAL_GRACE_LEVELS });
    return false;
  }

  // ── Guardrail 4: session cap ──
  // Prevents power users from getting hammered during long sessions.
  if (_sessionAdCount >= INTERSTITIAL_SESSION_CAP) {
    log.breadcrumb('ads', 'interstitial skipped — session cap reached', { sessionAdCount: _sessionAdCount, cap: INTERSTITIAL_SESSION_CAP });
    return false;
  }

  // ── Guardrail 5: cadence check ──
  // World completion always qualifies (natural narrative break).
  // Otherwise, check the 5-level counter.
  const isTime = isWorldCompletion || _levelsSinceLastAd >= INTERSTITIAL_EVERY_N_LEVELS;
  if (!isTime) {
    log.breadcrumb('ads', 'interstitial skipped — cadence not met', { levelsSinceLastAd: _levelsSinceLastAd, everyN: INTERSTITIAL_EVERY_N_LEVELS, isWorldCompletion });
    return false;
  }

  // ── All guardrails passed — show the ad ──
  const AdMob = getAdMob();
  if (!AdMob) {
    _levelsSinceLastAd = 0;
    log.warn('ads', 'interstitial skipped — AdMob module not available');
    return false;
  }

  log.breadcrumb('ads', 'interstitial loading', { isWorldCompletion, totalLevelsEverCompleted, levelsSinceLastAd: _levelsSinceLastAd });

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
