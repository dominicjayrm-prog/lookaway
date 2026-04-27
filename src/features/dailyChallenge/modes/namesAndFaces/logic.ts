/**
 * Names & Faces (aka Meet Blink's Friends) — pure logic.
 *
 * Player meets N visually-distinct Blinks with names underneath
 * each, memorises for 8s (Tue, easy) or 10s (Sat, hard), the
 * Blinks mingle physically across the screen, then they reappear
 * shuffled without names. Player tap-pairs each Blink with its
 * name from a chip row.
 *
 * Difficulty by day-of-week (per Phase 4 plan, Tue + Sat slots):
 *   Tue: 4 characters, 8.0s memorise
 *   Sat: 6 characters, 10.0s memorise
 *
 * (Other days route to phone_number / what_changed via the
 * rotation table, so we'll never actually be called outside Tue
 * or Sat — the table is here as a defensive default.)
 *
 * Generation is deterministic from the date seed XOR'd with a
 * per-mode salt so this mode's RNG sequence is decorrelated from
 * the other modes' sequences on the same date.
 */
import type { BlinkExpression } from '@/src/components/Blink';
import { t } from '@/src/i18n';
import { createSeededRng, dateToSeed, todayUtcIso, utcDayOfWeek, type SeededRng } from '../../seededRandom';
import { getModeDisplayName, getModeRevealSubtitle } from '../../modeRotation';
import type { DailyChallengeInstance } from '../../types';
import { DISTINCT_EXPRESSIONS, DISTINCT_FRAMES, MAX_CHARACTERS_PER_PUZZLE, type FrameVariant } from './characterBank';
import { NAME_BANK } from './nameBank';

/** A single character on the puzzle: a Blink expression, a frame
 *  ring colour, and a name. Position-of-character on the memorise
 *  grid is implied by index in `characters`. */
export interface NamesAndFacesCharacter {
  expression: BlinkExpression;
  frame: FrameVariant;
  name: string;
}

export interface NamesAndFacesConfig {
  /** Memorise window in seconds. */
  viewSeconds: number;
  /** Number of characters in the puzzle. */
  numCharacters: number;
  /** Characters in memorise display order. */
  characters: readonly NamesAndFacesCharacter[];
  /** Permutation indexes used by the recall view. recallOrder[i] is
   *  the index into `characters` that should appear in slot i of
   *  the shuffled-recall grid. The mingle animation tweens each
   *  Blink from its memorise position to its recall position. */
  recallOrder: readonly number[];
}

interface DifficultySpec {
  numCharacters: number;
  viewSeconds: number;
}

/** Difficulty by day-of-week. Sun=0..Sat=6 to match
 *  `Date.getUTCDay()`. Only Tue + Sat are reachable under the
 *  current rotation table; the rest are defensive defaults so a
 *  future rotation reshuffle doesn't crash on a missing key. */
const DIFFICULTY_BY_DOW: Record<number, DifficultySpec> = {
  0: { numCharacters: 5, viewSeconds: 9.0 },  // Sun (defensive default)
  1: { numCharacters: 4, viewSeconds: 8.0 },  // Mon (defensive default)
  2: { numCharacters: 4, viewSeconds: 8.0 },  // Tue — easy slot
  3: { numCharacters: 5, viewSeconds: 9.0 },  // Wed (defensive)
  4: { numCharacters: 5, viewSeconds: 9.0 },  // Thu (defensive)
  5: { numCharacters: 5, viewSeconds: 9.0 },  // Fri (defensive)
  6: { numCharacters: 6, viewSeconds: 10.0 }, // Sat — hard slot
};

/** Levenshtein distance — minimum number of single-character edits
 *  (insertion, deletion, substitution) to turn `a` into `b`. Used
 *  for the same-puzzle similarity guard so two near-identical
 *  names ("Sarah" + "Sara") never co-appear and unfairly punish
 *  the player. Iterative DP, O(|a| * |b|) time, |b|+1 space.
 *  Inlined rather than depending on a library so the bank stays
 *  self-contained. */
export function levenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const aLow = a.toLowerCase();
  const bLow = b.toLowerCase();
  // Single rolling row of the DP table — column j holds the
  // distance from a[0..i] to b[0..j].
  let prev = new Array<number>(bl + 1);
  let curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = aLow.charCodeAt(i - 1) === bLow.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insertion
        prev[j] + 1,            // deletion
        prev[j - 1] + cost,     // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

/** Minimum allowed Levenshtein distance between any two names in
 *  the same puzzle. 3 means "Sarah" / "Sara" (distance 1) and
 *  "Aiden" / "Eden" (distance 2) can never co-appear, but
 *  "Sarah" / "Lucia" (distance 5) is fine. The choice of 3 is
 *  conservative — most genuinely confusing pairs sit at distance
 *  1-2. */
const MIN_NAME_DISTANCE = 3;

/** Pick `count` items from a deck via a seeded shuffle, returning
 *  the prefix slice. Stable order across calls with the same
 *  seed. */
function pickN<T>(rng: SeededRng, deck: readonly T[], count: number): T[] {
  return rng.shuffle(deck).slice(0, count);
}

/** Pick `count` names from the bank such that every pair of
 *  selected names has Levenshtein distance >= MIN_NAME_DISTANCE.
 *  Walks the bank in seeded-shuffle order and accumulates names
 *  that satisfy the constraint against the already-picked set,
 *  rejecting any that would violate it. With a 200-name bank and
 *  a 6-name target, the rejection rate stays low — most pairs
 *  inside the bank already exceed distance 3. If the walk
 *  exhausts the bank without reaching `count` (extremely
 *  unlikely), we fall back to whatever we accumulated; the
 *  recall view tolerates fewer names gracefully. */
function pickDistinctNames(rng: SeededRng, count: number): string[] {
  const order = rng.shuffle(NAME_BANK);
  const picked: string[] = [];
  for (const candidate of order) {
    if (picked.every((existing) => levenshteinDistance(candidate, existing) >= MIN_NAME_DISTANCE)) {
      picked.push(candidate);
      if (picked.length === count) return picked;
    }
  }
  return picked;
}

export function generateNamesAndFacesConfig(date: Date = new Date()): NamesAndFacesConfig {
  const seed = dateToSeed(date);
  // Per-mode salt to decorrelate from phone_number + what_changed
  // RNG sequences on the same date. The constant is just a
  // memorable hex tag with no semantic meaning ("FACE FACE").
  const rng = createSeededRng(seed ^ 0xFA_CE_FA_CE);
  const dow = utcDayOfWeek(date);
  const spec = DIFFICULTY_BY_DOW[dow] ?? DIFFICULTY_BY_DOW[2];
  // Cap at the sized buffers in the bank so a future rotation
  // change to a higher difficulty can't request more than we can
  // legitimately serve.
  const n = Math.min(spec.numCharacters, MAX_CHARACTERS_PER_PUZZLE, DISTINCT_EXPRESSIONS.length, DISTINCT_FRAMES.length);

  const expressions = pickN(rng, DISTINCT_EXPRESSIONS, n);
  const frames = pickN(rng, DISTINCT_FRAMES, n);
  const names = pickDistinctNames(rng, n);

  const characters: NamesAndFacesCharacter[] = [];
  for (let i = 0; i < n; i++) {
    characters.push({
      expression: expressions[i],
      frame: frames[i],
      // Defensive fallback if the name bank somehow returns
      // fewer entries than `n` (shouldn't happen with a 200-name
      // pool and Lev-3 guard, but the recall view shouldn't
      // crash if it does). i18n-keyed so the fallback respects
      // the active locale.
      name: names[i] ?? t('daily_challenge.names_and_faces.friend_fallback', { n: i + 1 }),
    });
  }

  // Recall order: indexes [0..n-1] shuffled. The constraint is
  // "not the same order as memorise" — re-roll until the
  // permutation isn't the identity. With n >= 4 the chance of
  // the identity coming up once is 1/n!, twice is (1/n!)^2; in
  // practice this loop hits 0-1 iterations.
  let recallOrder = rng.shuffle(Array.from({ length: n }, (_, i) => i));
  let identityGuard = 0;
  while (recallOrder.every((v, i) => v === i) && identityGuard < 5) {
    recallOrder = rng.shuffle(recallOrder);
    identityGuard++;
  }

  return {
    viewSeconds: spec.viewSeconds,
    numCharacters: n,
    characters,
    recallOrder,
  };
}

export function buildNamesAndFacesInstance(date: Date = new Date()): DailyChallengeInstance<NamesAndFacesConfig> {
  return {
    mode: 'names_and_faces',
    challengeDate: todayUtcIso(date),
    config: generateNamesAndFacesConfig(date),
    reveal: {
      title: getModeDisplayName('names_and_faces'),
      subtitle: getModeRevealSubtitle('names_and_faces'),
      // 'love' Blink reads as "warm + welcoming friends" which is
      // the right energy for the meet-people mode. detective is
      // already taken by what_changed; celebrate is too celebratory
      // for a memorise-this-name reveal.
      blinkExpression: 'love',
    },
  };
}

// ─── Scoring ────────────────────────────────────────────────────

export interface NamesAndFacesScored {
  score: number;
  /** For each character (in memorise order): true if the player
   *  paired the correct name to it. */
  correctness: boolean[];
  correctCount: number;
  totalCount: number;
}

/** `pairedNameByCharIdx[i]` is the name the player attached to
 *  character i (in memorise order). undefined = no pair (counts
 *  wrong). The recall view lays the grid in `recallOrder` but the
 *  scoring is over the original character indexes so the
 *  correctness array maps cleanly to the share card visual. */
export function scoreNamesAndFacesAttempt(
  config: NamesAndFacesConfig,
  pairedNameByCharIdx: readonly (string | undefined)[],
): NamesAndFacesScored {
  const total = config.numCharacters;
  const correctness: boolean[] = [];
  let correctCount = 0;
  for (let i = 0; i < total; i++) {
    const expected = config.characters[i].name;
    const paired = pairedNameByCharIdx[i];
    const correct = !!paired && paired === expected;
    correctness.push(correct);
    if (correct) correctCount++;
  }
  const score = Math.round((correctCount / Math.max(1, total)) * 100);
  return {
    score: Math.max(0, Math.min(100, score)),
    correctness,
    correctCount,
    totalCount: total,
  };
}

/** Share card emoji blocks per Phase 4 design:
 *    🟪 = correctly remembered, ⬛ = forgot
 *  One emoji per character, in memorise order. Correct first,
 *  then wrong (consistent with phone_number + what_changed
 *  conventions). */
export function namesAndFacesEmojiBlocks(scored: NamesAndFacesScored): string {
  return '🟪'.repeat(scored.correctCount) + '⬛'.repeat(scored.totalCount - scored.correctCount);
}
