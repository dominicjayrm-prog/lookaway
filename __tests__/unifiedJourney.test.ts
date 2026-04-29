import {
  UNIFIED_LADDER,
  TOTAL_POSITIONS,
  WORLD_THEMES,
  WORLD_THEME_ORDER,
  getUnifiedLevel,
  getPositionForLevelId,
  getWorldForPosition,
  getCurrentChapter,
  getNextChapter,
  isChapterStart,
  isWorldTransition,
  ModeId,
  WorldTheme,
} from '../src/data/unifiedJourney';

describe('Unified Ladder', () => {
  it('contains exactly 400 levels (380 main + 20 endgame)', () => {
    expect(UNIFIED_LADDER).toHaveLength(400);
    expect(TOTAL_POSITIONS).toBe(400);
  });

  it('positions are a contiguous 1..400 sequence in order', () => {
    UNIFIED_LADDER.forEach((lv, i) => {
      expect(lv.position).toBe(i + 1);
    });
  });

  it('every level id is unique (no duplicates)', () => {
    const ids = UNIFIED_LADDER.map((l) => l.levelId);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it('every existing level across all modes appears exactly once', () => {
    const expected: string[] = [];
    // Classic: 6 worlds × [20,30,35,35,40,40] = 200
    const classicCounts = [20, 30, 35, 35, 40, 40];
    classicCounts.forEach((count, i) =>
      Array.from({ length: count }, (_, j) => expected.push(`w${i + 1}-l${j + 1}`))
    );
    const addSide = (prefix: string, perWorld: number[]) =>
      perWorld.forEach((count, i) =>
        Array.from({ length: count }, (_, j) => expected.push(`${prefix}_w${i + 1}_l${j + 1}`))
      );
    addSide('sr', [15, 15, 15]);
    addSide('sm', [15, 15, 15]);
    addSide('seq', [12, 12, 12]);
    addSide('cb', [15, 15]);
    addSide('cc', [12, 12]);

    // The 380 main-campaign IDs from MODE_STRUCTURE. Endgame 20 adds
    // 15 new w6-l{41..55} mastermind IDs + 5 boss IDs (sr_boss /
    // sm_boss / seq_boss / cb_boss / cc_boss) on top — those don't
    // come from MODE_STRUCTURE so the `expected` array stays at 380.
    expect(expected).toHaveLength(380);
    const actual = new Set(UNIFIED_LADDER.map((l) => l.levelId));
    for (const id of expected) expect(actual.has(id)).toBe(true);
  });

  it('first 25 positions match intro curriculum', () => {
    // Classic 1-5: w1-l1..w1-l5
    for (let i = 0; i < 5; i++) {
      expect(UNIFIED_LADDER[i].mode).toBe('classic');
      expect(UNIFIED_LADDER[i].levelId).toBe(`w1-l${i + 1}`);
    }
    // SR 6-8: sr_w1_l1..sr_w1_l3
    for (let i = 0; i < 3; i++) {
      expect(UNIFIED_LADDER[5 + i].mode).toBe('speed_recall');
      expect(UNIFIED_LADDER[5 + i].levelId).toBe(`sr_w1_l${i + 1}`);
    }
    // Classic 9-11: w1-l6..w1-l8
    for (let i = 0; i < 3; i++) {
      expect(UNIFIED_LADDER[8 + i].mode).toBe('classic');
      expect(UNIFIED_LADDER[8 + i].levelId).toBe(`w1-l${i + 6}`);
    }
    // SM 12-14
    for (let i = 0; i < 3; i++) {
      expect(UNIFIED_LADDER[11 + i].mode).toBe('snap_match');
      expect(UNIFIED_LADDER[11 + i].levelId).toBe(`sm_w1_l${i + 1}`);
    }
    // Classic 15-17: w1-l9..w1-l11
    for (let i = 0; i < 3; i++) {
      expect(UNIFIED_LADDER[14 + i].mode).toBe('classic');
      expect(UNIFIED_LADDER[14 + i].levelId).toBe(`w1-l${i + 9}`);
    }
    // Seq 18-20
    for (let i = 0; i < 3; i++) {
      expect(UNIFIED_LADDER[17 + i].mode).toBe('sequence');
      expect(UNIFIED_LADDER[17 + i].levelId).toBe(`seq_w1_l${i + 1}`);
    }
    // CB 21-23
    for (let i = 0; i < 3; i++) {
      expect(UNIFIED_LADDER[20 + i].mode).toBe('counting_blitz');
      expect(UNIFIED_LADDER[20 + i].levelId).toBe(`cb_w1_l${i + 1}`);
    }
    // CC 24-25
    for (let i = 0; i < 2; i++) {
      expect(UNIFIED_LADDER[23 + i].mode).toBe('colour_chain');
      expect(UNIFIED_LADDER[23 + i].levelId).toBe(`cc_w1_l${i + 1}`);
    }
  });

  it('main section chapters (pos 26-340) are 3-5 consecutive same-mode levels', () => {
    // Intro section (pos 1-25) is hand-tuned and includes a deliberate 2-level
    // CC chunk at 24-25. Mastermind endgame (pos 341-394) is one long classic
    // block by design, then 5 boss levels (395-399) followed by the Grand
    // Master final at 400. The chapter rule applies to the main section only.
    const violations: Array<{ start: number; length: number; mode: ModeId }> = [];
    let chapterMode: ModeId | null = null;
    let chapterStart = 0;
    let chapterLen = 0;

    const flush = (endExclusive: number) => {
      if (!chapterMode) return;
      const isInMainSection = chapterStart >= 26 && chapterStart <= 340 && endExclusive - 1 <= 340;
      if (isInMainSection && (chapterLen < 3 || chapterLen > 5)) {
        violations.push({ start: chapterStart, length: chapterLen, mode: chapterMode });
      }
    };

    for (const lv of UNIFIED_LADDER) {
      if (lv.mode === chapterMode) {
        chapterLen++;
      } else {
        flush(lv.position);
        chapterMode = lv.mode;
        chapterStart = lv.position;
        chapterLen = 1;
      }
    }
    flush(UNIFIED_LADDER.length + 1);
    expect(violations).toEqual([]);
  });

  it('main endgame (pos 341-394) is all Mastermind Classic L1-54', () => {
    for (let p = 341; p <= 394; p++) {
      const lv = UNIFIED_LADDER[p - 1];
      expect(lv.mode).toBe('classic');
      expect(lv.levelId.startsWith('w6-l')).toBe(true);
    }
    // Pos 400 is also Mastermind (Grand Master final, L55).
    expect(UNIFIED_LADDER[399].levelId).toBe('w6-l55');
    expect(UNIFIED_LADDER[399].mode).toBe('classic');
  });

  it('Endgame 20 boss tier (pos 395-399) is one boss per side mode', () => {
    const expected = [
      { position: 395, levelId: 'sr_boss',  mode: 'speed_recall' },
      { position: 396, levelId: 'sm_boss',  mode: 'snap_match' },
      { position: 397, levelId: 'seq_boss', mode: 'sequence' },
      { position: 398, levelId: 'cb_boss',  mode: 'counting_blitz' },
      { position: 399, levelId: 'cc_boss',  mode: 'colour_chain' },
    ];
    for (const e of expected) {
      const lv = UNIFIED_LADDER[e.position - 1];
      expect(lv.position).toBe(e.position);
      expect(lv.levelId).toBe(e.levelId);
      expect(lv.mode).toBe(e.mode);
    }
  });

  it('each mode internal order is preserved (W1L1 before W1L2 before W2L1, etc.)', () => {
    const perMode: Record<ModeId, string[]> = {
      classic: [], speed_recall: [], snap_match: [],
      sequence: [], counting_blitz: [], colour_chain: [],
    };
    for (const lv of UNIFIED_LADDER) perMode[lv.mode].push(lv.levelId);

    // Build expected per-mode order.
    const expected: Record<ModeId, string[]> = {
      classic: [],
      speed_recall: [],
      snap_match: [],
      sequence: [],
      counting_blitz: [],
      colour_chain: [],
    };
    const classicCounts = [20, 30, 35, 35, 40, 40];
    classicCounts.forEach((count, i) => {
      for (let l = 1; l <= count; l++) expected.classic.push(`w${i + 1}-l${l}`);
    });
    // Endgame 20: Mastermind L41-54 slot in at the end of the classic
    // chain (positions 381-394), then L55 at position 400. Internal
    // order is preserved: L41 < L42 < ... < L54 < L55.
    for (let l = 41; l <= 55; l++) expected.classic.push(`w6-l${l}`);

    const addSide = (mode: ModeId, prefix: string, perWorld: number[]) => {
      perWorld.forEach((count, i) => {
        for (let l = 1; l <= count; l++) expected[mode].push(`${prefix}_w${i + 1}_l${l}`);
      });
    };
    addSide('speed_recall', 'sr', [15, 15, 15]);
    addSide('snap_match', 'sm', [15, 15, 15]);
    addSide('sequence', 'seq', [12, 12, 12]);
    addSide('counting_blitz', 'cb', [15, 15]);
    addSide('colour_chain', 'cc', [12, 12]);
    // Endgame 20 boss tier: each side mode gets one boss level
    // appended at the tail of its sequence.
    expected.speed_recall.push('sr_boss');
    expected.snap_match.push('sm_boss');
    expected.sequence.push('seq_boss');
    expected.counting_blitz.push('cb_boss');
    expected.colour_chain.push('cc_boss');

    (Object.keys(expected) as ModeId[]).forEach((mode) => {
      expect(perMode[mode]).toEqual(expected[mode]);
    });
  });

  it('Mastermind (Classic W6) levels appear in 341-394 + 400 (with 395-399 reserved for boss tier)', () => {
    for (const lv of UNIFIED_LADDER) {
      if (/^w6-l/.test(lv.levelId)) {
        const inMainEndgame = lv.position >= 341 && lv.position <= 394;
        const isFinal = lv.position === 400;
        expect(inMainEndgame || isFinal).toBe(true);
      }
    }
    // 341-394 are mastermind L1-54.
    for (let p = 341; p <= 394; p++) {
      const lv = UNIFIED_LADDER[p - 1];
      expect(lv.levelId).toMatch(/^w6-l\d+$/);
      expect(lv.mode).toBe('classic');
    }
    // 400 is mastermind L55.
    expect(UNIFIED_LADDER[399].levelId).toBe('w6-l55');
  });

  it('world themes are assigned correctly by position range', () => {
    const byTheme: Record<WorldTheme, [number, number]> = {
      emerald_grove:  [1, 75],
      amber_dunes:    [76, 150],
      crystal_depths: [151, 225],
      aurora_peaks:   [226, 300],
      inferno_core:   [301, 400],
    };
    for (const lv of UNIFIED_LADDER) {
      const [s, e] = byTheme[lv.worldTheme];
      expect(lv.position).toBeGreaterThanOrEqual(s);
      expect(lv.position).toBeLessThanOrEqual(e);
    }
  });

  it('Classic appears in roughly 40-55% of positions (anchor mode)', () => {
    const classicCount = UNIFIED_LADDER.filter((l) => l.mode === 'classic').length;
    const pct = classicCount / UNIFIED_LADDER.length;
    // With 200 + 15 of 400 levels being Classic (incl. Mastermind L1-55),
    // share is ~54%.
    expect(pct).toBeGreaterThanOrEqual(0.4);
    expect(pct).toBeLessThanOrEqual(0.6);
  });

  it('getUnifiedLevel returns correct level for valid positions', () => {
    expect(getUnifiedLevel(1)?.levelId).toBe('w1-l1');
    expect(getUnifiedLevel(380)?.levelId).toBe('w6-l40');
    // Endgame 20: position 381 is mastermind L41, position 400 is L55.
    expect(getUnifiedLevel(381)?.levelId).toBe('w6-l41');
    expect(getUnifiedLevel(400)?.levelId).toBe('w6-l55');
    expect(getUnifiedLevel(0)).toBeUndefined();
    expect(getUnifiedLevel(401)).toBeUndefined();
  });

  it('getPositionForLevelId returns correct inverse', () => {
    expect(getPositionForLevelId('w1-l1')).toBe(1);
    expect(getPositionForLevelId('w6-l40')).toBe(380);
    expect(getPositionForLevelId('w6-l41')).toBe(381);
    expect(getPositionForLevelId('w6-l55')).toBe(400);
    expect(getPositionForLevelId('sr_boss')).toBe(395);
    expect(getPositionForLevelId('cc_boss')).toBe(399);
    expect(getPositionForLevelId('nonexistent')).toBeUndefined();
  });

  it('getWorldForPosition maps ranges correctly', () => {
    expect(getWorldForPosition(1)).toBe('emerald_grove');
    expect(getWorldForPosition(75)).toBe('emerald_grove');
    expect(getWorldForPosition(76)).toBe('amber_dunes');
    expect(getWorldForPosition(150)).toBe('amber_dunes');
    expect(getWorldForPosition(151)).toBe('crystal_depths');
    expect(getWorldForPosition(225)).toBe('crystal_depths');
    expect(getWorldForPosition(226)).toBe('aurora_peaks');
    expect(getWorldForPosition(300)).toBe('aurora_peaks');
    expect(getWorldForPosition(301)).toBe('inferno_core');
    expect(getWorldForPosition(380)).toBe('inferno_core');
    expect(getWorldForPosition(400)).toBe('inferno_core');
  });

  it('isWorldTransition flags positions 76, 151, 226, 301', () => {
    expect(isWorldTransition(76)).toBe(true);
    expect(isWorldTransition(151)).toBe(true);
    expect(isWorldTransition(226)).toBe(true);
    expect(isWorldTransition(301)).toBe(true);
    expect(isWorldTransition(75)).toBe(false);
    expect(isWorldTransition(150)).toBe(false);
    expect(isWorldTransition(1)).toBe(false);
    expect(isWorldTransition(380)).toBe(false);
    expect(isWorldTransition(400)).toBe(false);
  });

  it('isChapterStart detects mode transitions', () => {
    expect(isChapterStart(1)).toBe(true);
    expect(isChapterStart(6)).toBe(true); // Classic → SR
    expect(isChapterStart(9)).toBe(true); // SR → Classic
    expect(isChapterStart(2)).toBe(false); // Still Classic
    expect(isChapterStart(7)).toBe(false); // Still SR
  });

  it('getCurrentChapter returns the bounds of the current mode block', () => {
    const ch1 = getCurrentChapter(3);
    expect(ch1.mode).toBe('classic');
    expect(ch1.startPos).toBe(1);
    expect(ch1.endPos).toBe(5);

    const ch2 = getCurrentChapter(7);
    expect(ch2.mode).toBe('speed_recall');
    expect(ch2.startPos).toBe(6);
    expect(ch2.endPos).toBe(8);
  });

  it('getNextChapter returns the next mode block or null at end', () => {
    const next = getNextChapter(5); // Tail of first Classic chunk
    expect(next).not.toBeNull();
    expect(next!.mode).toBe('speed_recall');
    expect(next!.startPos).toBe(6);
    // The very last position (400 = Grand Master Trial) has no next.
    expect(getNextChapter(400)).toBeNull();
  });

  it('ladder uses every side-mode level at least once', () => {
    const ids = new Set(UNIFIED_LADDER.map((l) => l.levelId));
    // Sample a few side-mode levels to verify.
    expect(ids.has('sr_w3_l15')).toBe(true);
    expect(ids.has('sm_w3_l15')).toBe(true);
    expect(ids.has('seq_w3_l12')).toBe(true);
    expect(ids.has('cb_w2_l15')).toBe(true);
    expect(ids.has('cc_w2_l12')).toBe(true);
  });

  it('world theme metadata lines up with ranges', () => {
    expect(WORLD_THEMES.emerald_grove.range).toEqual([1, 75]);
    expect(WORLD_THEMES.amber_dunes.range).toEqual([76, 150]);
    expect(WORLD_THEMES.crystal_depths.range).toEqual([151, 225]);
    expect(WORLD_THEMES.aurora_peaks.range).toEqual([226, 300]);
    expect(WORLD_THEMES.inferno_core.range).toEqual([301, 400]);
    expect(WORLD_THEME_ORDER).toHaveLength(5);
  });
});
