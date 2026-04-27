/**
 * Meta SDK wrapper — install attribution + app-event logging.
 *
 * The SDK gives Meta what it needs to attribute installs from app-
 * install ads back to specific Meta campaigns, and to optimise
 * bidding against high-value events (purchases, subscriptions,
 * level milestones). Without these events firing, the ad algo can't
 * tell which audience members convert and burns budget on
 * non-payers.
 *
 * Same shape as `analytics.ts` (PostHog wrapper):
 *   - Lazy-required so the bundle still builds on web / dev where
 *     the native module isn't linked.
 *   - All public functions are best-effort: we never throw out of
 *     here, an analytics blip should never take the app down.
 *   - One-time init guard (`_initStarted`) so re-mounts of the root
 *     layout don't re-fire `setAdvertiserTrackingEnabled` repeatedly.
 *
 * Hook order (in app/_layout.tsx):
 *   1. ATT prompt resolves (initAdsAndTracking — adService.ts)
 *   2. initMetaSdk() — picks up the resolved tracking status and
 *      flips the SDK's collection flag accordingly. Apple's policy:
 *      no IDFA → no advertiser ID collection.
 */
import { Platform } from 'react-native';
import { log } from '@/src/lib/logger';

let _initStarted = false;

function getFb(): any {
  if (Platform.OS === 'web') return null;
  try {
    return require('react-native-fbsdk-next');
  } catch {
    // Module not linked yet (dev with no rebuild, or web). The rest
    // of the helpers will no-op cleanly.
    return null;
  }
}

/** Initialise the Meta SDK, sync ATT status, and fire the install/
 *  activate-app event. Idempotent. Safe to call early in app launch.
 *
 *  IMPORTANT: must be called AFTER initAdsAndTracking() in
 *  adService.ts so the ATT prompt has resolved — otherwise we'll
 *  flip the advertiser-tracking flag based on the still-undetermined
 *  status and Meta will receive no IDFA for the very first events.
 */
export async function initMetaSdk(): Promise<void> {
  if (_initStarted) return;
  _initStarted = true;
  if (Platform.OS === 'web') return;

  const fb = getFb();
  if (!fb) {
    log.warn('metaSdk', 'fbsdk module unavailable, skipping init');
    return;
  }

  try {
    const { Settings, AppEventsLogger } = fb;

    // Sync the ATT status so the SDK only collects IDFA when we
    // actually have the user's permission. iOS 14.5+ requires this.
    if (Platform.OS === 'ios') {
      try {
        const TT = require('expo-tracking-transparency');
        const { status } = await TT.getTrackingPermissionsAsync();
        const granted = status === 'granted';
        await Settings.setAdvertiserTrackingEnabled(granted);
        Settings.setAdvertiserIDCollectionEnabled(granted);
        Settings.setAutoLogAppEventsEnabled(false); // we log manually
      } catch (e) {
        log.warn('metaSdk', 'ATT sync failed (non-fatal)', { error: String(e) });
      }
    }

    // Required init call — also fires the implicit "activate app"
    // event Meta uses for retention attribution.
    if (typeof Settings.initializeSDK === 'function') {
      Settings.initializeSDK();
    }
    if (typeof AppEventsLogger?.activateApp === 'function') {
      AppEventsLogger.activateApp();
    }
    log.breadcrumb('metaSdk', 'initialized');
  } catch (e) {
    log.warn('metaSdk', 'init failed (non-fatal)', { error: String(e) });
  }
}

/** Fire a custom or standard event. Wraps AppEventsLogger.logEvent
 *  with the standard error-swallowing shape used elsewhere. */
function logEvent(name: string, valueOrParams?: number | Record<string, string | number>, params?: Record<string, string | number>): void {
  if (Platform.OS === 'web') return;
  const fb = getFb();
  if (!fb) return;
  try {
    const { AppEventsLogger } = fb;
    if (typeof valueOrParams === 'number') {
      AppEventsLogger.logEvent(name, valueOrParams, params ?? {});
    } else if (valueOrParams) {
      AppEventsLogger.logEvent(name, valueOrParams);
    } else {
      AppEventsLogger.logEvent(name);
    }
  } catch (e) {
    log.warn('metaSdk', `logEvent ${name} failed`, { error: String(e) });
  }
}

/** Standard purchase event. Pass the price + ISO currency from
 *  RevenueCat so Meta sees the actual amount paid in the user's
 *  region. productId is passed as a custom param so we can break
 *  down by product in Events Manager. */
export function logPurchase(amount: number, currency: string, productId: string): void {
  if (Platform.OS === 'web') return;
  const fb = getFb();
  if (!fb) return;
  try {
    const { AppEventsLogger } = fb;
    AppEventsLogger.logPurchase(amount, currency, { fb_content_id: productId });
    log.breadcrumb('metaSdk', 'purchase logged', { amount, currency, productId });
  } catch (e) {
    log.warn('metaSdk', 'logPurchase failed', { error: String(e) });
  }
}

/** Subscribe (Plus subscription started). Meta's standard event for
 *  subscription products — separate from purchase so the ad algo
 *  can optimise specifically for recurring revenue. */
export function logSubscribe(plan: 'monthly' | 'yearly', amount: number, currency: string): void {
  logEvent('Subscribe', amount, { fb_content_id: `plus_${plan}`, fb_currency: currency });
}

/** Standard registration event — fired once per account creation. */
export function logCompleteRegistration(method: 'apple' | 'google' | 'guest'): void {
  logEvent('fb_mobile_complete_registration', { fb_registration_method: method });
}

/** Tutorial completion. Fires when the player finishes onboarding. */
export function logTutorialCompletion(): void {
  logEvent('fb_mobile_tutorial_completion');
}

/** Level achieved milestone. Used at engagement signals (lvl 5) and
 *  high-intent signals (lvl 25). Both are configured as priority
 *  events in Meta Events Manager so SKAdNetwork attribution returns
 *  these specific levels. */
export function logLevelAchieved(level: number): void {
  logEvent('fb_mobile_level_achieved', { fb_level: level });
}

/** Add-to-cart fires when the player views the starter pack popup
 *  (whether they buy or not). Strong upper-funnel signal that
 *  partners well with the Purchase event in Meta's funnel reports. */
export function logAddToCart(productId: string): void {
  logEvent('fb_mobile_add_to_cart', { fb_content_id: productId });
}

/** Custom retention event — daily login streak hit a meaningful
 *  milestone. Meta uses these to build look-alike audiences of
 *  retained users. */
export function logRetentionMilestone(streakDays: number): void {
  logEvent('blanked_retention_streak', { fb_days: streakDays });
}
