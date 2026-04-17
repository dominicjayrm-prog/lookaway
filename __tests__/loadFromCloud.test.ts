/**
 * Tests for loadFromCloud — the cross-device merge that runs every
 * time the user signs in. This is the highest-stakes function in the
 * client because the wrong merge silently destroys data:
 *
 *   - Stale local state overwriting fresh cloud state
 *     (the bug behind the original "I logged in from my laptop and
 *     lost my purchases" report)
 *   - Subscriber cosmetics surviving a Blanked+ cancellation
 *   - Counter regressions (streak / stars / days played going DOWN)
 *
 * Each test stubs `loadProgressFromSupabase` with a tailored cloud
 * snapshot, sets up a corresponding local state, calls loadFromCloud,
 * and asserts on the merged result.
 */

// Mock localStorage and Supabase first.
const mockStorage: Record<string, string> = {};
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
  },
});

jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }), session: jest.fn() },
  },
}));

// The mock cloud snapshot the next loadFromCloud call will read.
type CloudSnapshot = Awaited<ReturnType<
  typeof import('@/src/utils/progressSync')['loadProgressFromSupabase']
>>;
let nextCloud: CloudSnapshot = null;

jest.mock('@/src/utils/progressSync', () => ({
  saveProgressToSupabase: jest.fn().mockResolvedValue(undefined),
  loadProgressFromSupabase: jest.fn(() => Promise.resolve(nextCloud)),
}));

jest.mock('@/src/utils/economyLogger', () => ({
  logEconomyEvent: jest.fn(),
  ECONOMY_EVENTS: {
    GEM_EARN_LEVEL: 'gem_earn_level', GEM_SPEND_POWERUP: 'gem_spend_powerup',
    GEM_SPEND_LIVES: 'gem_spend_lives', LIFE_LOST: 'life_lost', LIFE_REGEN: 'life_regen',
    POWERUP_USED: 'powerup_used', IAP_LIVES: 'iap_lives',
  },
}));

import { useGameStore, SUBSCRIBER_COSMETIC_IDS } from '@/src/store/gameStore';
import { INITIAL_LOGIN_REWARD_STATE } from '@/src/utils/dailyLoginRewards';

/** Build a complete cloud snapshot with sensible defaults. Tests
 *  override only the fields they care about. */
const cloudSnapshot = (overrides: Partial<NonNullable<CloudSnapshot>> = {}): NonNullable<CloudSnapshot> => ({
  gems: 100,
  lives: 5,
  livesLastLostAt: null,
  streakCount: 0,
  bestStreak: 0,
  daysPlayed: 0,
  subscriptionStatus: 'inactive',
  totalStars: 0,
  highestWorld: 1,
  levelProgress: {},
  completedScores: [],
  ownedCosmetics: [],
  equippedFrame: 'frame_blink_normal',
  equippedBanner: 'banner_none',
  equippedNameColor: 'name_default',
  equippedExpression: 'expr_normal',
  powerUps: {},
  streakMilestonesClaimed: [],
  lastPlayDate: null,
  lastPlusGemGrantAt: null,
  maxLives: 5,
  loginReward: { ...INITIAL_LOGIN_REWARD_STATE },
  username: 'cloud-user',
  avatarUrl: null,
  cloudUpdatedAt: 1000,
  ...overrides,
});

/** Reset the store to a clean baseline before each test. */
const resetStore = () => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  useGameStore.setState({
    gems: 50, lives: 5, maxLives: 5, livesLastLostAt: null,
    streakCount: 0, bestStreak: 0, daysPlayed: 0,
    lastPlayDate: null, streakMilestonesClaimed: [],
    totalStars: 0, highestWorld: 1, levelProgress: {}, completedScores: [],
    ownedCosmetics: [], equippedFrame: 'frame_blink_normal', equippedBanner: 'banner_none',
    equippedNameColor: 'name_default', equippedExpression: 'expr_normal',
    powerUps: {
      extra_life: 0, slowTime: 0, peek: 0, fiftyFifty: 0, skip: 0,
      sr_slow_time: 0, sr_ghost_outline: 0, sr_second_chance: 0,
      sm_slow_flash: 0, sm_highlight: 0, sm_freeze: 0,
      seq_replay_one: 0, seq_safety_net: 0,
      cb_slow_motion: 0, cb_colour_filter: 0,
      cc_slow_time: 0, cc_reveal_one: 0,
    },
    subscriptionStatus: 'inactive',
    username: null, avatarUrl: null,
    localUpdatedAt: 0,
    loginReward: { ...INITIAL_LOGIN_REWARD_STATE },
    _hydrated: false, _authUserId: null,
  });
};

beforeEach(() => {
  nextCloud = null;
  resetStore();
});

describe('loadFromCloud', () => {
  it('does nothing when cloud returns null (offline / failed fetch)', async () => {
    nextCloud = null;
    const before = useGameStore.getState().gems;
    await useGameStore.getState().loadFromCloud('user-1');
    expect(useGameStore.getState().gems).toBe(before);
  });

  it('cloud wins when localUpdatedAt is 0 (fresh device)', async () => {
    nextCloud = cloudSnapshot({ gems: 250, cloudUpdatedAt: 5000 });
    useGameStore.setState({ gems: 50, localUpdatedAt: 0 });
    await useGameStore.getState().loadFromCloud('user-1');
    expect(useGameStore.getState().gems).toBe(250);
  });

  it('local wins when local is newer than cloud', async () => {
    // Local saved more recently than cloud → local gem balance is the
    // truth. This is the "I just earned 200 gems on this device, the
    // cloud only has the snapshot from this morning" case.
    nextCloud = cloudSnapshot({ gems: 100, cloudUpdatedAt: 1000 });
    useGameStore.setState({ gems: 300, localUpdatedAt: 9999 });
    await useGameStore.getState().loadFromCloud('user-1');
    expect(useGameStore.getState().gems).toBe(300);
  });

  it('cloud wins when cloud is newer than local', async () => {
    // The cross-device sync bug: stale local clobbering fresh cloud.
    nextCloud = cloudSnapshot({ gems: 500, cloudUpdatedAt: 9999 });
    useGameStore.setState({ gems: 50, localUpdatedAt: 1000 });
    await useGameStore.getState().loadFromCloud('user-1');
    expect(useGameStore.getState().gems).toBe(500);
  });

  it('grow-only counters (streak, days, stars) take the max regardless of timestamp', async () => {
    nextCloud = cloudSnapshot({
      streakCount: 5, bestStreak: 10, daysPlayed: 20,
      totalStars: 100, highestWorld: 4,
      cloudUpdatedAt: 9999,
    });
    useGameStore.setState({
      streakCount: 12, bestStreak: 15, daysPlayed: 25,
      totalStars: 90, highestWorld: 3,
      localUpdatedAt: 1000, // local is older but higher
    });
    await useGameStore.getState().loadFromCloud('user-1');
    const s = useGameStore.getState();
    expect(s.streakCount).toBe(12); // max(5, 12)
    expect(s.bestStreak).toBe(15);  // max(10, 15)
    expect(s.daysPlayed).toBe(25);  // max(20, 25)
    expect(s.highestWorld).toBe(4); // max(3, 4)
  });

  it('merges level progress per-level, taking the best of each', async () => {
    nextCloud = cloudSnapshot({
      levelProgress: {
        'w1-l1': { stars: 3, bestScore: 95, attempts: 2 },
        'w1-l2': { stars: 1, bestScore: 60, attempts: 1 },
      },
    });
    useGameStore.setState({
      levelProgress: {
        'w1-l2': { stars: 3, bestScore: 100, attempts: 5 }, // local has better w1-l2
        'w1-l3': { stars: 2, bestScore: 80, attempts: 1 },  // local has w1-l3 cloud doesn't
      },
    });
    await useGameStore.getState().loadFromCloud('user-1');
    const merged = useGameStore.getState().levelProgress;
    expect(merged['w1-l1']).toEqual({ stars: 3, bestScore: 95, attempts: 2 });
    expect(merged['w1-l2']).toEqual({ stars: 3, bestScore: 100, attempts: 5 });
    expect(merged['w1-l3']).toEqual({ stars: 2, bestScore: 80, attempts: 1 });
  });

  it('owned cosmetics merge to the union of local and cloud (subscribers)', async () => {
    nextCloud = cloudSnapshot({
      subscriptionStatus: 'active',
      ownedCosmetics: ['frame_diamond', 'banner_aurora'],
    });
    useGameStore.setState({
      ownedCosmetics: ['frame_classic', 'banner_aurora'],
    });
    await useGameStore.getState().loadFromCloud('user-1');
    const owned = useGameStore.getState().ownedCosmetics;
    expect(owned).toEqual(expect.arrayContaining(['frame_diamond', 'banner_aurora', 'frame_classic']));
    expect(owned).toHaveLength(3); // dedupe
  });

  it('strips subscriber-only cosmetics when cloud says inactive', async () => {
    // Cancellation propagation. Cloud is the source of truth.
    nextCloud = cloudSnapshot({
      subscriptionStatus: 'inactive',
      ownedCosmetics: [],
    });
    // Local thinks they still own a Blanked+ frame (e.g. cached from
    // before cancellation propagated to this device).
    useGameStore.setState({
      ownedCosmetics: [SUBSCRIBER_COSMETIC_IDS[0]!, 'frame_classic'],
      equippedFrame: SUBSCRIBER_COSMETIC_IDS[0]!,
    });
    await useGameStore.getState().loadFromCloud('user-1');
    const owned = useGameStore.getState().ownedCosmetics;
    expect(owned).not.toContain(SUBSCRIBER_COSMETIC_IDS[0]);
    expect(owned).toContain('frame_classic');
    // The previously-equipped subscriber frame should fall back to default.
    expect(useGameStore.getState().equippedFrame).toBe('frame_blink_normal');
  });

  it('keeps subscriber cosmetics when cloud says active', async () => {
    nextCloud = cloudSnapshot({
      subscriptionStatus: 'active',
      ownedCosmetics: [SUBSCRIBER_COSMETIC_IDS[0]!],
      equippedFrame: SUBSCRIBER_COSMETIC_IDS[0]!,
    });
    await useGameStore.getState().loadFromCloud('user-1');
    expect(useGameStore.getState().ownedCosmetics).toContain(SUBSCRIBER_COSMETIC_IDS[0]);
    expect(useGameStore.getState().equippedFrame).toBe(SUBSCRIBER_COSMETIC_IDS[0]);
  });

  it('username always comes from cloud (server-sourced)', async () => {
    nextCloud = cloudSnapshot({ username: 'cloud-name' });
    useGameStore.setState({ username: 'local-name', localUpdatedAt: 99999 });
    await useGameStore.getState().loadFromCloud('user-1');
    expect(useGameStore.getState().username).toBe('cloud-name');
  });

  it('falls back to local username when cloud has none', async () => {
    nextCloud = cloudSnapshot({ username: null });
    useGameStore.setState({ username: 'local-only' });
    await useGameStore.getState().loadFromCloud('user-1');
    expect(useGameStore.getState().username).toBe('local-only');
  });

  it('power-ups are merged with the max of each type', async () => {
    nextCloud = cloudSnapshot({
      powerUps: { peek: 3, slowTime: 1, fiftyFifty: 0 } as Record<string, number>,
    });
    useGameStore.setState({
      powerUps: {
        extra_life: 0,
        slowTime: 5, peek: 1, fiftyFifty: 2, skip: 4,
        sr_slow_time: 0, sr_ghost_outline: 0, sr_second_chance: 0,
        sm_slow_flash: 0, sm_highlight: 0, sm_freeze: 0,
        seq_replay_one: 0, seq_safety_net: 0,
        cb_slow_motion: 0, cb_colour_filter: 0,
        cc_slow_time: 0, cc_reveal_one: 0,
      },
    });
    await useGameStore.getState().loadFromCloud('user-1');
    const merged = useGameStore.getState().powerUps;
    expect(merged.peek).toBe(3);      // max(1, 3)
    expect(merged.slowTime).toBe(5);  // max(5, 1)
    expect(merged.skip).toBe(4);      // local-only
  });
});
