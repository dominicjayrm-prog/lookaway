import {
  getStarsForScore,
  calculateReplayReward,
  calculateDailyReward,
  checkStreakMilestone,
  bundlePrice,
  GEM_REWARDS,
  INITIAL_GEMS,
  LIVES_CONFIG,
} from '@/src/utils/scoring';

// Mock Level type
const makeLevel = (requiredScore = 60, parScore = 100) => ({
  id: 'test', worldId: 1, levelNumber: 1, title: 'Test',
  scenes: [], requiredScore, parScore,
});

describe('getStarsForScore', () => {
  const level = makeLevel(60, 100);

  it('returns 0 for score below required', () => {
    expect(getStarsForScore(59, level)).toBe(0);
    expect(getStarsForScore(0, level)).toBe(0);
  });

  it('returns 1 for score at required threshold', () => {
    expect(getStarsForScore(60, level)).toBe(1);
    expect(getStarsForScore(79, level)).toBe(1);
  });

  it('returns 2 for score at 80%', () => {
    expect(getStarsForScore(80, level)).toBe(2);
    expect(getStarsForScore(99, level)).toBe(2);
  });

  it('returns 3 for perfect score', () => {
    expect(getStarsForScore(100, level)).toBe(3);
  });

  it('handles custom parScore', () => {
    const easy = makeLevel(40, 80);
    expect(getStarsForScore(80, easy)).toBe(3); // meets parScore
    expect(getStarsForScore(79, easy)).toBe(1); // below TWO_STAR_THRESHOLD (80) but above required (40)
  });
});

describe('GEM_REWARDS', () => {
  it('gives correct gems per star count', () => {
    expect(GEM_REWARDS[0]).toBe(0);
    expect(GEM_REWARDS[1]).toBe(1);
    expect(GEM_REWARDS[2]).toBe(2);
    expect(GEM_REWARDS[3]).toBe(3);
  });
});

describe('calculateReplayReward', () => {
  it('returns 0 if stars didnt improve', () => {
    expect(calculateReplayReward(2, 2)).toBe(0);
    expect(calculateReplayReward(3, 1)).toBe(0);
    expect(calculateReplayReward(3, 3)).toBe(0);
  });

  it('returns difference when stars improved', () => {
    expect(calculateReplayReward(1, 2)).toBe(1); // 2 - 1
    expect(calculateReplayReward(1, 3)).toBe(2); // 3 - 1
    expect(calculateReplayReward(0, 3)).toBe(3); // 3 - 0
    expect(calculateReplayReward(2, 3)).toBe(1); // 3 - 2
  });
});

describe('calculateDailyReward', () => {
  it('gives base gems for low score', () => {
    expect(calculateDailyReward(50)).toBe(5);
    expect(calculateDailyReward(79)).toBe(5);
  });

  it('gives bonus at 80%', () => {
    expect(calculateDailyReward(80)).toBe(10);
    expect(calculateDailyReward(99)).toBe(10);
  });

  it('gives full bonus at 100%', () => {
    expect(calculateDailyReward(100)).toBe(15);
  });
});

describe('checkStreakMilestone', () => {
  it('returns first unclaimed milestone', () => {
    const result = checkStreakMilestone(7, [3]);
    expect(result.milestone).toBe(7);
    expect(result.gems).toBe(15);
  });

  it('returns nothing if all claimed', () => {
    const result = checkStreakMilestone(7, [3, 7]);
    expect(result.milestone).toBeNull();
    expect(result.gems).toBe(0);
  });

  it('returns nothing if streak too low', () => {
    const result = checkStreakMilestone(2, []);
    expect(result.milestone).toBeNull();
  });

  it('returns first available at high streak', () => {
    const result = checkStreakMilestone(100, [3, 7, 14, 30, 60]);
    expect(result.milestone).toBe(100);
    expect(result.gems).toBe(200);
  });
});

describe('bundlePrice', () => {
  it('returns single price for qty 1', () => {
    expect(bundlePrice(30, 1)).toBe(30);
  });

  it('returns double for qty 2 (no discount)', () => {
    expect(bundlePrice(30, 2)).toBe(60);
  });

  it('applies 10% discount for qty 3+', () => {
    expect(bundlePrice(30, 3)).toBe(81); // floor(30 * 3 * 0.9) = 81
    expect(bundlePrice(40, 3)).toBe(108); // floor(40 * 3 * 0.9) = 108
  });
});

describe('constants', () => {
  it('initial gems is 50', () => {
    expect(INITIAL_GEMS).toBe(50);
  });

  it('max lives is 5', () => {
    expect(LIVES_CONFIG.maxLives).toBe(5);
  });

  it('life regen is 30 minutes', () => {
    expect(LIVES_CONFIG.regenTimeMinutes).toBe(30);
  });
});
