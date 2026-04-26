import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '@/src/store';
import { log } from '@/src/lib/logger';

/** Number of gems granted by the comeback reward. Mirrors COMEBACK_GEMS
 *  in src/utils/notifications.ts so the push body and the modal show
 *  the same number. Kept duplicated rather than imported because the
 *  notifications module pulls in expo-notifications which we don't
 *  want loaded on app cold-start just to read a constant. */
export const COMEBACK_REWARD_GEMS = 15;

/** Days the player must have been away (no app open) before the
 *  comeback modal becomes eligible. Matches the day-7 win-back push so
 *  tapping that push naturally lands the user on a claimable modal. */
const COMEBACK_AWAY_DAYS = 7;

/** Cooldown between claims. Without this a player who churns + comes
 *  back every week could keep claiming. 14 days means it can fire at
 *  most ~26 times a year per device — generous but not exploitable. */
const COMEBACK_CLAIM_COOLDOWN_DAYS = 14;

/** AsyncStorage key for the last-claimed timestamp. Local-only — no
 *  cross-device sync. Cross-device exploits would require running the
 *  app on multiple devices simultaneously, which is a tiny edge case
 *  for a 15-gem reward. */
const STORAGE_KEY = 'blanked_last_comeback_claim_at';

/** True if the user qualifies for the comeback gem reward right now.
 *  Checks: (a) last play was 7+ days ago, (b) last claim was 14+ days
 *  ago (or never). */
export async function shouldShowComebackReward(): Promise<boolean> {
  try {
    const { lastPlayDate } = useGameStore.getState();
    if (!lastPlayDate) return false; // brand-new user, no comeback to make

    const lastPlay = new Date(lastPlayDate);
    const now = new Date();
    const daysSincePlay = Math.floor((now.getTime() - lastPlay.getTime()) / 86_400_000);
    if (daysSincePlay < COMEBACK_AWAY_DAYS) return false;

    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const lastClaim = new Date(raw);
      const daysSinceClaim = Math.floor((now.getTime() - lastClaim.getTime()) / 86_400_000);
      if (daysSinceClaim < COMEBACK_CLAIM_COOLDOWN_DAYS) return false;
    }
    return true;
  } catch (e) {
    log.warn('comebackReward', 'shouldShowComebackReward failed, defaulting to false', { error: String(e) });
    return false;
  }
}

/** Grant the gems + persist the claim timestamp. Idempotent — safe to
 *  call on a stale modal because the persisted timestamp gates future
 *  prompts via shouldShowComebackReward. */
export async function claimComebackReward(): Promise<void> {
  try {
    const store = useGameStore.getState();
    store.addGems(COMEBACK_REWARD_GEMS);
    await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
    log.breadcrumb('comebackReward', 'claimed', { gems: COMEBACK_REWARD_GEMS });
  } catch (e) {
    log.error('comebackReward', 'claimComebackReward failed', e);
  }
}
