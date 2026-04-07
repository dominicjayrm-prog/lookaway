/**
 * Game Store unit tests — tests the Zustand store logic in isolation.
 * Mocks localStorage and Supabase to run in Node.
 */

// Mock localStorage before any imports
const mockStorage: Record<string, string> = {};
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
  },
});

// Mock Supabase
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(), insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }), session: jest.fn() },
  },
}));

// Mock progressSync
jest.mock('@/src/utils/progressSync', () => ({
  saveProgressToSupabase: jest.fn().mockResolvedValue(undefined),
  loadProgressFromSupabase: jest.fn().mockResolvedValue(null),
}));

// Mock economyLogger
jest.mock('@/src/utils/economyLogger', () => ({
  logEconomyEvent: jest.fn(),
  ECONOMY_EVENTS: {
    GEM_EARN_LEVEL: 'gem_earn_level', GEM_SPEND_POWERUP: 'gem_spend_powerup',
    GEM_SPEND_LIVES: 'gem_spend_lives', LIFE_LOST: 'life_lost', LIFE_REGEN: 'life_regen',
    POWERUP_USED: 'powerup_used', IAP_LIVES: 'iap_lives',
  },
}));

import { useGameStore } from '@/src/store/gameStore';

beforeEach(() => {
  // Reset store between tests
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  useGameStore.setState({
    gems: 50, lives: 5, maxLives: 5, livesLastLostAt: null,
    streakCount: 0, lastPlayDate: null, streakMilestonesClaimed: [],
    totalStars: 0, highestWorld: 1, levelProgress: {}, completedScores: [],
    powerUps: {
      extra_life: 0, slowTime: 0, peek: 0, fiftyFifty: 0, skip: 0,
      sr_slow_time: 0, sr_ghost_outline: 0, sr_second_chance: 0,
      sm_slow_flash: 0, sm_highlight: 0, sm_freeze: 0,
      seq_replay_one: 0, seq_safety_net: 0,
      cb_slow_motion: 0, cb_colour_filter: 0,
      cc_slow_time: 0, cc_reveal_one: 0,
    },
    _hydrated: false, _authUserId: null,
  });
});

describe('Gem economy', () => {
  it('adds gems correctly', () => {
    useGameStore.getState().addGems(10);
    expect(useGameStore.getState().gems).toBe(60);
  });

  it('rejects negative gem amounts', () => {
    useGameStore.getState().addGems(-10);
    expect(useGameStore.getState().gems).toBe(50); // unchanged
  });

  it('rejects zero gem amounts', () => {
    useGameStore.getState().addGems(0);
    expect(useGameStore.getState().gems).toBe(50);
  });

  it('spends gems when sufficient', () => {
    const result = useGameStore.getState().spendGems(30);
    expect(result).toBe(true);
    expect(useGameStore.getState().gems).toBe(20);
  });

  it('rejects spending more than balance', () => {
    const result = useGameStore.getState().spendGems(100);
    expect(result).toBe(false);
    expect(useGameStore.getState().gems).toBe(50);
  });

  it('allows spending exact balance', () => {
    const result = useGameStore.getState().spendGems(50);
    expect(result).toBe(true);
    expect(useGameStore.getState().gems).toBe(0);
  });
});

describe('Lives system', () => {
  it('loses a life', () => {
    useGameStore.getState().loseLife();
    expect(useGameStore.getState().lives).toBe(4);
  });

  it('never goes below 0 lives', () => {
    for (let i = 0; i < 10; i++) useGameStore.getState().loseLife();
    expect(useGameStore.getState().lives).toBe(0);
  });

  it('records livesLastLostAt on first loss', () => {
    expect(useGameStore.getState().livesLastLostAt).toBeNull();
    useGameStore.getState().loseLife();
    expect(useGameStore.getState().livesLastLostAt).not.toBeNull();
  });

  it('refills all lives', () => {
    useGameStore.getState().loseLife();
    useGameStore.getState().loseLife();
    useGameStore.getState().refillLives();
    expect(useGameStore.getState().lives).toBe(5);
    expect(useGameStore.getState().livesLastLostAt).toBeNull();
  });

  it('refills with gems (80 cost)', () => {
    useGameStore.getState().loseLife();
    const result = useGameStore.getState().refillLivesWithGems();
    expect(result).toBe(false); // only 50 gems, need 80
    useGameStore.getState().addGems(50); // now 100
    const result2 = useGameStore.getState().refillLivesWithGems();
    expect(result2).toBe(true);
    expect(useGameStore.getState().lives).toBe(5);
    expect(useGameStore.getState().gems).toBe(20); // 100 - 80
  });
});

describe('Power-ups', () => {
  it('buys a power-up with sufficient gems', () => {
    const result = useGameStore.getState().buyPowerUp('slowTime', 1);
    expect(result).toBe(true);
    expect(useGameStore.getState().getPowerUpCount('slowTime')).toBe(1);
    expect(useGameStore.getState().gems).toBe(20); // 50 - 30
  });

  it('rejects purchase with insufficient gems', () => {
    useGameStore.setState({ gems: 10 });
    const result = useGameStore.getState().buyPowerUp('slowTime', 1);
    expect(result).toBe(false);
    expect(useGameStore.getState().getPowerUpCount('slowTime')).toBe(0);
  });

  it('uses a power-up', () => {
    useGameStore.getState().buyPowerUp('peek', 1);
    expect(useGameStore.getState().usePowerUp('peek')).toBe(true);
    expect(useGameStore.getState().getPowerUpCount('peek')).toBe(0);
  });

  it('cannot use a power-up you dont have', () => {
    expect(useGameStore.getState().usePowerUp('peek')).toBe(false);
  });

  it('buys with custom cost (free power-up)', () => {
    const result = useGameStore.getState().buyPowerUp('slowTime', 1, 0);
    expect(result).toBe(true);
    expect(useGameStore.getState().gems).toBe(50); // no cost deducted
    expect(useGameStore.getState().getPowerUpCount('slowTime')).toBe(1);
  });
});

describe('Level completion', () => {
  it('records first completion with gems', () => {
    const gems = useGameStore.getState().recordLevelComplete('w1-l1', 2, 80);
    expect(gems).toBe(2); // GEM_REWARDS[2]
    expect(useGameStore.getState().gems).toBe(52);
    expect(useGameStore.getState().levelProgress['w1-l1']).toEqual({
      stars: 2, bestScore: 80, attempts: 1,
    });
  });

  it('clamps stars to [0, 3]', () => {
    useGameStore.getState().recordLevelComplete('w1-l1', 5 as any, 100);
    expect(useGameStore.getState().levelProgress['w1-l1'].stars).toBe(3);
  });

  it('clamps score to [0, 100]', () => {
    useGameStore.getState().recordLevelComplete('w1-l1', 1, 150);
    expect(useGameStore.getState().levelProgress['w1-l1'].bestScore).toBe(100);
  });

  it('rejects empty level ID', () => {
    const gems = useGameStore.getState().recordLevelComplete('', 2, 80);
    expect(gems).toBe(0);
  });

  it('gives replay reward only when improving', () => {
    useGameStore.getState().recordLevelComplete('w1-l1', 1, 65); // first: +1 gem
    const initialGems = useGameStore.getState().gems;
    useGameStore.getState().recordLevelComplete('w1-l1', 1, 65); // replay, same stars: +0
    expect(useGameStore.getState().gems).toBe(initialGems);
    useGameStore.getState().recordLevelComplete('w1-l1', 3, 100); // replay, improved: +2 (3-1)
    expect(useGameStore.getState().gems).toBe(initialGems + 2);
  });

  it('keeps best score across replays', () => {
    useGameStore.getState().recordLevelComplete('w1-l1', 2, 85);
    useGameStore.getState().recordLevelComplete('w1-l1', 1, 60);
    expect(useGameStore.getState().levelProgress['w1-l1'].bestScore).toBe(85);
    expect(useGameStore.getState().levelProgress['w1-l1'].stars).toBe(2);
    expect(useGameStore.getState().levelProgress['w1-l1'].attempts).toBe(2);
  });

  it('caps completedScores at 500', () => {
    for (let i = 0; i < 510; i++) {
      useGameStore.getState().recordLevelComplete(`w1-l${i}`, 1, 60 + (i % 40));
    }
    expect(useGameStore.getState().completedScores.length).toBeLessThanOrEqual(500);
  });
});

describe('Streak', () => {
  it('increments streak on new day', () => {
    useGameStore.getState().incrementStreak();
    expect(useGameStore.getState().streakCount).toBe(1);
  });

  it('does not double-increment same day', () => {
    useGameStore.getState().incrementStreak();
    useGameStore.getState().incrementStreak();
    expect(useGameStore.getState().streakCount).toBe(1);
  });

  it('resets streak', () => {
    useGameStore.getState().incrementStreak();
    useGameStore.getState().resetStreak();
    expect(useGameStore.getState().streakCount).toBe(0);
  });
});

describe('Helpers', () => {
  it('getMemoryScore returns average', () => {
    useGameStore.setState({ completedScores: [80, 90, 100] });
    expect(useGameStore.getState().getMemoryScore()).toBe(90);
  });

  it('getMemoryScore returns 0 for no scores', () => {
    expect(useGameStore.getState().getMemoryScore()).toBe(0);
  });

  it('getCompletedLevelCount counts progress entries', () => {
    useGameStore.setState({ levelProgress: { 'w1-l1': { stars: 1, bestScore: 60, attempts: 1 }, 'w1-l2': { stars: 2, bestScore: 80, attempts: 1 } } });
    expect(useGameStore.getState().getCompletedLevelCount()).toBe(2);
  });
});
