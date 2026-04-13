/**
 * AdMob configuration — centralised ad unit IDs and placement rules.
 *
 * ⚠️  CURRENT STATE: using Google's official TEST ad unit IDs.
 * These always return test ads and will never earn real revenue.
 * Replace with your real IDs from admob.google.com before shipping.
 *
 * To swap in real IDs:
 *   1. Replace the 3 ad unit IDs below with your real ones
 *   2. Replace the iosAppId in app.json plugins config with your
 *      real AdMob App ID (ca-app-pub-XXXX~XXXXXXXXXX)
 *   3. Rebuild with `eas build` — the app ID is baked at build time
 *
 * Placement rules (from CLAUDE.md):
 *   - Interstitials: after every 3rd completed level ONLY, never
 *     mid-gameplay, never on daily challenge
 *   - Rewarded: always opt-in (free life, free gems, free cosmetic)
 *   - Banners: bottom of level map + shop ONLY, never during gameplay
 *   - adsRemoved (Remove Ads IAP) disables interstitials + banners
 *     but NOT rewarded (those are opt-in and stay available)
 *   - Blanked+ subscribers skip all ads
 */

import { Platform } from 'react-native';

// ─── Google's official test ad unit IDs ────────────────────────────
// These work in any app without AdMob account setup. They always
// return test ads. Replace with real IDs before shipping.
// See: https://developers.google.com/admob/ios/test-ads

const TEST_IDS = {
  BANNER: 'ca-app-pub-3940256099942544/2934735716',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/4411468910',
  REWARDED: 'ca-app-pub-3940256099942544/1712485313',
};

// TODO: Replace with real IDs from your AdMob dashboard
const PRODUCTION_IDS = {
  BANNER: '',       // paste your real banner ad unit ID here
  INTERSTITIAL: '', // paste your real interstitial ad unit ID here
  REWARDED: '',     // paste your real rewarded ad unit ID here
};

/** True when real production ad IDs are configured. Until then,
 *  the test IDs are used automatically. */
const hasProductionIds = !!PRODUCTION_IDS.BANNER;

export const AD_UNIT_IDS = {
  BANNER: hasProductionIds ? PRODUCTION_IDS.BANNER : TEST_IDS.BANNER,
  INTERSTITIAL: hasProductionIds ? PRODUCTION_IDS.INTERSTITIAL : TEST_IDS.INTERSTITIAL,
  REWARDED: hasProductionIds ? PRODUCTION_IDS.REWARDED : TEST_IDS.REWARDED,
};

/** How many levels between interstitial ads. Per CLAUDE.md: "Show
 *  after every 3rd completed level ONLY." */
export const INTERSTITIAL_EVERY_N_LEVELS = 3;

/** Whether the current platform supports ads at all. Web doesn't
 *  have the native AdMob module. */
export const ADS_SUPPORTED = Platform.OS === 'ios';
