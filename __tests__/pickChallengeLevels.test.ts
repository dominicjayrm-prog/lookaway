/**
 * Tests for pickChallengeLevels — the friend-challenge level picker
 * that runs BEFORE the challenger plays. Critical because:
 *
 *   - difficulty must actually scope levels to the right worlds
 *     (regression here gave Easy challenges Hard levels for ~1 day)
 *   - levels both players have completed should be preferred so
 *     neither side is sandbagged
 *   - the 5-level set should spread across the world range, not
 *     dump 5 from one world
 *
 * The tests stub the supabase response per scenario and assert on the
 * shape of the returned id list.
 */

// Per-test fixtures: simulate a) all available campaign levels,
// b) which levels each player has completed.
let allLevels: { id: string }[] = [];
let myCompleted: { level_id: string }[] = [];
let theirCompleted: { level_id: string }[] = [];

jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      // Two different chains depending on which table is being read.
      // user_progress paths are eq('user_id', X) → resolves with that
      // user's completed list. campaign_levels resolves with allLevels.
      if (table === 'user_progress') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn((_col: string, value: string) => {
            // Use the user_id arg to decide which fixture to return.
            const data = value === 'me' ? myCompleted : theirCompleted;
            return Promise.resolve({ data, error: null });
          }),
        };
      }
      // campaign_levels
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: allLevels, error: null }),
      };
    }),
  },
}));

// Notification + achievements stubs so the broader module loads.
jest.mock('@/src/utils/notifications', () => ({
  notifyChallengeResult: jest.fn(),
  notifyChallengeReceived: jest.fn(),
  notifyChallengeDeclined: jest.fn(),
}));
jest.mock('@/src/utils/achievements', () => ({
  checkAchievements: jest.fn().mockResolvedValue(undefined),
}));

import { pickChallengeLevels } from '@/src/utils/challengeFlow';

beforeEach(() => {
  allLevels = [];
  myCompleted = [];
  theirCompleted = [];
});

/** Helper to fabricate `count` level ids for a given world. */
const worldLevels = (world: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `w${world}-l${i + 1}` }));

describe('pickChallengeLevels', () => {
  it('returns an empty array when there are no campaign levels at all', async () => {
    allLevels = [];
    const result = await pickChallengeLevels('me', 'them', 'easy');
    expect(result).toEqual([]);
  });

  it('returns 5 ids when the pool is plenty', async () => {
    // Easy difficulty = worlds 1 + 2. Provide 10 in each so the
    // both-completed pool has 20 candidates.
    allLevels = [...worldLevels(1, 10), ...worldLevels(2, 10)];
    myCompleted = allLevels.map(l => ({ level_id: l.id }));
    theirCompleted = allLevels.map(l => ({ level_id: l.id }));
    const result = await pickChallengeLevels('me', 'them', 'easy');
    expect(result).toHaveLength(5);
  });

  it('only picks levels from the requested difficulty tier', async () => {
    // Mix easy + medium + hard levels but ask for easy. None of the
    // returned ids should match the medium/hard worlds.
    allLevels = [
      ...worldLevels(1, 5),
      ...worldLevels(2, 5),
      ...worldLevels(3, 5),
      ...worldLevels(4, 5),
      ...worldLevels(5, 5),
      ...worldLevels(6, 5),
    ];
    myCompleted = allLevels.map(l => ({ level_id: l.id }));
    theirCompleted = allLevels.map(l => ({ level_id: l.id }));
    const result = await pickChallengeLevels('me', 'them', 'easy');
    expect(result).toHaveLength(5);
    for (const id of result) {
      expect(id).toMatch(/^w(1|2)-l/);
    }
  });

  it('respects medium tier (worlds 3-4)', async () => {
    allLevels = [
      ...worldLevels(1, 5),
      ...worldLevels(3, 5),
      ...worldLevels(4, 5),
      ...worldLevels(6, 5),
    ];
    myCompleted = allLevels.map(l => ({ level_id: l.id }));
    theirCompleted = allLevels.map(l => ({ level_id: l.id }));
    const result = await pickChallengeLevels('me', 'them', 'medium');
    for (const id of result) {
      expect(id).toMatch(/^w(3|4)-l/);
    }
  });

  it('respects hard tier (worlds 5-6)', async () => {
    allLevels = [
      ...worldLevels(2, 5),
      ...worldLevels(5, 5),
      ...worldLevels(6, 5),
    ];
    myCompleted = allLevels.map(l => ({ level_id: l.id }));
    theirCompleted = allLevels.map(l => ({ level_id: l.id }));
    const result = await pickChallengeLevels('me', 'them', 'hard');
    for (const id of result) {
      expect(id).toMatch(/^w(5|6)-l/);
    }
  });

  it('falls back to all tier levels if not enough are double-completed', async () => {
    // Only ONE level is completed by both — so the both-completed
    // pool is too small (length 1 < 5). Picker should fall back to
    // all tier levels rather than returning just the single common id.
    allLevels = [...worldLevels(1, 5), ...worldLevels(2, 5)];
    myCompleted = [{ level_id: 'w1-l1' }];
    theirCompleted = [{ level_id: 'w1-l1' }];
    const result = await pickChallengeLevels('me', 'them', 'easy');
    expect(result.length).toBeGreaterThan(1);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('spreads picks across both worlds in the difficulty tier when possible', async () => {
    allLevels = [...worldLevels(1, 10), ...worldLevels(2, 10)];
    myCompleted = allLevels.map(l => ({ level_id: l.id }));
    theirCompleted = allLevels.map(l => ({ level_id: l.id }));
    const result = await pickChallengeLevels('me', 'them', 'easy');
    const w1Count = result.filter(id => id.startsWith('w1-')).length;
    const w2Count = result.filter(id => id.startsWith('w2-')).length;
    // The spread guarantees at least 2 from each world when both have
    // enough. The remaining slot can go either way (5 / 2 = floor 2,
    // so 2+2 guaranteed and 1 leftover).
    expect(w1Count).toBeGreaterThanOrEqual(2);
    expect(w2Count).toBeGreaterThanOrEqual(2);
    expect(w1Count + w2Count).toBe(5);
  });

  it('handles the case where one world has too few levels for the spread', async () => {
    // World 1 only has 1 level — spread should grab it and top up
    // from world 2.
    allLevels = [...worldLevels(1, 1), ...worldLevels(2, 10)];
    myCompleted = allLevels.map(l => ({ level_id: l.id }));
    theirCompleted = allLevels.map(l => ({ level_id: l.id }));
    const result = await pickChallengeLevels('me', 'them', 'easy');
    expect(result).toHaveLength(5);
    const w2Count = result.filter(id => id.startsWith('w2-')).length;
    expect(w2Count).toBeGreaterThanOrEqual(4);
  });
});
