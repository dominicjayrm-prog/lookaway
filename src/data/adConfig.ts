/**
 * AdMob configuration — centralised ad unit IDs and placement rules.
 *
 * Placement strategy (brainstormed with the user):
 *
 *   INTERSTITIALS — "every 5 + world completion + guardrails"
 *     - After every 5th completed level
 *     - After completing a world (always, resets the 5-level counter)
 *     - First 5 levels ever played are ad-free (onboarding grace)
 *     - Max 3 interstitials per session (resets on app restart / bg)
 *     - Never on fail, never on daily challenge
 *     - adsRemoved / subscribers skip silently
 *
 *   REWARDED — always opt-in
 *     - Watch ad for 1 free life (Out of Lives modal)
 *     - Watch ad to unlock a common cosmetic (shop tab)
 *     - Available even with adsRemoved (user's choice to watch)
 *     - Subscribers bypass (reward granted without watching)
 *     - Daily 5-watch limit
 *
 *   BANNERS — removed by design decision
 *     - "They look ugly asf" — user's words
 *     - Monetisation is strong enough via IAP + subs + interstitials
 *
 * To swap ad unit IDs: update the PRODUCTION_IDS below. The App ID
 * lives in app.json → plugins → react-native-google-mobile-ads →
 * iosAppId and requires a rebuild to take effect.
 */

import { Platform } from 'react-native';

// ─── Real production ad unit IDs ───────────────────────────────────

export const AD_UNIT_IDS = {
  INTERSTITIAL: 'ca-app-pub-9228812020612351/4576685235',
  REWARDED: 'ca-app-pub-9228812020612351/9386158787',
};

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
 *  have the native AdMob module. */
export const ADS_SUPPORTED = Platform.OS === 'ios';
