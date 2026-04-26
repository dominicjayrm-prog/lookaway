/**
 * Daily Login Rewards — 30-day cycle
 *
 * Days 1-7: light gems, common cosmetics, first power-up taste
 * Day 7:    🌟 LEGENDARY cosmetic + 25 gems  (the player's first big payout)
 * Days 8-13: more gems + cosmetics + power-ups
 * Day 14:   🌟 LEGENDARY cosmetic + 30 gems
 * Days 15-29: bigger gem amounts, multi-power-up grants, more cosmetics
 * Day 30:   🌟 LEGENDARY cosmetic + 50 gems  (the "you've shown up for a month" reward)
 *
 * After day 30 the cycle restarts at day 1 — keeps engagement going for
 * heavy returners.
 *
 * Missing a day still resets to Day 1 (no leniency by design — a streak
 * means a STREAK).
 *
 * State lives in the Zustand game store (and syncs to Supabase like
 * everything else) so progress follows the player across devices.
 * This module is pure: it derives the next reward from a passed-in
 * state snapshot.
 */
import { FRAMES, BANNERS, EXPRESSIONS } from '@/src/data/cosmetics';
import { ALL_POWERUPS } from '@/src/data/powerUps';

/** Total cycle length. */
export const REWARD_CYCLE_DAYS = 30;

/** Pick a random cosmetic from the appropriate pool, excluding
 *  already-owned items. Restricts to common+rare so we don't
 *  accidentally hand out legendaries that the legendary-day slots
 *  should be reserving. */
function pickRandomCosmetic(cosmeticType: 'frame' | 'banner' | 'expression', ownedIds: string[]): string | null {
  const pool = cosmeticType === 'frame' ? FRAMES
    : cosmeticType === 'banner' ? BANNERS
    : EXPRESSIONS;
  const candidates = pool.filter(c =>
    (c.rarity === 'common' || c.rarity === 'rare') &&
    c.unlock !== 'subscriber' &&
    c.unlock !== 'free' &&
    !ownedIds.includes(c.id),
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

/** Pick a random LEGENDARY cosmetic the player doesn't own. Pulls from
 *  all three pools (frames, banners, expressions) so the player might
 *  get any rare drop. Excludes subscriber-locked + seasonal/achievement
 *  unlocks since those have their own fulfilment paths. */
function pickRandomLegendary(ownedIds: string[]): string | null {
  const pools = [FRAMES, BANNERS, EXPRESSIONS];
  const candidates = pools.flat().filter(c =>
    c.rarity === 'legendary' &&
    c.unlock !== 'subscriber' &&
    c.unlock !== 'achievement' &&
    c.unlock !== 'seasonal' &&
    !ownedIds.includes(c.id),
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

/** Pick a random power-up from any mode. Returns the power-up id. The
 *  caller passes the qty to grant. */
function pickRandomPowerUpId(): string {
  return ALL_POWERUPS[Math.floor(Math.random() * ALL_POWERUPS.length)].id;
}

export type RewardEntry = {
  day: number;
  label: string;
  icon: string;
} & (
  | { type: 'gems'; amount: number }
  | { type: 'cosmetic'; cosmeticType: 'frame' | 'banner' | 'expression' }
  | { type: 'legendary'; bonusGems: number }
  | { type: 'powerup'; qty: number }
);

const REWARDS: RewardEntry[] = [
  // ── Week 1 — first impressions, build the habit ──
  { day: 1, type: 'gems', amount: 5, label: '5 gems', icon: '💎' },
  { day: 2, type: 'cosmetic', cosmeticType: 'banner', label: 'Random Banner', icon: '🎨' },
  { day: 3, type: 'gems', amount: 10, label: '10 gems', icon: '💎' },
  { day: 4, type: 'cosmetic', cosmeticType: 'expression', label: 'Random Expression', icon: '😊' },
  { day: 5, type: 'powerup', qty: 1, label: 'Random Power-Up', icon: '⚡' },
  { day: 6, type: 'cosmetic', cosmeticType: 'frame', label: 'Random Frame', icon: '🖼️' },
  { day: 7, type: 'legendary', bonusGems: 25, label: 'Legendary + 25 gems', icon: '🌟' },

  // ── Week 2 — bigger gem drops, more power-ups ──
  { day: 8, type: 'gems', amount: 15, label: '15 gems', icon: '💎' },
  { day: 9, type: 'powerup', qty: 2, label: '2 Random Power-Ups', icon: '⚡' },
  { day: 10, type: 'cosmetic', cosmeticType: 'banner', label: 'Random Banner', icon: '🎨' },
  { day: 11, type: 'gems', amount: 20, label: '20 gems', icon: '💎' },
  { day: 12, type: 'cosmetic', cosmeticType: 'expression', label: 'Random Expression', icon: '😊' },
  { day: 13, type: 'powerup', qty: 2, label: '2 Random Power-Ups', icon: '⚡' },
  { day: 14, type: 'legendary', bonusGems: 30, label: 'Legendary + 30 gems', icon: '🌟' },

  // ── Week 3 — heavier rewards, mix of everything ──
  { day: 15, type: 'gems', amount: 25, label: '25 gems', icon: '💎' },
  { day: 16, type: 'powerup', qty: 3, label: '3 Random Power-Ups', icon: '⚡' },
  { day: 17, type: 'cosmetic', cosmeticType: 'frame', label: 'Random Frame', icon: '🖼️' },
  { day: 18, type: 'gems', amount: 30, label: '30 gems', icon: '💎' },
  { day: 19, type: 'cosmetic', cosmeticType: 'expression', label: 'Random Expression', icon: '😊' },
  { day: 20, type: 'powerup', qty: 3, label: '3 Random Power-Ups', icon: '⚡' },
  { day: 21, type: 'gems', amount: 35, label: '35 gems', icon: '💎' },

  // ── Week 4 — runway to the day-30 grand reward ──
  { day: 22, type: 'cosmetic', cosmeticType: 'banner', label: 'Random Banner', icon: '🎨' },
  { day: 23, type: 'gems', amount: 30, label: '30 gems', icon: '💎' },
  { day: 24, type: 'powerup', qty: 3, label: '3 Random Power-Ups', icon: '⚡' },
  { day: 25, type: 'cosmetic', cosmeticType: 'frame', label: 'Random Frame', icon: '🖼️' },
  { day: 26, type: 'gems', amount: 40, label: '40 gems', icon: '💎' },
  { day: 27, type: 'powerup', qty: 3, label: '3 Random Power-Ups', icon: '⚡' },
  { day: 28, type: 'cosmetic', cosmeticType: 'expression', label: 'Random Expression', icon: '😊' },
  { day: 29, type: 'gems', amount: 40, label: '40 gems', icon: '💎' },

  // ── Day 30 — grand finale ──
  { day: 30, type: 'legendary', bonusGems: 50, label: 'LEGENDARY + 50 gems', icon: '🎁' },
];

export interface LoginRewardState {
  currentDay: number;       // 1-30, the day of the LAST claimed reward
  lastClaimDate: string;    // YYYY-MM-DD of the last claim
  streak: number;           // consecutive-day login streak
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Given a store snapshot, figure out whether a reward is available
 * and what day it is.
 */
function checkDailyReward(state: LoginRewardState): {
  available: boolean;
  currentDay: number;
  reward: RewardEntry;
  streak: number;
} {
  const today = getTodayStr();

  // Already claimed today
  if (state.lastClaimDate === today) {
    return {
      available: false,
      currentDay: state.currentDay,
      reward: REWARDS[Math.max(0, state.currentDay - 1)],
      streak: state.streak,
    };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let nextDay: number;
  let nextStreak: number;
  if (state.lastClaimDate === yesterdayStr) {
    // Consecutive — advance to next day, cycle back to 1 after 30
    nextDay = state.currentDay >= REWARD_CYCLE_DAYS ? 1 : state.currentDay + 1;
    nextStreak = state.streak + 1;
  } else if (state.lastClaimDate === '') {
    nextDay = 1;
    nextStreak = 1;
  } else {
    // Streak broken — reset to day 1
    nextDay = 1;
    nextStreak = 1;
  }

  return {
    available: true,
    currentDay: nextDay,
    reward: REWARDS[nextDay - 1],
    streak: nextStreak,
  };
}

/** Compute the next LoginRewardState after claiming today's reward.
 *  Caller is responsible for actually persisting the new state. */
function advanceLoginReward(state: LoginRewardState): LoginRewardState {
  const check = checkDailyReward(state);
  if (!check.available) return state;
  return {
    currentDay: check.currentDay,
    lastClaimDate: getTodayStr(),
    streak: check.streak,
  };
}

function pickCosmeticReward(cosmeticType: 'frame' | 'banner' | 'expression', ownedIds: string[]): string | null {
  return pickRandomCosmetic(cosmeticType, ownedIds);
}

const INITIAL_LOGIN_REWARD_STATE: LoginRewardState = { currentDay: 0, lastClaimDate: '', streak: 0 };

export {
  REWARDS,
  checkDailyReward,
  advanceLoginReward,
  pickCosmeticReward,
  pickRandomLegendary,
  pickRandomPowerUpId,
  INITIAL_LOGIN_REWARD_STATE,
};
