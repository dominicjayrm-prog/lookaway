/**
 * Daily Login Rewards — 7-day cycle
 * Each day gives increasing rewards. Missing a day resets to Day 1.
 * Uses localStorage on web (same as game store) for persistence reliability.
 * Falls back to AsyncStorage on native.
 */
import { Platform } from 'react-native';
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

var STORAGE_KEY = 'blanked_login_rewards';

interface LoginRewardState {
  currentDay: number; // 1-7
  lastClaimDate: string; // YYYY-MM-DD
  streak: number; // consecutive days
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Storage abstraction (localStorage on web, AsyncStorage on native) ──
async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage.getItem(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch {}
    return;
  }
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.setItem(key, value);
}

async function getState(): Promise<LoginRewardState> {
  try {
    var raw = await storageGet(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { currentDay: 1, lastClaimDate: '', streak: 0 };
}

async function saveState(state: LoginRewardState): Promise<void> {
  await storageSet(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Check if there's a reward available to claim today.
 */
async function checkDailyReward(): Promise<{
  available: boolean;
  currentDay: number;
  reward: typeof REWARDS[number];
  streak: number;
} | null> {
  var state = await getState();
  var today = getTodayStr();

  // Already claimed today
  if (state.lastClaimDate === today) {
    return { available: false, currentDay: state.currentDay, reward: REWARDS[state.currentDay - 1], streak: state.streak };
  }

  // Check if streak is broken (missed more than 1 day)
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.toISOString().split('T')[0];

  var nextDay: number;
  if (state.lastClaimDate === yesterdayStr) {
    // Consecutive — advance to next day
    nextDay = state.currentDay >= 7 ? 1 : state.currentDay + 1;
  } else if (state.lastClaimDate === '') {
    // First ever login
    nextDay = 1;
  } else {
    // Streak broken — reset to day 1
    nextDay = 1;
  }

  return {
    available: true,
    currentDay: nextDay,
    reward: REWARDS[nextDay - 1],
    streak: state.lastClaimDate === yesterdayStr ? state.streak + 1 : 1,
  };
}

/**
 * Claim today's reward. Returns the reward details.
 */
async function claimDailyReward(): Promise<typeof REWARDS[number] & { streak: number }> {
  var check = await checkDailyReward();
  if (!check || !check.available) {
    throw new Error('No reward available');
  }

  var state: LoginRewardState = {
    currentDay: check.currentDay,
    lastClaimDate: getTodayStr(),
    streak: check.streak,
  };

  await saveState(state);

  return { ...check.reward, streak: check.streak };
}

/**
 * Claim a cosmetic reward. Call after claimDailyReward for cosmetic days.
 */
function pickCosmeticReward(cosmeticType: 'frame' | 'banner' | 'expression', ownedIds: string[]): string | null {
  return pickRandomCosmetic(cosmeticType, ownedIds);
}

export { REWARDS, checkDailyReward, claimDailyReward, pickCosmeticReward, getState as getLoginRewardState };
