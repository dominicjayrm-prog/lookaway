/**
 * Value-gated paywall scheduling.
 *
 * Replaces the post-signup auto-paywall (which fired 600ms after a
 * brand-new user's first home render — before they had played a
 * single level, and which production data showed was the churn point
 * for 58% of installs). The rule now:
 *
 *   The paywall auto-shows only AFTER the player has experienced
 *   real value — their first 3-star level OR completing ladder
 *   position 5 — and at most twice, ever, with at least 72 hours
 *   between shows. The second show additionally requires the player
 *   to have kept progressing (position ≥ 11), so a churned player is
 *   never greeted back by a sales screen.
 *
 * Manual entry points (settings, shop, out-of-lives Blanked+ button)
 * are unaffected — those are user-initiated and stay unlimited.
 *
 * All state is per-user in AsyncStorage. Deliberately not synced to
 * the profile: worst case on a new device is one extra (still
 * value-gated) show, which beats adding a column + sync round-trip
 * for a cosmetic dedupe.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from '@/src/lib/analytics';

const SHOWN_COUNT_KEY = (userId: string) => `blanked_paywall_auto_count_${userId}`;
const LAST_SHOWN_KEY = (userId: string) => `blanked_paywall_auto_last_${userId}`;

const MAX_AUTO_SHOWS = 2;
const COOLDOWN_MS = 72 * 60 * 60 * 1000; // 72h between auto-shows

export interface PaywallGateInput {
  userId: string;
  /** Current unified ladder position (1-based; 1 = nothing completed). */
  unifiedPosition: number;
  /** True when the player has earned 3 stars on at least one level. */
  hasThreeStarLevel: boolean;
  /** True when the player already has an active subscription. */
  isSubscribed: boolean;
}

/** Decide whether the paywall should auto-show right now. Callers
 *  (the home tab) invoke this on focus / progress changes; when it
 *  returns true the caller is expected to actually present the
 *  paywall — this function has already recorded the show. */
export async function shouldAutoShowPaywall(input: PaywallGateInput): Promise<boolean> {
  const { userId, unifiedPosition, hasThreeStarLevel, isSubscribed } = input;
  if (!userId || isSubscribed) return false;

  // Value gate: the player must have FELT the game before we sell.
  // Position 6 means positions 1-5 are completed.
  const firstValueMoment = hasThreeStarLevel || unifiedPosition >= 6;
  if (!firstValueMoment) return false;

  let shownCount = 0;
  let lastShownAt = 0;
  try {
    const [count, last] = await Promise.all([
      AsyncStorage.getItem(SHOWN_COUNT_KEY(userId)),
      AsyncStorage.getItem(LAST_SHOWN_KEY(userId)),
    ]);
    shownCount = count ? parseInt(count, 10) || 0 : 0;
    lastShownAt = last ? parseInt(last, 10) || 0 : 0;
  } catch {
    // Storage unreadable — err on the side of NOT showing. A missed
    // paywall costs a conversion opportunity; a repeated one costs
    // trust, which is worth more.
    return false;
  }

  if (shownCount >= MAX_AUTO_SHOWS) return false;
  if (lastShownAt && Date.now() - lastShownAt < COOLDOWN_MS) return false;
  // Second show needs continued engagement beyond the first gate —
  // don't re-pitch someone who stalled right after the first ask.
  if (shownCount === 1 && unifiedPosition < 11) return false;

  try {
    await Promise.all([
      AsyncStorage.setItem(SHOWN_COUNT_KEY(userId), String(shownCount + 1)),
      AsyncStorage.setItem(LAST_SHOWN_KEY(userId), String(Date.now())),
    ]);
  } catch {}

  track('paywall_auto_shown', {
    show_number: shownCount + 1,
    unified_position: unifiedPosition,
    trigger: hasThreeStarLevel ? 'three_star' : 'position_5',
  });
  return true;
}
