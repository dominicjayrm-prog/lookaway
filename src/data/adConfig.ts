/**
 * AdMob configuration — centralised ad unit IDs and placement rules.
 *
 * Placement strategy (brainstormed with the user):
 *
 *   INTERSTITIALS — "every 5 + world completion + guardrails"
 *    - After every 5th completed level
 *    - After completing a world (always, resets the 5-level counter)
 *    - First 5 levels ever played are ad-free (onboarding grace)
 *    - Max 3 interstitials per session (resets on app restart / bg)
 *    - Never on fail, never on daily challenge
 *    - adsRemoved / subscribers skip silently
 *
 *   REWARDED — always opt-in
 *    - Watch ad for 1 free life (Out of Lives modal)
 *    - Watch ad to unlock a common cosmetic (shop tab)
 *    - Available even with adsRemoved (user's choice to watch)
 *    - Subscribers bypass (reward granted without watching)
 *    - Daily 5-watch limit
 *
 *   BANNERS — removed by design decision
 *    - "They look ugly asf" — user's words
 *    - Monetisation is strong enough via IAP + subs + interstitials
 *
 * Test vs production IDs:
 *   AdMob production ad units take 24-48 hours to start serving on a
 *   new app, and fill rate is near-zero for the first week or two
 *   (Google's ad network needs traffic history before auctioning
 *   ads). During TestFlight this means real ads almost NEVER fill
 *   and testers see no interstitials at all.
 *
 *   Google publishes always-filling TEST ad unit IDs that serve
 *   placeholder "Test Ad" creatives on-demand — perfect for
 *   verifying the code path works end-to-end.
 *
 *   `USE_TEST_ADS` switches between them. Set to `false` before
 *   App Store submission. The test IDs are safe to leave compiled
 *   in — they're Google's own public constants, not our account.
 */

import { Platform } from 'react-native';

// ─── Toggle ─────────────────────────────────────────────────────────
//
// FLIP TO `false` BEFORE SUBMITTING TO APP STORE — otherwise testers
// see "Test Ad" creatives and production users earn no revenue.
// During TestFlight + internal testing, leave `true` so ads actually
// fill and the pipeline is observable.
export const USE_TEST_ADS = false;

// ─── Ad unit IDs ───────────────────────────────────────────────────
//
// AdMob uses separate ad unit IDs per platform even for the same
// "purpose" (an iOS interstitial and an Android interstitial are
// registered as distinct units in the AdMob dashboard). Google's
// test IDs follow the same rule — iOS and Android have different
// always-filling test units.

// Google's always-filling test IDs. Docs:
// https://developers.google.com/admob/ios/test-ads
// https://developers.google.com/admob/android/test-ads
const TEST_IDS_IOS = {
  INTERSTITIAL: 'ca-app-pub-3940256099942544/4411468910',
  REWARDED: 'ca-app-pub-3940256099942544/1712485313',
};
const TEST_IDS_ANDROID = {
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
};

// Real production ad unit IDs from the Blanked AdMob account.
const PRODUCTION_IDS_IOS = {
  INTERSTITIAL: 'ca-app-pub-9228812020612351/4576685235',
  REWARDED: 'ca-app-pub-9228812020612351/9386158787',
};
// Real Android unit IDs from AdMob Console. Registered against the
// Blanked Android app (AdMob app ID ca-app-pub-9228812020612351
// ~4594272197, see app.json). AdMob's fill rate for brand-new
// apps is near-zero for the first 1-2 weeks, so expect "no ad
// available" responses until Google builds traffic history — the
// `USE_TEST_ADS` toggle above remains the fastest way to confirm
// the pipeline works during Internal Testing.
const PRODUCTION_IDS_ANDROID = {
  INTERSTITIAL: 'ca-app-pub-9228812020612351/5177573588',
  REWARDED: 'ca-app-pub-9228812020612351/2954734922',
};

function pickAdUnitIds(): { INTERSTITIAL: string; REWARDED: string } {
  if (Platform.OS === 'android') {
    return USE_TEST_ADS ? TEST_IDS_ANDROID : PRODUCTION_IDS_ANDROID;
  }
  // iOS (and web fallback — ADS_SUPPORTED gates web separately so
  // the fallback value is harmless there).
  return USE_TEST_ADS ? TEST_IDS_IOS : PRODUCTION_IDS_IOS;
}

export const AD_UNIT_IDS = pickAdUnitIds();

// ─── Placement rules ───────────────────────────────────────────────

/** How many COMPLETED levels between interstitial ads. */
export const INTERSTITIAL_EVERY_N_LEVELS = 5;

/** New players get this many levels ad-free before the first
 *  interstitial can fire. Prevents scaring off onboarding users. */
export const INTERSTITIAL_GRACE_LEVELS = 5;

/** Maximum interstitials per continuous session. Resets when the app
 *  is backgrounded for > 5 minutes or restarted. Prevents power
 *  users who play 30+ levels in a row from getting hammered. */
export const INTERSTITIAL_SESSION_CAP = 3;

/** Whether the current platform supports ads at all. Web doesn't
 *  have the native AdMob module. iOS + Android both do. */
export const ADS_SUPPORTED = Platform.OS !== 'web';
