/**
 * Meta (Facebook) App Events wrapper.
 *
 * Wraps `react-native-fbsdk-next`'s Settings + AppEventsLogger so the
 * rest of the app can fire Meta events without importing the SDK
 * directly. Two reasons we need a wrapper:
 *
 *   1. The SDK is iOS/Android-only. Importing it on web (where the
 *      app also runs via expo-router) crashes the bundler. We use
 *      lazy require() guarded by Platform.OS checks so web builds
 *      stay clean.
 *
 *   2. Every call is wrapped in try/catch. The Meta SDK has been
 *      known to throw on cold-start race conditions — we don't want
 *      a tracking error to take down the player's session, ever.
 *
 * Initialisation flow (`initializeMetaSdk`, called from
 * `app/_layout.tsx` after ATT prompt resolves):
 *
 *   - If ATT granted → call Settings.setAdvertiserTrackingEnabled(true)
 *     so Meta can use IDFA for attribution.
 *   - If ATT denied / not_determined → leave at false. The SDK still
 *     fires events, but Apple routes them through SKAdNetwork
 *     (privacy-preserving aggregate attribution) rather than IDFA.
 *
 * Either path works for ad campaigns — IDFA-granted users give Meta
 * deterministic per-install attribution, opt-out users still produce
 * the SKAdNetwork postbacks that Apple aggregates.
 */
import { Platform } from 'react-native';
import { log } from './logger';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Lazy-loaded SDK module references. We only require() the package on
// native platforms; web builds skip it entirely.
let Settings: any = null;
let AppEventsLogger: any = null;

function loadSdk(): boolean {
  if (!isNative) return false;
  if (Settings && AppEventsLogger) return true;
  try {
    const mod = require('react-native-fbsdk-next');
    Settings = mod.Settings;
    AppEventsLogger = mod.AppEventsLogger;
    return Boolean(Settings && AppEventsLogger);
  } catch (e) {
    log.warn('meta', 'fbsdk-next not available', { error: String(e) });
    return false;
  }
}

/** Call once on app start, AFTER the ATT prompt has resolved (i.e.
 *  after `initAdsAndTracking` from adService.ts has finished — that
 *  function shows the ATT dialog if needed). The SDK's
 *  `isAutoInitEnabled: true` config in app.json means it's already
 *  initialised by the time we get here; this call is purely to flip
 *  the IDFA/advertiserID flag based on whatever ATT outcome the user
 *  ended up with.
 *
 *  We re-read ATT status here rather than threading it through from
 *  adService so the two init paths stay decoupled (adService is
 *  AdMob-only, this is Meta-only — neither should depend on the
 *  other's internals). */
export async function initializeMetaSdk(): Promise<void> {
  if (!loadSdk()) return;
  let attGranted = false;
  try {
    const TT = require('expo-tracking-transparency');
    const { status } = await TT.getTrackingPermissionsAsync();
    attGranted = status === 'granted';
  } catch (e) {
    log.warn('meta', 'ATT status read failed — defaulting to non-tracking', { error: String(e) });
  }
  try {
    Settings.setAdvertiserTrackingEnabled(attGranted);
    // Auto-app-events covers install + session + active-app for free.
    // Explicit toggle here in case a future config flip surprises us.
    Settings.setAutoLogAppEventsEnabled(true);
  } catch (e) {
    log.warn('meta', 'initializeMetaSdk failed', { error: String(e) });
  }
}

/** Player completed sign-up — fired right after Apple Sign In returns
 *  successfully and we have a Supabase user. Meta uses this as an
 *  early-funnel signal: real users vs. install-and-bounce. */
export function logSignupComplete(): void {
  if (!loadSdk()) return;
  try {
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.CompletedRegistration);
  } catch (e) {
    log.warn('meta', 'logSignupComplete failed', { error: String(e) });
  }
}

/** Player finished the 3-round onboarding memory test. Filters out
 *  installs that opened the app once and never engaged. */
export function logTutorialDone(): void {
  if (!loadSdk()) return;
  try {
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.CompletedTutorial);
  } catch (e) {
    log.warn('meta', 'logTutorialDone failed', { error: String(e) });
  }
}

/** Player cleared a meaningful level. We only fire on the milestones
 *  Meta cares about (5 and 25) — firing on every level would be noise.
 *  Level 5 is the early-retention proxy; level 25 is the starter-pack
 *  trigger and a strong signal of long-term engagement. */
export function logLevelAchieved(level: number): void {
  if (!loadSdk()) return;
  try {
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.AchievedLevel, {
      [AppEventsLogger.AppEventParams.Level]: String(level),
    });
  } catch (e) {
    log.warn('meta', 'logLevelAchieved failed', { error: String(e), level });
  }
}

/** Player completed a subscription purchase (monthly or yearly). Pass
 *  the local-currency price + currency code from the RevenueCat
 *  package so Meta can build value-based audiences (LTV / lookalikes
 *  of high-value subscribers). */
export function logSubscribe(amount: number, currency: string, plan: 'monthly' | 'yearly'): void {
  if (!loadSdk()) return;
  try {
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.Subscribe, amount, {
      [AppEventsLogger.AppEventParams.Currency]: currency,
      fb_plan: plan,
    });
  } catch (e) {
    log.warn('meta', 'logSubscribe failed', { error: String(e), amount, currency, plan });
  }
}

/** Player completed an in-app purchase (gem pack). The purchaseAmount
 *  + currency parameters are required by Meta — they go into the
 *  Purchase event Meta uses for value-based optimisation. */
export function logPurchase(amount: number, currency: string, productId: string): void {
  if (!loadSdk()) return;
  try {
    AppEventsLogger.logPurchase(amount, currency, { fb_product_id: productId });
  } catch (e) {
    log.warn('meta', 'logPurchase failed', { error: String(e), amount, currency, productId });
  }
}
