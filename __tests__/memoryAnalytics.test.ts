/**
 * Tests for memoryAnalytics — pure computation helpers powering the
 * Stats Space screen. No mocks needed: every function takes plain
 * data in and returns plain data out.
 */

import {
  computeMemoryScore,
  estimatePercentile,
  computeStatCards,
  computeBrainProfile,
  generateInsight,
  type AnalyticsInput,
} from '@/src/utils/memoryAnalytics';

const emptyInput: AnalyticsInput = {
  levelProgress: {},
  completedScores: [],
  streakCount: 0,
  bestStreak: 0,
  daysPlayed: 0,
  totalStars: 0,
  highestWorld: 1,
};

const fullInput: AnalyticsInput = {
  levelProgress: {
    'w1-l1': { stars: 3, bestScore: 95, attempts: 1 },
    'w1-l2': { stars: 3, bestScore: 90, attempts: 2 },
    'sr-w1-l1': { stars: 2, bestScore: 75, attempts: 1 },
    'sm-w1-l1': { stars: 3, bestScore: 100, attempts: 1 },
    'seq-w1-l1': { stars: 1, bestScore: 60, attempts: 3 },
    'cb-w1-l1': { stars: 2, bestScore: 80, attempts: 1 },
  },
  completedScores: [95, 90, 75, 100, 60, 80],
  streakCount: 7,
  bestStreak: 14,
  daysPlayed: 30,
  totalStars: 14,
  highestWorld: 3,
};

describe('computeMemoryScore', () => {
  it('returns 0 for an entirely empty player', () => {
    expect(computeMemoryScore(emptyInput)).toBe(0);
  });

  it('returns a number in [0, 100] for a typical player', () => {
    const score = computeMemoryScore(fullInput);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('rewards higher accuracy', () => {
    const low: AnalyticsInput = {
      ...fullInput,
      completedScores: [50, 55, 50, 60],
    };
    const high: AnalyticsInput = {
      ...fullInput,
      completedScores: [95, 100, 98, 90],
    };
    expect(computeMemoryScore(high)).toBeGreaterThan(computeMemoryScore(low));
  });

  it('rewards a higher best streak', () => {
    const noStreak: AnalyticsInput = { ...fullInput, bestStreak: 0 };
    const longStreak: AnalyticsInput = { ...fullInput, bestStreak: 30 };
    expect(computeMemoryScore(longStreak)).toBeGreaterThan(computeMemoryScore(noStreak));
  });

  it('clamps the result so it never exceeds 100', () => {
    // Pump every input to its maximum — even then, the score must not
    // overflow the percentage cap.
    const maxed: AnalyticsInput = {
      levelProgress: Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`w1-l${i}`, { stars: 3, bestScore: 100, attempts: 1 }]),
      ),
      completedScores: Array.from({ length: 100 }, () => 100),
      streakCount: 365,
      bestStreak: 365,
      daysPlayed: 365,
      totalStars: 600,
      highestWorld: 6,
    };
    expect(computeMemoryScore(maxed)).toBeLessThanOrEqual(100);
  });
});

describe('estimatePercentile', () => {
  it('maps very high scores to top buckets', () => {
    expect(estimatePercentile(95)).toBe(3);
    expect(estimatePercentile(85)).toBe(8);
  });

  it('maps low scores to bottom buckets', () => {
    expect(estimatePercentile(10)).toBe(85);
    expect(estimatePercentile(0)).toBe(85);
  });

  it('maps mid-range scores to middle buckets', () => {
    expect(estimatePercentile(55)).toBe(40);
    expect(estimatePercentile(75)).toBe(15);
  });

  it('is monotonically non-increasing', () => {
    // Higher score should always mean a lower (better) percentile bucket.
    let prev = estimatePercentile(100);
    for (let s = 100; s >= 0; s -= 5) {
      const cur = estimatePercentile(s);
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });
});

describe('computeStatCards', () => {
  it('returns zeros for an empty player', () => {
    const cards = computeStatCards(emptyInput);
    expect(cards.accuracy).toBe(0);
    expect(cards.levelsDone).toBe(0);
    expect(cards.stars).toBe(0);
    expect(cards.bestStreak).toBe(0);
  });

  it('counts each level progress entry once', () => {
    const cards = computeStatCards(fullInput);
    expect(cards.levelsDone).toBe(6);
  });

  it('rounds accuracy to a whole number', () => {
    const cards = computeStatCards({
      ...emptyInput,
      completedScores: [80, 85, 91],
    });
    expect(Number.isInteger(cards.accuracy)).toBe(true);
  });

  it('returns avgSpeed in [0.9, 3.0] when there are levels', () => {
    const cards = computeStatCards(fullInput);
    expect(cards.avgSpeed).toBeGreaterThanOrEqual(0.9);
    expect(cards.avgSpeed).toBeLessThanOrEqual(3.0);
  });
});

describe('computeBrainProfile', () => {
  it('returns all zeros for an empty player', () => {
    const profile = computeBrainProfile(emptyInput);
    for (const v of Object.values(profile)) {
      expect(v).toBe(0);
    }
  });

  it('uses Classic mode score for the visual axis', () => {
    const profile = computeBrainProfile({
      ...emptyInput,
      levelProgress: {
        'w1-l1': { stars: 3, bestScore: 88, attempts: 1 },
        'w1-l2': { stars: 3, bestScore: 92, attempts: 1 },
      },
    });
    // Classic average = (88 + 92) / 2 = 90
    expect(profile.visual).toBe(90);
  });

  it('uses Speed Recall mode for the spatial axis', () => {
    const profile = computeBrainProfile({
      ...emptyInput,
      levelProgress: {
        'sr-w1-l1': { stars: 3, bestScore: 80, attempts: 1 },
        'sr-w1-l2': { stars: 3, bestScore: 70, attempts: 1 },
      },
    });
    expect(profile.spatial).toBe(75);
  });

  it('clamps each axis to [0, 100]', () => {
    const profile = computeBrainProfile(fullInput);
    for (const v of Object.values(profile)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

describe('generateInsight', () => {
  it('returns the welcome prompt when there is no data', () => {
    const insight = generateInsight({
      visual: 0, spatial: 0, sequence: 0, speed: 0, focus: 0, consistency: 0,
    });
    expect(insight.title).toMatch(/build your brain profile/i);
  });

  it('names the strongest dimension in the title', () => {
    const insight = generateInsight({
      visual: 50, spatial: 60, sequence: 90, speed: 50, focus: 40, consistency: 30,
    });
    expect(insight.title).toMatch(/sequence/i);
  });

  it('suggests a mode mapped to the weakest dimension', () => {
    const insight = generateInsight({
      visual: 80, spatial: 80, sequence: 80, speed: 80, focus: 80, consistency: 10,
    });
    // consistency is weakest → suggest "daily challenges"
    expect(insight.body).toMatch(/daily challenges/i);
  });
});
