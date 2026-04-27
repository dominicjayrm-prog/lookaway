/**
 * What Changed? mode — pure logic.
 *
 * A grid of emoji is shown for a few seconds, the player memorises
 * it, the grid disappears, then it reappears with 1-3 cells changed.
 * The player taps the cells they think changed.
 *
 * Difficulty by day-of-week (per spec 3.1):
 *   Mon/Tue: 3x3 grid, 7 emoji, 1 change, 5.0s memorise
 *   Wed/Thu: 4x4 grid, 10 emoji, 2 changes, 6.0s
 *   Fri/Sat: 4x4 grid, 12 emoji, 2 changes, 5.5s
 *   Sun:     5x4 grid, 14 emoji, 3 changes, 6.0s
 *
 * (The current rotation has Phone Number on Mon/Wed/Fri/Sun, so
 * What Changed actually plays Tue/Thu/Sat. The Sun bucket is kept
 * dormant for when rotation evolves.)
 *
 * All generation is deterministic from the date seed so every
 * player on Earth gets the same puzzle on the same UTC date.
 */
import { createSeededRng, dateToSeed, todayUtcIso, utcDayOfWeek, type SeededRng } from '../../seededRandom';
import { getModeDisplayName, getModeRevealSubtitle } from '../../modeRotation';
import { EMOJI_CATEGORIES } from './emojiBank';
import type { DailyChallengeInstance } from '../../types';

export interface WhatChangedConfig {
  rows: number;
  cols: number;
  /** Memorise window in seconds. */
  viewSeconds: number;
  /** Number of cells the player has to find. */
  numChanges: number;
  /** Original layout: cellIndex -> emoji or null (empty cell).
   *  cellIndex = row * cols + col. */
  original: (string | null)[];
  /** Modified layout: same shape, with `numChanges` cells differing
   *  from `original`. */
  modified: (string | null)[];
  /** Indexes (in row-major order) of the cells that differ. Length
   *  = numChanges. Used for scoring + reveal animation. */
  changedIndexes: number[];
  /** Category id used for the puzzle. Surfaced in the share card
   *  visual + accessibility hint. */
  categoryId: string;
}

interface DifficultySpec {
  rows: number;
  cols: number;
  filledCells: number;
  numChanges: number;
  viewSeconds: number;
}

/** Difficulty by day-of-week. Indexed Sunday=0..Saturday=6 to match
 *  Date.getUTCDay() so the rotation table doesn't need translation. */
const DIFFICULTY_BY_DOW: Record<number, DifficultySpec> = {
  0: { rows: 5, cols: 4, filledCells: 14, numChanges: 3, viewSeconds: 6.0 }, // Sun (dormant under current rotation)
  1: { rows: 3, cols: 3, filledCells: 7,  numChanges: 1, viewSeconds: 5.0 }, // Mon
  2: { rows: 3, cols: 3, filledCells: 7,  numChanges: 1, viewSeconds: 5.0 }, // Tue
  3: { rows: 4, cols: 4, filledCells: 10, numChanges: 2, viewSeconds: 6.0 }, // Wed
  4: { rows: 4, cols: 4, filledCells: 10, numChanges: 2, viewSeconds: 6.0 }, // Thu
  5: { rows: 4, cols: 4, filledCells: 12, numChanges: 2, viewSeconds: 5.5 }, // Fri
  6: { rows: 4, cols: 4, filledCells: 12, numChanges: 2, viewSeconds: 5.5 }, // Sat
};

function neighborsOf(idx: number, rows: number, cols: number): number[] {
  const r = Math.floor(idx / cols);
  const c = idx % cols;
  const out: number[] = [];
  if (r > 0) out.push(idx - cols);
  if (r < rows - 1) out.push(idx + cols);
  if (c > 0) out.push(idx - 1);
  if (c < cols - 1) out.push(idx + 1);
  return out;
}

/** Pick `count` unique entries from a deck via a seeded shuffle.
 *  Returns the slice of the shuffled deck so the order is stable. */
function pickN<T>(rng: SeededRng, deck: readonly T[], count: number): T[] {
  return rng.shuffle(deck).slice(0, count);
}

export function generateWhatChangedConfig(date: Date = new Date()): WhatChangedConfig {
  const seed = dateToSeed(date);
  // XOR with a salt unique to this mode so What Changed and Phone
  // Number generated from the same date seed don't share an RNG
  // sequence (would make the puzzles weirdly correlated).
  const rng = createSeededRng(seed ^ 0xC4_AC_CE_D5);
  const dow = utcDayOfWeek(date);
  const spec = DIFFICULTY_BY_DOW[dow] ?? DIFFICULTY_BY_DOW[1];
  const totalCells = spec.rows * spec.cols;
  // Need ~1.3x the filled count of unique emoji so the swap-style
  // changes have spare candidates. Cap at the chosen category size.
  const targetUnique = Math.ceil(spec.filledCells * 1.3);

  // Pick a category big enough to satisfy targetUnique. If we land
  // on a small category by chance, walk forward until we find one.
  const categoryOrder = rng.shuffle(EMOJI_CATEGORIES);
  const category =
    categoryOrder.find((c) => c.emoji.length >= targetUnique) ??
    categoryOrder.reduce((best, c) => (c.emoji.length > best.emoji.length ? c : best), categoryOrder[0]);

  const sampledEmoji = pickN(rng, category.emoji, Math.min(targetUnique, category.emoji.length));

  // Fill `filledCells` random cells with the first `filledCells`
  // emoji from the sample. The remaining sampled emoji are the
  // "spare pool" used for swap-changes.
  const allCellIndexes = Array.from({ length: totalCells }, (_, i) => i);
  const filledIndexes = rng.shuffle(allCellIndexes).slice(0, spec.filledCells);
  const filledIndexSet = new Set(filledIndexes);
  const original: (string | null)[] = Array.from({ length: totalCells }, () => null);
  filledIndexes.forEach((cellIdx, i) => {
    original[cellIdx] = sampledEmoji[i];
  });
  const sparePool = sampledEmoji.slice(spec.filledCells);

  // Generate `numChanges` changes. Constraints:
  //   - No two changed cells are adjacent (avoids ambiguous "did I
  //     see this?" feeling).
  //   - Mix change types when numChanges >= 2 for harder days.
  // Change types:
  //   'swap'  - cell had an emoji, swap to a new one from sparePool
  //   'clear' - cell had an emoji, becomes empty
  //   'add'   - cell was empty, gains an emoji from sparePool
  type ChangeType = 'swap' | 'clear' | 'add';
  const modified = original.slice();
  const changedIndexes: number[] = [];
  const sparePoolMutable = sparePool.slice();

  const candidateOrder = rng.shuffle(allCellIndexes);
  let typeIndex = 0;
  // Bias the type rotation by changes-needed: 1-change days use
  // whichever type the rng picks first; 2+ change days alternate
  // intentionally so we never end up with two swaps in a row.
  const typesByCount: Record<number, ChangeType[]> = {
    1: ['swap', 'clear', 'add'],
    2: rng.next() < 0.5 ? ['swap', 'clear'] : ['swap', 'add'],
    3: ['swap', 'clear', 'add'],
  };
  const typePlan = typesByCount[spec.numChanges] ?? ['swap'];

  for (const cellIdx of candidateOrder) {
    if (changedIndexes.length >= spec.numChanges) break;
    // Adjacency guard: skip if any already-changed cell is a
    // neighbour of this one.
    const blockedByAdjacent = changedIndexes.some((c) => neighborsOf(cellIdx, spec.rows, spec.cols).includes(c));
    if (blockedByAdjacent) continue;

    const desiredType = typePlan[typeIndex % typePlan.length];
    const isFilled = filledIndexSet.has(cellIdx);
    let appliedType: ChangeType | null = null;
    if (desiredType === 'swap' && isFilled && sparePoolMutable.length > 0) {
      const swapEmoji = sparePoolMutable.shift()!;
      modified[cellIdx] = swapEmoji;
      appliedType = 'swap';
    } else if (desiredType === 'clear' && isFilled) {
      modified[cellIdx] = null;
      appliedType = 'clear';
    } else if (desiredType === 'add' && !isFilled && sparePoolMutable.length > 0) {
      modified[cellIdx] = sparePoolMutable.shift()!;
      appliedType = 'add';
    }

    // If the cell didn't fit the desired type, fall back to
    // whichever of the other types DOES work for this cell.
    if (!appliedType) {
      if (isFilled && sparePoolMutable.length > 0) {
        modified[cellIdx] = sparePoolMutable.shift()!;
        appliedType = 'swap';
      } else if (isFilled) {
        modified[cellIdx] = null;
        appliedType = 'clear';
      } else if (!isFilled && sparePoolMutable.length > 0) {
        modified[cellIdx] = sparePoolMutable.shift()!;
        appliedType = 'add';
      }
    }

    if (appliedType) {
      changedIndexes.push(cellIdx);
      typeIndex++;
    }
  }

  // Solvability sanity check. If our constraints exhausted the
  // candidate list before we could place all changes (very unlikely
  // on a 3x3+ grid with proper sparePool), the generator falls
  // through with however many it managed. The recall view gates on
  // changedIndexes.length so a degenerate case doesn't crash; it
  // just means a slightly easier puzzle for that one day.
  return {
    rows: spec.rows,
    cols: spec.cols,
    viewSeconds: spec.viewSeconds,
    numChanges: changedIndexes.length || 1,
    original,
    modified,
    changedIndexes,
    categoryId: category.id,
  };
}

export function buildWhatChangedInstance(date: Date = new Date()): DailyChallengeInstance<WhatChangedConfig> {
  return {
    mode: 'what_changed',
    challengeDate: todayUtcIso(date),
    config: generateWhatChangedConfig(date),
    reveal: {
      title: getModeDisplayName('what_changed'),
      subtitle: getModeRevealSubtitle('what_changed'),
      // detective expression has prominent eyes and reads as
      // "observing", which is the right energy for this mode.
      blinkExpression: 'detective',
    },
  };
}

// ─── Scoring ────────────────────────────────────────────────────

export interface WhatChangedScored {
  score: number;
  /** For each changed cell: was it tapped? (matches changedIndexes order) */
  changeTapped: boolean[];
  /** Cells the player tapped that DIDN'T change. */
  incorrectTaps: number[];
  /** Cells the player should have tapped but didn't. */
  missedChanges: number[];
  correctCount: number;
  incorrectCount: number;
  missedCount: number;
}

/** Score per spec 3.3:
 *    +1 per correct tap, -0.5 per incorrect tap, missed = 0
 *    score = max(0, points) / numChanges * 100, rounded
 */
export function scoreWhatChangedAttempt(
  config: WhatChangedConfig,
  tappedIndexes: readonly number[],
): WhatChangedScored {
  const changedSet = new Set(config.changedIndexes);
  const tappedSet = new Set(tappedIndexes);
  const correctTaps = tappedIndexes.filter((i) => changedSet.has(i));
  const incorrectTaps = tappedIndexes.filter((i) => !changedSet.has(i));
  const missedChanges = config.changedIndexes.filter((i) => !tappedSet.has(i));
  const points = Math.max(0, correctTaps.length - 0.5 * incorrectTaps.length);
  const score = Math.round((points / Math.max(1, config.numChanges)) * 100);
  const changeTapped = config.changedIndexes.map((i) => tappedSet.has(i));
  return {
    score: Math.max(0, Math.min(100, score)),
    changeTapped,
    incorrectTaps,
    missedChanges,
    correctCount: correctTaps.length,
    incorrectCount: incorrectTaps.length,
    missedCount: missedChanges.length,
  };
}

/** Share card emoji blocks per spec 3.7:
 *    🟪 correct, ⬛ incorrect tap, ⬜ missed change
 *  Order: correct first, then incorrects, then misses. */
export function whatChangedEmojiBlocks(scored: WhatChangedScored): string {
  return (
    '🟪'.repeat(scored.correctCount) +
    '⬛'.repeat(scored.incorrectCount) +
    '⬜'.repeat(scored.missedCount)
  );
}
