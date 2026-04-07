/**
 * Weekly Challenges unit tests.
 */

// Mock AsyncStorage
const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => {
  const mock = {
    getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
    setItem: jest.fn(async (key: string, val: string) => { mockStore[key] = val; }),
    removeItem: jest.fn(async (key: string) => { delete mockStore[key]; }),
  };
  return { __esModule: true, default: mock };
});

import {
  getWeeklyChallenges,
  incrementWeeklyProgress,
  setWeeklyProgressMax,
  claimWeeklyReward,
  getTimeUntilReset,
} from '@/src/utils/weeklyChallenges';

beforeEach(() => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
});

describe('getWeeklyChallenges', () => {
  it('returns state with 3 goals', async () => {
    const state = await getWeeklyChallenges();
    expect(state.goals).toHaveLength(3);
    expect(state.weekId).toMatch(/^\d{4}-W\d+$/);
    expect(state.progress).toEqual({});
    expect(state.claimed).toEqual({});
  });

  it('returns same goals on second call (same week)', async () => {
    const state1 = await getWeeklyChallenges();
    const state2 = await getWeeklyChallenges();
    expect(state1.goals.map(g => g.id)).toEqual(state2.goals.map(g => g.id));
  });

  it('goals have unique tracking keys', async () => {
    const state = await getWeeklyChallenges();
    const keys = state.goals.map(g => g.trackingKey);
    expect(new Set(keys).size).toBe(3);
  });
});

describe('incrementWeeklyProgress', () => {
  it('increments a tracking key', async () => {
    await incrementWeeklyProgress('levels_completed');
    const state = await getWeeklyChallenges();
    expect(state.progress['levels_completed']).toBe(1);
  });

  it('increments by custom amount', async () => {
    await incrementWeeklyProgress('stars_earned', 3);
    const state = await getWeeklyChallenges();
    expect(state.progress['stars_earned']).toBe(3);
  });

  it('accumulates across calls', async () => {
    await incrementWeeklyProgress('levels_completed');
    await incrementWeeklyProgress('levels_completed');
    await incrementWeeklyProgress('levels_completed');
    const state = await getWeeklyChallenges();
    expect(state.progress['levels_completed']).toBe(3);
  });
});

describe('setWeeklyProgressMax', () => {
  it('sets to max value', async () => {
    await setWeeklyProgressMax('correct_streak', 5);
    const state = await getWeeklyChallenges();
    expect(state.progress['correct_streak']).toBe(5);
  });

  it('does not decrease', async () => {
    await setWeeklyProgressMax('correct_streak', 10);
    await setWeeklyProgressMax('correct_streak', 3);
    const state = await getWeeklyChallenges();
    expect(state.progress['correct_streak']).toBe(10);
  });
});

describe('claimWeeklyReward', () => {
  it('returns 0 if goal not met', async () => {
    const state = await getWeeklyChallenges();
    const goalId = state.goals[0].id;
    const gems = await claimWeeklyReward(goalId);
    expect(gems).toBe(0);
  });

  it('returns gems when goal is met', async () => {
    const state = await getWeeklyChallenges();
    const goal = state.goals[0];
    // Meet the goal target
    for (let i = 0; i < goal.target; i++) {
      await incrementWeeklyProgress(goal.trackingKey);
    }
    const gems = await claimWeeklyReward(goal.id);
    expect(gems).toBe(goal.reward);
  });

  it('cannot claim twice', async () => {
    const state = await getWeeklyChallenges();
    const goal = state.goals[0];
    for (let i = 0; i < goal.target; i++) {
      await incrementWeeklyProgress(goal.trackingKey);
    }
    await claimWeeklyReward(goal.id);
    const gems2 = await claimWeeklyReward(goal.id);
    expect(gems2).toBe(0);
  });

  it('returns 0 for nonexistent goal', async () => {
    const gems = await claimWeeklyReward('fake_goal_id');
    expect(gems).toBe(0);
  });
});

describe('getTimeUntilReset', () => {
  it('returns positive values', () => {
    const time = getTimeUntilReset();
    expect(time.days).toBeGreaterThanOrEqual(0);
    expect(time.hours).toBeGreaterThanOrEqual(0);
    expect(time.minutes).toBeGreaterThanOrEqual(0);
    expect(time.days).toBeLessThanOrEqual(7);
  });
});
