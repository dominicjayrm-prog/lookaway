/**
 * PostHog analytics wrapper.
 *
 * Thin indirection over posthog-react-native so the rest of the app
 * calls `track('level_started', { levelId })` without ever importing
 * the SDK directly. Benefits:
 *
 *   - Graceful no-op when `EXPO_PUBLIC_POSTHOG_API_KEY` isn't set. The
 *     app still builds and runs locally without an analytics key —
 *     useful for CI, pull-request previews, and any contributor who
 *     doesn't want to register for a PostHog account just to build.
 *
 *   - Single place to add prefix / enrichment (we force every event
 *     name to snake_case and prepend `blanked_` so queries in the
 *     PostHog dashboard are consistent).
 *
 *   - Easy kill switch — flip one constant to silence all analytics
 *     in an emergency.
 *
 * Privacy / Apple guideline notes:
 *   - We NEVER pass IDFA. PostHog's default device id is a random UUID
 *     per install and is not considered "tracking" under Apple's ATT
 *     definition (no cross-app correlation).
 *   - `identify()` is only called AFTER the user signs in, so pre-auth
 *     opens don't get attached to a user row.
 *   - No PII (email, username, avatar URL) is ever sent as a property.
 *     Only the Supabase auth UUID ties sessions to a user row, and that
 *     UUID is already the primary key the app uses internally.
 */
import { PostHog } from 'posthog-react-native';

// Env-driven so the key isn't committed to git. Set in .env locally
// and in eas.json's `env` block for TestFlight / production builds.
const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
// EU Cloud host. If we ever move to self-hosted or US Cloud, change
// this ONE value — every `posthog.capture()` call through the app
// keeps working.
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

// Cached singleton. Only constructed once, lazily on the first call.
let _client: PostHog | null = null;
let _disabled = !API_KEY;

/** Initialise the PostHog client. Safe to call multiple times — only
 *  the first call constructs the SDK. No-op when the API key isn't
 *  configured (local dev, CI, preview builds). */
export async function initAnalytics(): Promise<void> {
  if (_client || _disabled) return;
  try {
    _client = new PostHog(API_KEY, {
      host: HOST,
      // Capture app lifecycle events automatically — installs,
      // updates, foreground/background transitions, screen views.
      // Gives us session-level signal without any manual wiring.
      captureAppLifecycleEvents: true,
      // Batch and flush on a timer rather than per-event — cheaper
      // on battery + network. 30s flush is the SDK default and
      // fine for our volume.
      flushInterval: 30,
    });
    await _client.ready();
  } catch (e) {
    _disabled = true;
    // Swallow — analytics must never take down the app.
    if (__DEV__) console.warn('[analytics] init failed, disabling:', e);
  }
}

/** Tie every subsequent event to a user row. Call this the moment
 *  we have a Supabase user id (after sign-in / sign-up / session
 *  restore on app open). Safe to call with the same id on every
 *  open — PostHog dedupes. */
export function identify(userId: string | null | undefined, properties?: Record<string, string | number | boolean | null>): void {
  if (_disabled || !_client || !userId) return;
  try { _client.identify(userId, properties); } catch {}
}

/** Emit a product event. Event names are normalised to snake_case
 *  and prefixed with `blanked_` so they sort together in the
 *  PostHog event browser. Properties are passed through verbatim —
 *  keep them flat (no nested objects) and avoid PII. */
export function track(event: string, properties?: Record<string, string | number | boolean | null>): void {
  if (_disabled || !_client) return;
  const normalised = `blanked_${event.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase()).replace(/^_/, '')}`;
  try { _client.capture(normalised, properties); } catch {}
}

/** Clear the identified user — call on sign-out so the next anonymous
 *  session doesn't leak into the previous user's timeline. */
export function resetAnalytics(): void {
  if (_disabled || !_client) return;
  try { _client.reset(); } catch {}
}

/** Canonical event names — use these constants rather than raw
 *  strings so a typo becomes a compile error instead of a silently
 *  misnamed event polluting the dashboard. */
export const EVENTS = {
  // Onboarding
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  // Campaign
  LEVEL_STARTED: 'level_started',
  LEVEL_COMPLETED: 'level_completed',
  LEVEL_FAILED: 'level_failed',
  // Daily challenge
  DAILY_CHALLENGE_STARTED: 'daily_challenge_started',
  DAILY_CHALLENGE_COMPLETED: 'daily_challenge_completed',
  // Monetisation
  PAYWALL_SHOWN: 'paywall_shown',
  PAYWALL_DISMISSED: 'paywall_dismissed',
  SUBSCRIPTION_PURCHASED: 'subscription_purchased',
  // Lives / friction
  OUT_OF_LIVES_SHOWN: 'out_of_lives_shown',
  OUT_OF_LIVES_ACTION: 'out_of_lives_action',
} as const;
