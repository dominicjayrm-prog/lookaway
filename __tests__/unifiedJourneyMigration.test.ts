import { UNIFIED_LADDER, getWorldForPosition, TOTAL_POSITIONS } from '../src/data/unifiedJourney';

// Inline copy of the migration logic from gameStore.ts so we can test it
// without pulling the full store (which imports i18n + Supabase).
// If the real migration changes, this test needs to track it.
interface SavedShape {
  levelProgress?: Record<string, { stars: number; bestScore: number; attempts: number }>;
  unifiedPosition?: number;
  currentWorldTheme?: ReturnType<typeof getWorldForPosition>;
  hasSeenUnifiedIntro?: boolean;
  hasSeenWorldIntro?: Partial<Record<ReturnType<typeof getWorldForPosition>, boolean>>;
  lastPlayedMode?: string | null;
  lastPlayedLevelId?: string | null;
}

function migrate(saved: SavedShape): SavedShape {
  if (saved.unifiedPosition !== undefined) return saved;
  const progress = saved.levelProgress ?? {};
  let firstUncompleted = 1;
  for (const level of UNIFIED_LADDER) {
    const entry = progress[level.levelId];
    if (!entry || entry.stars <= 0) {
      firstUncompleted = level.position;
      break;
    }
    firstUncompleted = level.position + 1;
  }
  const position = Math.min(TOTAL_POSITIONS, Math.max(1, firstUncompleted));
  saved.unifiedPosition = position;
  saved.currentWorldTheme = getWorldForPosition(position);
  saved.hasSeenUnifiedIntro = saved.hasSeenUnifiedIntro ?? false;
  saved.hasSeenWorldIntro = saved.hasSeenWorldIntro ?? {};
  saved.lastPlayedMode = saved.lastPlayedMode ?? null;
  saved.lastPlayedLevelId = saved.lastPlayedLevelId ?? null;
  return saved;
}

describe('Unified Journey migration', () => {
  it('fresh account lands at position 1 in Emerald Grove', () => {
    const migrated = migrate({});
    expect(migrated.unifiedPosition).toBe(1);
    expect(migrated.currentWorldTheme).toBe('emerald_grove');
    expect(migrated.hasSeenUnifiedIntro).toBe(false);
  });

  it('is a no-op when unifiedPosition already set', () => {
    const input = { unifiedPosition: 42, currentWorldTheme: 'emerald_grove' as const };
    const migrated = migrate(input);
    expect(migrated.unifiedPosition).toBe(42);
  });

  it('user with just Level 1 complete lands on position 2', () => {
    const migrated = migrate({
      levelProgress: { 'w1-l1': { stars: 3, bestScore: 100, attempts: 1 } },
    });
    expect(migrated.unifiedPosition).toBe(2);
    expect(migrated.currentWorldTheme).toBe('emerald_grove');
  });

  it('user who completed all 25 intro levels lands on position 26', () => {
    const levelProgress: Record<string, { stars: number; bestScore: number; attempts: number }> = {};
    for (let i = 0; i < 25; i++) {
      levelProgress[UNIFIED_LADDER[i].levelId] = { stars: 3, bestScore: 100, attempts: 1 };
    }
    const migrated = migrate({ levelProgress });
    expect(migrated.unifiedPosition).toBe(26);
  });

  it('user with gaps lands on first uncompleted position', () => {
    const levelProgress: Record<string, { stars: number; bestScore: number; attempts: number }> = {};
    // Complete positions 1-5 and 7-10. Position 6 is missing.
    [0, 1, 2, 3, 4, 6, 7, 8, 9].forEach((i) => {
      levelProgress[UNIFIED_LADDER[i].levelId] = { stars: 2, bestScore: 80, attempts: 1 };
    });
    const migrated = migrate({ levelProgress });
    expect(migrated.unifiedPosition).toBe(6);
  });

  it('user who finished the whole ladder lands on the final position', () => {
    const levelProgress: Record<string, { stars: number; bestScore: number; attempts: number }> = {};
    UNIFIED_LADDER.forEach((lv) =>
      (levelProgress[lv.levelId] = { stars: 3, bestScore: 100, attempts: 1 })
    );
    const migrated = migrate({ levelProgress });
    expect(migrated.unifiedPosition).toBe(TOTAL_POSITIONS);
    expect(migrated.currentWorldTheme).toBe('inferno_core');
  });

  it('Endgame 20 (positions 381-400) is wired into the ladder', () => {
    expect(UNIFIED_LADDER.length).toBe(TOTAL_POSITIONS);
    expect(TOTAL_POSITIONS).toBe(400);
    // Position 400 should be the Grand Master Trial (Mastermind L55).
    const final = UNIFIED_LADDER[UNIFIED_LADDER.length - 1];
    expect(final.position).toBe(400);
    expect(final.levelId).toBe('w6-l55');
    expect(final.mode).toBe('classic');
    // Positions 395-399 should be the 5 side-mode bosses.
    const bosses = UNIFIED_LADDER.filter((lv) => lv.levelId.endsWith('_boss'));
    expect(bosses).toHaveLength(5);
    expect(bosses.map((b) => b.position).sort()).toEqual([395, 396, 397, 398, 399]);
  });

  it('levels with 0 stars are treated as uncompleted', () => {
    const migrated = migrate({
      levelProgress: { 'w1-l1': { stars: 0, bestScore: 40, attempts: 2 } },
    });
    expect(migrated.unifiedPosition).toBe(1);
  });
});
