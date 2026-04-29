/**
 * Unified Brain Journey — the single ordered curriculum of all 400 levels.
 *
 * This module replaces the old per-mode campaign gate with one linear ladder
 * that snakes through 5 visually themed worlds. Mode variety comes from
 * chapters of 3-5 consecutive same-mode levels rather than mode-level gates.
 *
 * Three sections:
 *   - Intro (pos 1-25): hand-crafted curriculum, hardcoded order
 *   - Main (pos 26-340): algorithmically interleaved Classic W1-W5 + side modes
 *   - Endgame (pos 341-380): 40 Mastermind levels (Classic W6)
 */

import overrides from './unifiedJourneyOverrides.json';

export type ModeId =
  | 'classic'
  | 'speed_recall'
  | 'snap_match'
  | 'sequence'
  | 'counting_blitz'
  | 'colour_chain';

export type WorldTheme =
  | 'emerald_grove'
  | 'amber_dunes'
  | 'crystal_depths'
  | 'aurora_peaks'
  | 'inferno_core';

export interface UnifiedLevel {
  position: number;
  levelId: string;
  mode: ModeId;
  worldTheme: WorldTheme;
}

export interface WorldThemeMeta {
  name: string;
  range: [number, number];
  color: string;
  worldNumber: number;
}

export const WORLD_THEMES: Record<WorldTheme, WorldThemeMeta> = {
  emerald_grove:  { name: 'Emerald Grove',  range: [1, 75],    color: '#2ECC71', worldNumber: 1 },
  amber_dunes:    { name: 'Amber Dunes',    range: [76, 150],  color: '#D4A012', worldNumber: 2 },
  crystal_depths: { name: 'Crystal Depths', range: [151, 225], color: '#0984E3', worldNumber: 3 },
  aurora_peaks:   { name: 'Aurora Peaks',   range: [226, 300], color: '#A29BFE', worldNumber: 4 },
  // Inferno Core extends through the original W6 (Mastermind L1-40)
  // AND the new Endgame 20 (positions 381-400). All endgame content
  // sits inside the same red-themed "core" world rather than a new
  // visual theme — it's a difficulty tier, not a new biome.
  inferno_core:   { name: 'Inferno Core',   range: [301, 400], color: '#FF6B6B', worldNumber: 5 },
};

export const WORLD_THEME_ORDER: WorldTheme[] = [
  'emerald_grove',
  'amber_dunes',
  'crystal_depths',
  'aurora_peaks',
  'inferno_core',
];

// Total ladder positions. 380 main campaign + Endgame 20 (positions
// 381-400). Endgame 20 = 14 Mastermind extension levels (L41-54) +
// 5 side-mode boss levels (one per side-mode discipline) + 1 final
// Grand Master Trial (Mastermind L55) at position 400.
export const TOTAL_POSITIONS = 400;

// Level counts per mode × per world, mirroring src/data/campaigns.ts.
const MODE_STRUCTURE: Record<ModeId, { levelsPerWorld: number[]; prefix: string }> = {
  classic:        { levelsPerWorld: [20, 30, 35, 35, 40, 40], prefix: '' },
  speed_recall:   { levelsPerWorld: [15, 15, 15],             prefix: 'sr' },
  snap_match:     { levelsPerWorld: [15, 15, 15],             prefix: 'sm' },
  sequence:       { levelsPerWorld: [12, 12, 12],             prefix: 'seq' },
  counting_blitz: { levelsPerWorld: [15, 15],                 prefix: 'cb' },
  colour_chain:   { levelsPerWorld: [12, 12],                 prefix: 'cc' },
};

function levelIdFor(mode: ModeId, world: number, level: number): string {
  if (mode === 'classic') return `w${world}-l${level}`;
  const prefix = MODE_STRUCTURE[mode].prefix;
  return `${prefix}_w${world}_l${level}`;
}

function modeLevelsInOrder(mode: ModeId): string[] {
  const ids: string[] = [];
  MODE_STRUCTURE[mode].levelsPerWorld.forEach((count, i) => {
    for (let l = 1; l <= count; l++) ids.push(levelIdFor(mode, i + 1, l));
  });
  return ids;
}

export function getWorldForPosition(position: number): WorldTheme {
  if (position <= 75) return 'emerald_grove';
  if (position <= 150) return 'amber_dunes';
  if (position <= 225) return 'crystal_depths';
  if (position <= 300) return 'aurora_peaks';
  return 'inferno_core';
}

// ----- Intro curriculum (positions 1-25) -----

interface IntroChunk { mode: ModeId; count: number; }

const INTRO_CURRICULUM: IntroChunk[] = [
  { mode: 'classic',        count: 5 }, // 1-5
  { mode: 'speed_recall',   count: 3 }, // 6-8
  { mode: 'classic',        count: 3 }, // 9-11
  { mode: 'snap_match',     count: 3 }, // 12-14
  { mode: 'classic',        count: 3 }, // 15-17
  { mode: 'sequence',       count: 3 }, // 18-20
  { mode: 'counting_blitz', count: 3 }, // 21-23
  { mode: 'colour_chain',   count: 2 }, // 24-25
];

function buildIntro(): { levels: UnifiedLevel[]; consumed: Record<ModeId, number> } {
  const consumed: Record<ModeId, number> = {
    classic: 0, speed_recall: 0, snap_match: 0,
    sequence: 0, counting_blitz: 0, colour_chain: 0,
  };
  const queues: Record<ModeId, string[]> = {
    classic: modeLevelsInOrder('classic'),
    speed_recall: modeLevelsInOrder('speed_recall'),
    snap_match: modeLevelsInOrder('snap_match'),
    sequence: modeLevelsInOrder('sequence'),
    counting_blitz: modeLevelsInOrder('counting_blitz'),
    colour_chain: modeLevelsInOrder('colour_chain'),
  };
  const levels: UnifiedLevel[] = [];
  let pos = 1;
  for (const chunk of INTRO_CURRICULUM) {
    for (let i = 0; i < chunk.count; i++) {
      const levelId = queues[chunk.mode][consumed[chunk.mode]];
      consumed[chunk.mode]++;
      levels.push({
        position: pos,
        levelId,
        mode: chunk.mode,
        worldTheme: getWorldForPosition(pos),
      });
      pos++;
    }
  }
  return { levels, consumed };
}

// ----- Main section (positions 26-340) -----

/**
 * Splits a per-mode level count into chapter sizes, each in [3, 5].
 * Uses base size 4 with remainder absorbed by expanding some chapters to 5
 * (or contracting to 3 if that gives a cleaner split).
 *
 * Examples: 149 → [5,5,...,5,4,4,...,4]; 42 → [5,5,4,4,4,4,4,4,4,4]; 22 → [4,4,4,4,3,3].
 */
function splitIntoChapters(total: number): number[] {
  if (total <= 0) return [];
  if (total < 3) return [total]; // Very small remainder, caller decides what to do.
  // Aim for ~4 per chapter, bias toward fewer chapters when remainder favours it.
  let numChapters = Math.round(total / 4);
  while (numChapters > 0 && total / numChapters > 5) numChapters++;
  while (numChapters > 1 && total / numChapters < 3) numChapters--;
  const base = Math.floor(total / numChapters);
  const remainder = total - base * numChapters;
  const sizes: number[] = [];
  for (let i = 0; i < numChapters; i++) {
    sizes.push(base + (i < remainder ? 1 : 0));
  }
  return sizes;
}

interface PendingChapter {
  mode: ModeId;
  levelIds: string[];
}

/**
 * Deterministic interleave: alternates Classic chapters with side-mode
 * chapters, rotating through side modes. Each chapter is 3-5 consecutive
 * levels of the same mode.
 *
 * Pre-splits each mode's remaining levels into fixed-size chapters first,
 * then picks chapters off those queues. This guarantees every chapter
 * is in [3, 5] and uses every level.
 */
function buildMainSection(alreadyConsumed: Record<ModeId, number>): UnifiedLevel[] {
  // Classic pre-mastermind queue (W1-W5 = 160 levels).
  const classicPreMastermind = modeLevelsInOrder('classic').slice(0, 160);

  const remainingLevels: Record<ModeId, string[]> = {
    classic: classicPreMastermind.slice(alreadyConsumed.classic),
    speed_recall: modeLevelsInOrder('speed_recall').slice(alreadyConsumed.speed_recall),
    snap_match: modeLevelsInOrder('snap_match').slice(alreadyConsumed.snap_match),
    sequence: modeLevelsInOrder('sequence').slice(alreadyConsumed.sequence),
    counting_blitz: modeLevelsInOrder('counting_blitz').slice(alreadyConsumed.counting_blitz),
    colour_chain: modeLevelsInOrder('colour_chain').slice(alreadyConsumed.colour_chain),
  };

  // Pre-build chapter queues per mode.
  const chapterQueues: Record<ModeId, PendingChapter[]> = {
    classic: [], speed_recall: [], snap_match: [],
    sequence: [], counting_blitz: [], colour_chain: [],
  };
  (Object.keys(remainingLevels) as ModeId[]).forEach((mode) => {
    const levels = remainingLevels[mode];
    const sizes = splitIntoChapters(levels.length);
    let cursor = 0;
    for (const size of sizes) {
      chapterQueues[mode].push({ mode, levelIds: levels.slice(cursor, cursor + size) });
      cursor += size;
    }
  });

  const sideOrder: ModeId[] = ['speed_recall', 'snap_match', 'sequence', 'counting_blitz', 'colour_chain'];
  const emitted: UnifiedLevel[] = [];
  let pos = 26;
  let lastMode: ModeId | null = null;
  let sideIdx = 0;
  let preferClassic = true;

  const takeSideChapter = (): PendingChapter | null => {
    for (let tries = 0; tries < sideOrder.length; tries++) {
      const m = sideOrder[(sideIdx + tries) % sideOrder.length];
      if (chapterQueues[m].length > 0 && m !== lastMode) {
        sideIdx = (sideOrder.indexOf(m) + 1) % sideOrder.length;
        return chapterQueues[m].shift()!;
      }
    }
    // Fallback: any side chapter (ignore lastMode constraint).
    for (let tries = 0; tries < sideOrder.length; tries++) {
      const m = sideOrder[(sideIdx + tries) % sideOrder.length];
      if (chapterQueues[m].length > 0) {
        sideIdx = (sideOrder.indexOf(m) + 1) % sideOrder.length;
        return chapterQueues[m].shift()!;
      }
    }
    return null;
  };

  const hasSideChapters = () => sideOrder.some((m) => chapterQueues[m].length > 0);

  while (true) {
    let chapter: PendingChapter | null = null;
    const classicAvailable = chapterQueues.classic.length > 0 && lastMode !== 'classic';
    const sideAvailable = hasSideChapters();

    if (preferClassic && classicAvailable) {
      chapter = chapterQueues.classic.shift()!;
    } else if (sideAvailable) {
      chapter = takeSideChapter();
      if (!chapter && classicAvailable) chapter = chapterQueues.classic.shift()!;
    } else if (chapterQueues.classic.length > 0) {
      // Only Classic left; accept consecutive Classic chapters.
      chapter = chapterQueues.classic.shift()!;
    }

    if (!chapter) break;

    for (const levelId of chapter.levelIds) {
      emitted.push({
        position: pos,
        levelId,
        mode: chapter.mode,
        worldTheme: getWorldForPosition(pos),
      });
      pos++;
    }
    lastMode = chapter.mode;
    preferClassic = chapter.mode !== 'classic';
  }

  return emitted;
}

// ----- Endgame (positions 341-400) -----
//
// Two tiers stacked here:
//   341-380: original W6 (Mastermind L1-40) — the main campaign capstone
//   381-400: Endgame 20 ("Mastermind Elite" + side-mode bosses) — for
//            players who beat the main 380 and want a real challenge
//
// Endgame 20 layout:
//   381-394: Mastermind L41-54 (14 levels — extends W6 with new
//            cognitive levers: 4-5 stages, 1.5s/stage, no hints,
//            subtle colour shifts, 7-shape layouts)
//   395:     Speed Recall Boss   (sr_boss)
//   396:     Snap Match Boss     (sm_boss)
//   397:     Sequence Boss       (seq_boss)
//   398:     Counting Blitz Boss (cb_boss)
//   399:     Colour Chain Boss   (cc_boss)
//   400:     Mastermind L55 — Grand Master Trial (the absolute apex)
//
// The 5 boss-level IDs must exist as rows in the Supabase
// `side_campaign_levels` table; SQL migration ships alongside this
// change. The Mastermind extension levels (L41-55) are pure data in
// `mastermindLevels.ts` and don't need a Supabase round-trip.

interface BossSlot {
  position: number;
  levelId: string;
  mode: ModeId;
}
const ENDGAME_BOSSES: BossSlot[] = [
  { position: 395, levelId: 'sr_boss',  mode: 'speed_recall' },
  { position: 396, levelId: 'sm_boss',  mode: 'snap_match' },
  { position: 397, levelId: 'seq_boss', mode: 'sequence' },
  { position: 398, levelId: 'cb_boss',  mode: 'counting_blitz' },
  { position: 399, levelId: 'cc_boss',  mode: 'colour_chain' },
];

function buildEndgame(): UnifiedLevel[] {
  const out: UnifiedLevel[] = [];

  // 341-380: original Mastermind L1-40 via the existing
  // modeLevelsInOrder slice (W1-5 = 160, so slice(160) gives W6 only).
  const mastermindMain = modeLevelsInOrder('classic').slice(160);
  mastermindMain.forEach((levelId, i) => {
    const pos = 341 + i;
    out.push({ position: pos, levelId, mode: 'classic', worldTheme: getWorldForPosition(pos) });
  });

  // 381-394: Mastermind L41-54 (the extension tier). IDs follow the
  // existing `w6-l{N}` convention so [levelId].tsx routes them through
  // the Mastermind game screen automatically.
  for (let mmLevel = 41; mmLevel <= 54; mmLevel++) {
    const pos = 381 + (mmLevel - 41);
    out.push({
      position: pos,
      levelId: `w6-l${mmLevel}`,
      mode: 'classic',
      worldTheme: getWorldForPosition(pos),
    });
  }

  // 395-399: side-mode boss levels — one per discipline.
  for (const boss of ENDGAME_BOSSES) {
    out.push({
      position: boss.position,
      levelId: boss.levelId,
      mode: boss.mode,
      worldTheme: getWorldForPosition(boss.position),
    });
  }

  // 400: Grand Master Trial — Mastermind L55.
  out.push({
    position: 400,
    levelId: 'w6-l55',
    mode: 'classic',
    worldTheme: getWorldForPosition(400),
  });

  return out;
}

// ----- Overrides -----

interface OverrideEntry {
  position: number;
  levelId: string;
  mode: ModeId;
}

function applyOverrides(ladder: UnifiedLevel[]): UnifiedLevel[] {
  const raw = (overrides as { overrides?: OverrideEntry[] }).overrides ?? [];
  if (raw.length === 0) return ladder;
  const map = new Map(ladder.map((l) => [l.position, l]));
  for (const ov of raw) {
    if (ov.position < 1 || ov.position > TOTAL_POSITIONS) continue;
    map.set(ov.position, {
      position: ov.position,
      levelId: ov.levelId,
      mode: ov.mode,
      worldTheme: getWorldForPosition(ov.position),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.position - b.position);
}

// ----- Ladder generation -----

function generateLadder(): UnifiedLevel[] {
  const intro = buildIntro();
  const main = buildMainSection(intro.consumed);
  const end = buildEndgame();
  const combined = [...intro.levels, ...main, ...end];
  return applyOverrides(combined);
}

export const UNIFIED_LADDER: UnifiedLevel[] = generateLadder();

// ----- Helpers -----

const POSITION_BY_ID = new Map<string, number>(
  UNIFIED_LADDER.map((l) => [l.levelId, l.position])
);

export function getUnifiedLevel(position: number): UnifiedLevel | undefined {
  if (position < 1 || position > TOTAL_POSITIONS) return undefined;
  return UNIFIED_LADDER[position - 1];
}

export function getPositionForLevelId(levelId: string): number | undefined {
  return POSITION_BY_ID.get(levelId);
}

export interface Chapter {
  mode: ModeId;
  startPos: number;
  endPos: number;
}

export function getCurrentChapter(position: number): Chapter {
  const level = getUnifiedLevel(position);
  if (!level) return { mode: 'classic', startPos: position, endPos: position };
  let start = position;
  while (start > 1) {
    const prev = getUnifiedLevel(start - 1);
    if (!prev || prev.mode !== level.mode) break;
    start--;
  }
  let end = position;
  while (end < TOTAL_POSITIONS) {
    const next = getUnifiedLevel(end + 1);
    if (!next || next.mode !== level.mode) break;
    end++;
  }
  return { mode: level.mode, startPos: start, endPos: end };
}

export function getNextChapter(position: number): Chapter | null {
  const current = getCurrentChapter(position);
  if (current.endPos >= TOTAL_POSITIONS) return null;
  return getCurrentChapter(current.endPos + 1);
}

export function isChapterStart(position: number): boolean {
  if (position <= 1) return true;
  const current = getUnifiedLevel(position);
  const prev = getUnifiedLevel(position - 1);
  if (!current || !prev) return true;
  return current.mode !== prev.mode;
}

export function isWorldTransition(position: number): boolean {
  return position === 76 || position === 151 || position === 226 || position === 301;
}

export function getHalfwayPositions(): number[] {
  return WORLD_THEME_ORDER.map((theme) => {
    const [start, end] = WORLD_THEMES[theme].range;
    return Math.floor((start + end) / 2);
  });
}

export function isHalfwayPosition(position: number): boolean {
  return getHalfwayPositions().includes(position);
}
