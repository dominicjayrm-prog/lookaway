/**
 * Daily Login Rewards unit tests.
 */

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

import { REWARDS, REWARD_CYCLE_DAYS, checkDailyReward, advanceLoginReward, INITIAL_LOGIN_REWARD_STATE, type LoginRewardState } from '@/src/utils/dailyLoginRewards';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

describe('REWARDS', () => {
  it('has 30 days of rewards', () => {
    expect(REWARDS).toHaveLength(REWARD_CYCLE_DAYS);
    expect(REWARD_CYCLE_DAYS).toBe(30);
  });

  it('each reward has required fields', () => {
    REWARDS.forEach(r => {
      expect(r.day).toBeGreaterThanOrEqual(1);
      expect(r.day).toBeLessThanOrEqual(REWARD_CYCLE_DAYS);
      expect(r.type).toMatch(/^(gems|cosmetic|powerup|legendary)$/);
      expect(r.icon).toBeTruthy();
      // Per-type required field
      if (r.type === 'gems') expect(r.amount).toBeGreaterThan(0);
      if (r.type === 'powerup') expect(r.qty).toBeGreaterThan(0);
      if (r.type === 'legendary') expect(r.bonusGems).toBeGreaterThan(0);
      if (r.type === 'cosmetic') expect(r.cosmeticType).toMatch(/^(frame|banner|expression)$/);
    });
  });

  it('day 7 is a legendary milestone', () => {
    const day7 = REWARDS[6];
    expect(day7.day).toBe(7);
    expect(day7.type).toBe('legendary');
    if (day7.type === 'legendary') expect(day7.bonusGems).toBe(25);
  });

  it('day 14 is a legendary milestone', () => {
    const day14 = REWARDS[13];
    expect(day14.day).toBe(14);
    expect(day14.type).toBe('legendary');
    if (day14.type === 'legendary') expect(day14.bonusGems).toBe(30);
  });

  it('day 30 is the grand finale legendary', () => {
    const day30 = REWARDS[29];
    expect(day30.day).toBe(30);
    expect(day30.type).toBe('legendary');
    if (day30.type === 'legendary') expect(day30.bonusGems).toBe(50);
  });
});

describe('checkDailyReward', () => {
  it('returns available on first ever login', () => {
    const result = checkDailyReward({ ...INITIAL_LOGIN_REWARD_STATE });
    expect(result.available).toBe(true);
    expect(result.currentDay).toBe(1);
    expect(result.streak).toBe(1);
  });

  it('returns unavailable after claiming today', () => {
    const claimed: LoginRewardState = { currentDay: 1, lastClaimDate: todayStr(), streak: 1 };
    const result = checkDailyReward(claimed);
    expect(result.available).toBe(false);
    expect(result.currentDay).toBe(1);
  });

  it('advances to day 2 the next day', () => {
    const prev: LoginRewardState = { currentDay: 1, lastClaimDate: yesterdayStr(), streak: 1 };
    const result = checkDailyReward(prev);
    expect(result.available).toBe(true);
    expect(result.currentDay).toBe(2);
    expect(result.streak).toBe(2);
  });

  it('resets to day 1 when streak is broken', () => {
    const prev: LoginRewardState = { currentDay: 4, lastClaimDate: '2000-01-01', streak: 4 };
    const result = checkDailyReward(prev);
    expect(result.available).toBe(true);
    expect(result.currentDay).toBe(1);
    expect(result.streak).toBe(1);
  });

  it('cycles back to day 1 after day 30', () => {
    const prev: LoginRewardState = { currentDay: 30, lastClaimDate: yesterdayStr(), streak: 30 };
    const result = checkDailyReward(prev);
    expect(result.available).toBe(true);
    expect(result.currentDay).toBe(1);
    expect(result.streak).toBe(31);
  });

  it('advances day-by-day through the middle of the cycle', () => {
    const prev: LoginRewardState = { currentDay: 14, lastClaimDate: yesterdayStr(), streak: 14 };
    const result = checkDailyReward(prev);
    expect(result.available).toBe(true);
    expect(result.currentDay).toBe(15);
    expect(result.streak).toBe(15);
  });
});

describe('advanceLoginReward', () => {
  it('returns day 1 reward on first claim', () => {
    const next = advanceLoginReward({ ...INITIAL_LOGIN_REWARD_STATE });
    expect(next.currentDay).toBe(1);
    expect(next.lastClaimDate).toBe(todayStr());
    expect(next.streak).toBe(1);
  });

  it('is idempotent when already claimed today', () => {
    const prev: LoginRewardState = { currentDay: 3, lastClaimDate: todayStr(), streak: 3 };
    const next = advanceLoginReward(prev);
    expect(next).toEqual(prev);
  });

  it('persists the new day and streak after advancing', () => {
    const prev: LoginRewardState = { currentDay: 1, lastClaimDate: yesterdayStr(), streak: 1 };
    const next = advanceLoginReward(prev);
    expect(next.currentDay).toBe(2);
    expect(next.lastClaimDate).toBe(todayStr());
    expect(next.streak).toBe(2);
  });
});
