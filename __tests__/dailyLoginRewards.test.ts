/**
 * Daily Login Rewards unit tests.
 */

const mockStore: Record<string, string> = {};

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

// Mock localStorage for web path
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (key: string) => mockStore[key] ?? null,
    setItem: (key: string, val: string) => { mockStore[key] = val; },
    removeItem: (key: string) => { delete mockStore[key]; },
  },
  writable: true,
});

// Mock AsyncStorage (not used on web, but required for import)
jest.mock('@react-native-async-storage/async-storage', () => {
  const mock = {
    getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
    setItem: jest.fn(async (key: string, val: string) => { mockStore[key] = val; }),
  };
  return { __esModule: true, default: mock };
});

import { REWARDS, checkDailyReward, claimDailyReward, getLoginRewardState } from '@/src/utils/dailyLoginRewards';

beforeEach(() => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
});

describe('REWARDS', () => {
  it('has 7 days of rewards', () => {
    expect(REWARDS).toHaveLength(7);
  });

  it('each reward has required fields', () => {
    REWARDS.forEach(r => {
      expect(r.day).toBeGreaterThanOrEqual(1);
      expect(r.day).toBeLessThanOrEqual(7);
      expect(r.type).toMatch(/^(gems|powerup)$/);
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
  it('returns available on first ever login', async () => {
    const result = await checkDailyReward();
    expect(result).not.toBeNull();
    expect(result!.available).toBe(true);
    expect(result!.currentDay).toBe(1);
  });

  it('returns unavailable after claiming today', async () => {
    await claimDailyReward();
    const result = await checkDailyReward();
    expect(result).not.toBeNull();
    expect(result!.available).toBe(false);
  });
});

describe('claimDailyReward', () => {
  it('returns day 1 reward on first claim', async () => {
    const reward = await claimDailyReward();
    expect(reward.day).toBe(1);
    expect(reward.type).toBe('gems');
    expect(reward.amount).toBe(5);
  });

  it('throws if already claimed today', async () => {
    await claimDailyReward();
    await expect(claimDailyReward()).rejects.toThrow('No reward available');
  });

  it('persists claim to storage', async () => {
    await claimDailyReward();
    const state = await getLoginRewardState();
    expect(state.lastClaimDate).toBe(new Date().toISOString().split('T')[0]);
    expect(state.currentDay).toBe(1);
  });
});
