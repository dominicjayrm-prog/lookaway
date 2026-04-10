/**
 * Daily Login Rewards unit tests.
 */

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

import { REWARDS, checkDailyReward, advanceLoginReward, INITIAL_LOGIN_REWARD_STATE, type LoginRewardState } from '@/src/utils/dailyLoginRewards';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

describe('REWARDS', () => {
  it('has 7 days of rewards', () => {
    expect(REWARDS).toHaveLength(7);
  });

  it('each reward has required fields', () => {
    REWARDS.forEach(r => {
      expect(r.day).toBeGreaterThanOrEqual(1);
      expect(r.day).toBeLessThanOrEqual(7);
      expect(r.type).toMatch(/^(gems|cosmetic|powerup)$/);
      expect(r.amount).toBeGreaterThan(0);
      expect(r.icon).toBeTruthy();
    });
  });

  it('day 7 is special (gift)', () => {
    const day7 = REWARDS[6];
    expect(day7.day).toBe(7);
    expect(day7.type).toBe('gems');
    expect(day7.amount).toBe(25);
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

  it('cycles back to day 1 after day 7', () => {
    const prev: LoginRewardState = { currentDay: 7, lastClaimDate: yesterdayStr(), streak: 7 };
    const result = checkDailyReward(prev);
    expect(result.available).toBe(true);
    expect(result.currentDay).toBe(1);
    expect(result.streak).toBe(8);
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
