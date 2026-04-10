/**
 * Rewarded ad service — stubbed for now, swappable for a real AdMob
 * integration later (`react-native-google-mobile-ads`).
 *
 * The public surface is:
 *
 *   showRewardedAd(): Promise<AdResult>
 *
 * which resolves to `{ granted: true }` if the player successfully
 * watches the ad to completion, or `{ granted: false, reason }` if
 * the ad is unavailable / dismissed / rate-limited / the current
 * user is a Blanked+ subscriber who doesn't need to see ads.
 *
 * Callers should NEVER unlock the rewarded item before this promise
 * resolves with `granted: true` — that's the whole point of the
 * EARNED_REWARD event on a real rewarded ad.
 *
 * Subscribers bypass this entirely: `showRewardedAd` returns
 * `{ granted: true, bypass: 'subscriber' }` immediately so the UI
 * can present them with a "Claim free" flow instead of "Watch ad".
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '@/src/store';

export type AdFailureReason =
  | 'limit_reached'    // Daily 5-ad limit hit
  | 'unavailable'      // Ad network didn't load anything
  | 'dismissed'        // User closed the ad before earning reward
  | 'error';           // Unknown network / SDK error

export interface AdResult {
  granted: boolean;
  reason?: AdFailureReason;
  /** When `bypass` is set, the reward was granted without actually
   *  running the ad (e.g. subscribers). Useful for analytics so we
   *  know how many "ad" unlocks were really ad plays vs. bypasses. */
  bypass?: 'subscriber';
}

const DAILY_LIMIT = 5;
const STORAGE_KEY = 'blanked_ads_watched';

interface AdDayCounter {
  date: string;   // YYYY-MM-DD UTC
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

/** How many rewarded ads the player has left today. Used by the
 *  shop UI to show "X left today" or hide the Watch-Ad CTA when
 *  the limit's been hit. */
export async function getRemainingAdWatches(): Promise<number> {
  const counter = await loadCounter();
  return Math.max(0, DAILY_LIMIT - counter.count);
}

/**
 * Show a rewarded ad. Returns a promise that resolves when the ad
 * flow is complete (or rejected up front by subscriber bypass /
 * rate limit).
 *
 * TODO: Replace the simulated delay with a real
 * `RewardedAd.createForAdRequest(adUnitId)` load/show from
 * `react-native-google-mobile-ads` once the SDK is linked. The
 * real event flow is: load() → show() → listen for
 * RewardedAdEventType.EARNED_REWARD (resolve granted:true) →
 * RewardedAdEventType.CLOSED (if no EARNED_REWARD fired, resolve
 * granted:false, reason:'dismissed').
 */
export async function showRewardedAd(): Promise<AdResult> {
  // Subscribers skip the whole flow.
  try {
    if (useGameStore.getState().isSubscribed()) {
      return { granted: true, bypass: 'subscriber' };
    }
  } catch {}

  // Daily limit check
  const counter = await loadCounter();
  if (counter.count >= DAILY_LIMIT) {
    return { granted: false, reason: 'limit_reached' };
  }

  // ── STUB IMPLEMENTATION ──
  // Simulate the rewarded-ad experience with a short delay so the UI
  // has something to show during "loading ad". Real SDK call goes
  // here — for now we treat every attempt as a success since there's
  // no ad network yet.
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Persist the increment so the 5-per-day ceiling sticks across
  // restarts.
  await saveCounter({ date: counter.date, count: counter.count + 1 });
  return { granted: true };
}
