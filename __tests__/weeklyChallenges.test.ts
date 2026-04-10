/**
 * Weekly Challenges unit tests — validates the rotating pool system.
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
  recordLevelCompleteForChallenges,
  recordQuestionAnsweredForChallenges,
  recordFriendChallengedForChallenges,
  recordLevelFailedForChallenges,
  resetCompletionNotificationCache,
} from '@/src/utils/weeklyChallenges';

beforeEach(() => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  resetCompletionNotificationCache();
});

describe('getWeeklyChallenges', () => {
  it('returns state with 3 goals — one per category', async () => {
    const state = await getWeeklyChallenges();
    expect(state.goals).toHaveLength(3);
    const categories = state.goals.map(g => g.category);
    expect(new Set(categories)).toEqual(new Set(['engagement', 'consistency', 'skill']));
  });

  it('week id matches ISO pattern', async () => {
    const state = await getWeeklyChallenges();
    expect(state.weekId).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('returns same goals on second call (same week)', async () => {
    const state1 = await getWeeklyChallenges();
    const state2 = await getWeeklyChallenges();
    expect(state1.goals.map(g => g.id)).toEqual(state2.goals.map(g => g.id));
  });

  it('gem rewards match the category tier (10/10/20)', async () => {
    const state = await getWeeklyChallenges();
    const engagement = state.goals.find(g => g.category === 'engagement')!;
    const consistency = state.goals.find(g => g.category === 'consistency')!;
    const skill = state.goals.find(g => g.category === 'skill')!;
    expect(engagement.gems).toBe(10);
    expect(consistency.gems).toBe(10);
    expect(skill.gems).toBe(20);
  });

  it('never selects play_3_modes when levelProgress shows < 3 unlocked modes', async () => {
    // Seed: only classic levels — only 1 mode unlocked
    for (let i = 0; i < 50; i++) {
      Object.keys(mockStore).forEach(k => delete mockStore[k]);
      resetCompletionNotificationCache();
      const state = await getWeeklyChallenges({ 'w1-l1': { stars: 1, bestScore: 80, attempts: 1 } });
      const hasPlay3Modes = state.goals.some(g => g.id === 'play_3_modes');
      expect(hasPlay3Modes).toBe(false);
    }
  });
});

describe('incrementWeeklyProgress', () => {
  it('increments a tracking key', async () => {
    await incrementWeeklyProgress('levels_completed_this_week');
    const state = await getWeeklyChallenges();
    expect(state.progress['levels_completed_this_week']).toBe(1);
  });

  it('accumulates across calls', async () => {
    await incrementWeeklyProgress('levels_completed_this_week');
    await incrementWeeklyProgress('levels_completed_this_week');
    await incrementWeeklyProgress('levels_completed_this_week');
    const state = await getWeeklyChallenges();
    expect(state.progress['levels_completed_this_week']).toBe(3);
  });
});

describe('setWeeklyProgressMax', () => {
  it('sets to max value', async () => {
    await setWeeklyProgressMax('best_correct_streak_this_week', 5);
    const state = await getWeeklyChallenges();
    expect(state.progress['best_correct_streak_this_week']).toBe(5);
  });

  it('does not decrease', async () => {
    await setWeeklyProgressMax('best_correct_streak_this_week', 10);
    await setWeeklyProgressMax('best_correct_streak_this_week', 3);
    const state = await getWeeklyChallenges();
    expect(state.progress['best_correct_streak_this_week']).toBe(10);
  });
});

describe('recordLevelCompleteForChallenges', () => {
  it('updates the basic counters', async () => {
    await recordLevelCompleteForChallenges({
      levelId: 'w1-l5',
      stars: 3,
      previousStars: 0,
      score: 100,
      correctAnswers: 5,
      powerUpsUsed: 0,
      sessionLevelCount: 1,
    });
    const state = await getWeeklyChallenges();
    expect(state.progress.levels_completed_this_week).toBe(1);
    expect(state.progress.stars_earned_this_week).toBe(3);
    expect(state.progress.correct_answers_this_week).toBe(5);
    expect(state.progress.perfect_levels_this_week).toBe(1);
    expect(state.progress.flawless_levels_this_week).toBe(1);
    expect(state.progress.levels_95_plus_this_week).toBe(1);
    expect(state.progress.levels_no_powerups_this_week).toBe(1);
  });

  it('does not count flawless when power-ups were used', async () => {
    await recordLevelCompleteForChallenges({
      levelId: 'w1-l1', stars: 3, previousStars: 0, score: 100,
      correctAnswers: 5, powerUpsUsed: 2, sessionLevelCount: 1,
    });
    const state = await getWeeklyChallenges();
    expect(state.progress.flawless_levels_this_week).toBeUndefined();
    expect(state.progress.levels_no_powerups_this_week).toBeUndefined();
    expect(state.progress.perfect_levels_this_week).toBe(1);
  });

  it('increments star-improved only when new stars beat previous stars > 0', async () => {
    // First play — no previous record, should NOT count as improvement
    await recordLevelCompleteForChallenges({
      levelId: 'w1-l1', stars: 2, previousStars: 0, score: 80,
      correctAnswers: 4, powerUpsUsed: 0, sessionLevelCount: 1,
    });
    let state = await getWeeklyChallenges();
    expect(state.progress.levels_star_improved_this_week).toBeUndefined();

    // Replay with the same stars — should NOT count
    await recordLevelCompleteForChallenges({
      levelId: 'w1-l1', stars: 2, previousStars: 2, score: 80,
      correctAnswers: 4, powerUpsUsed: 0, sessionLevelCount: 2,
    });
    state = await getWeeklyChallenges();
    expect(state.progress.levels_star_improved_this_week).toBeUndefined();

    // Replay with better stars — SHOULD count
    await recordLevelCompleteForChallenges({
      levelId: 'w1-l1', stars: 3, previousStars: 2, score: 100,
      correctAnswers: 5, powerUpsUsed: 0, sessionLevelCount: 3,
    });
    state = await getWeeklyChallenges();
    expect(state.progress.levels_star_improved_this_week).toBe(1);
  });

  it('tracks unique modes via level id prefix', async () => {
    await recordLevelCompleteForChallenges({
      levelId: 'w1-l1', stars: 2, previousStars: 0, score: 80,
      correctAnswers: 4, powerUpsUsed: 0, sessionLevelCount: 1,
    });
    await recordLevelCompleteForChallenges({
      levelId: 'sr-w1-l1', stars: 2, previousStars: 0, score: 80,
      correctAnswers: 4, powerUpsUsed: 0, sessionLevelCount: 2,
    });
    await recordLevelCompleteForChallenges({
      levelId: 'sr-w1-l2', stars: 2, previousStars: 0, score: 80,
      correctAnswers: 4, powerUpsUsed: 0, sessionLevelCount: 3,
    });
    const state = await getWeeklyChallenges();
    expect(state.progress.unique_modes_played_this_week).toBe(2); // classic + speed_recall
  });

  it('tracks best session level count', async () => {
    await recordLevelCompleteForChallenges({
      levelId: 'w1-l1', stars: 2, previousStars: 0, score: 80,
      correctAnswers: 4, powerUpsUsed: 0, sessionLevelCount: 5,
    });
    await recordLevelCompleteForChallenges({
      levelId: 'w1-l2', stars: 2, previousStars: 0, score: 80,
      correctAnswers: 4, powerUpsUsed: 0, sessionLevelCount: 2,
    });
    const state = await getWeeklyChallenges();
    expect(state.progress.best_session_levels_this_week).toBe(5);
  });
});

describe('recordQuestionAnsweredForChallenges', () => {
  it('resets correct streak on a wrong answer', async () => {
    await recordQuestionAnsweredForChallenges(true, 1500);
    await recordQuestionAnsweredForChallenges(true, 1500);
    await recordQuestionAnsweredForChallenges(true, 1500);
    let state = await getWeeklyChallenges();
    expect(state.progress.best_correct_streak_this_week).toBe(3);
    await recordQuestionAnsweredForChallenges(false, 1500);
    await recordQuestionAnsweredForChallenges(true, 1500);
    state = await getWeeklyChallenges();
    // Best streak stays at 3, current streak restarts from 1
    expect(state.progress.best_correct_streak_this_week).toBe(3);
  });

  it('fast streak resets on a slow correct answer', async () => {
    await recordQuestionAnsweredForChallenges(true, 1500);
    await recordQuestionAnsweredForChallenges(true, 1500);
    let state = await getWeeklyChallenges();
    expect(state.progress.best_fast_correct_streak_this_week).toBe(2);
    // Slow but correct — breaks the fast streak
    await recordQuestionAnsweredForChallenges(true, 3000);
    await recordQuestionAnsweredForChallenges(true, 1500);
    state = await getWeeklyChallenges();
    expect(state.progress.best_fast_correct_streak_this_week).toBe(2);
  });
});

describe('recordFriendChallengedForChallenges', () => {
  it('increments the engagement counter', async () => {
    await recordFriendChallengedForChallenges();
    await recordFriendChallengedForChallenges();
    const state = await getWeeklyChallenges();
    expect(state.progress.friends_challenged_this_week).toBe(2);
  });
});

describe('recordLevelFailedForChallenges', () => {
  it('resets the no_fail consecutive streak', async () => {
    await recordLevelCompleteForChallenges({
      levelId: 'w1-l1', stars: 2, previousStars: 0, score: 80,
      correctAnswers: 4, powerUpsUsed: 0, sessionLevelCount: 1,
    });
    await recordLevelCompleteForChallenges({
      levelId: 'w1-l2', stars: 2, previousStars: 0, score: 80,
      correctAnswers: 4, powerUpsUsed: 0, sessionLevelCount: 2,
    });
    let state = await getWeeklyChallenges();
    expect(state.progress.best_no_fail_streak_this_week).toBe(2);
    await recordLevelFailedForChallenges();
    // Run should now restart at 1 after the next completion
    await recordLevelCompleteForChallenges({
      levelId: 'w1-l3', stars: 2, previousStars: 0, score: 80,
      correctAnswers: 4, powerUpsUsed: 0, sessionLevelCount: 3,
    });
    state = await getWeeklyChallenges();
    expect(state.progress.best_no_fail_streak_this_week).toBe(2); // Best stays
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
    for (let i = 0; i < goal.target; i++) {
      await incrementWeeklyProgress(goal.trackingKey);
    }
    const gems = await claimWeeklyReward(goal.id);
    expect(gems).toBe(goal.gems);
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
  it('returns non-negative values within expected range', () => {
    const time = getTimeUntilReset();
    expect(time.days).toBeGreaterThanOrEqual(0);
    expect(time.hours).toBeGreaterThanOrEqual(0);
    expect(time.minutes).toBeGreaterThanOrEqual(0);
    expect(time.days).toBeLessThanOrEqual(7);
    expect(time.hours).toBeLessThanOrEqual(23);
    expect(time.minutes).toBeLessThanOrEqual(59);
  });
});
