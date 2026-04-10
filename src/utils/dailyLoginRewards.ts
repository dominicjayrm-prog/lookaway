/**
 * Daily Login Rewards — 7-day cycle
 * Each day gives increasing rewards. Missing a day resets to Day 1.
 *
 * State lives in the Zustand game store (and syncs to Supabase like everything
 * else) so the streak follows the player across devices. This module is now
 * pure: it derives the next reward from a passed-in state snapshot.
 */
import { FRAMES, BANNERS, EXPRESSIONS } from '@/src/data/cosmetics';

/**
 * Pick a random cosmetic from the appropriate pool, excluding already-owned items.
 * Returns the cosmetic ID, or null if all are owned (fallback to gems).
 */
function pickRandomCosmetic(cosmeticType: 'frame' | 'banner' | 'expression', ownedIds: string[]): string | null {
  const pool = cosmeticType === 'frame' ? FRAMES
    : cosmeticType === 'banner' ? BANNERS
    : EXPRESSIONS;
  const candidates = pool.filter(c =>
    (c.rarity === 'common' || c.rarity === 'rare') &&
    c.unlock !== 'subscriber' &&
    c.unlock !== 'free' &&          // Exclude free defaults (player already has them)
    !ownedIds.includes(c.id),
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

var REWARDS = [
  { day: 1, type: 'gems' as const, amount: 5, label: '5 gems', icon: '\uD83D\uDC8E' },
  { day: 2, type: 'cosmetic' as const, amount: 1, cosmeticType: 'banner' as const, label: 'Random Banner', icon: '\uD83C\uDFA8' },
  { day: 3, type: 'gems' as const, amount: 10, label: '10 gems', icon: '\uD83D\uDC8E' },
  { day: 4, type: 'cosmetic' as const, amount: 1, cosmeticType: 'expression' as const, label: 'Random Expression', icon: '\uD83D\uDE0A' },
  { day: 5, type: 'gems' as const, amount: 15, label: '15 gems', icon: '\uD83D\uDC8E' },
  { day: 6, type: 'cosmetic' as const, amount: 1, cosmeticType: 'frame' as const, label: 'Random Frame', icon: '\uD83D\uDDBC\uFE0F' },
  { day: 7, type: 'gems' as const, amount: 25, label: '25 gems + mystery', icon: '\uD83C\uDF81' },
];

export interface LoginRewardState {
  currentDay: number;       // 1-7, the day of the LAST claimed reward
  lastClaimDate: string;    // YYYY-MM-DD of the last claim
  streak: number;           // consecutive-day login streak
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Given a store snapshot, figure out whether a reward is available and what day it is.
 */
function checkDailyReward(state: LoginRewardState): {
  available: boolean;
  currentDay: number;
  reward: typeof REWARDS[number];
  streak: number;
} {
  var today = getTodayStr();

  // Already claimed today
  if (state.lastClaimDate === today) {
    return { available: false, currentDay: state.currentDay, reward: REWARDS[state.currentDay - 1], streak: state.streak };
  }

  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.toISOString().split('T')[0];

  var nextDay: number;
  var nextStreak: number;
  if (state.lastClaimDate === yesterdayStr) {
    // Consecutive — advance to next day (cycle back to 1 after 7)
    nextDay = state.currentDay >= 7 ? 1 : state.currentDay + 1;
    nextStreak = state.streak + 1;
  } else if (state.lastClaimDate === '') {
    // First ever login
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

/**
 * Compute the next LoginRewardState after claiming today's reward.
 * Caller is responsible for actually persisting the new state.
 */
function advanceLoginReward(state: LoginRewardState): LoginRewardState {
  var check = checkDailyReward(state);
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

var INITIAL_LOGIN_REWARD_STATE: LoginRewardState = { currentDay: 0, lastClaimDate: '', streak: 0 };

export { REWARDS, checkDailyReward, advanceLoginReward, pickCosmeticReward, INITIAL_LOGIN_REWARD_STATE };
