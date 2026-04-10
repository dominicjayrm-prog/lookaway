/**
 * Memory Analytics — pure computation helpers for the Stats Space screen.
 *
 * The spec calls for per-question response time and per-question-type accuracy,
 * neither of which the game currently stores. Until that tracking exists, we
 * approximate each stat from what IS available in the store:
 *   - levelProgress (per-level stars, bestScore, attempts)
 *   - completedScores (rolling list of the last ~500 level scores)
 *   - bestStreak, daysPlayed, totalStars, highestWorld
 *
 * Level IDs follow these prefixes (see `app/world/side-world.tsx`):
 *   Classic        → `w{1..6}-l{N}`
 *   Speed Recall   → `sr-w{N}-l{N}`
 *   Snap Match     → `sm-w{N}-l{N}`
 *   Sequence       → `seq-w{N}-l{N}`
 *   Counting Blitz → `cb-w{N}-l{N}`
 *   Colour Chain   → `cc-w{N}-l{N}`
 */

export type GameModeId = 'classic' | 'speed_recall' | 'snap_match' | 'sequence' | 'counting_blitz' | 'colour_chain';

export interface LevelProgressEntry {
  stars: number;
  bestScore: number;
  attempts: number;
}

export interface AnalyticsInput {
  levelProgress: Record<string, LevelProgressEntry>;
  completedScores: number[];
  streakCount: number;
  bestStreak: number;
  daysPlayed: number;
  totalStars: number;
  highestWorld: number;
}

function classifyLevel(levelId: string): GameModeId {
  if (levelId.startsWith('sr-')) return 'speed_recall';
  if (levelId.startsWith('sm-')) return 'snap_match';
  if (levelId.startsWith('seq-')) return 'sequence';
  if (levelId.startsWith('cb-')) return 'counting_blitz';
  if (levelId.startsWith('cc-')) return 'colour_chain';
  return 'classic';
}

interface ModeAggregate {
  levels: number;
  totalScore: number;
  totalStars: number;
  threeStarCount: number;
}

function aggregateByMode(levelProgress: Record<string, LevelProgressEntry>): Record<GameModeId, ModeAggregate> {
  const out: Record<GameModeId, ModeAggregate> = {
    classic: { levels: 0, totalScore: 0, totalStars: 0, threeStarCount: 0 },
    speed_recall: { levels: 0, totalScore: 0, totalStars: 0, threeStarCount: 0 },
    snap_match: { levels: 0, totalScore: 0, totalStars: 0, threeStarCount: 0 },
    sequence: { levels: 0, totalScore: 0, totalStars: 0, threeStarCount: 0 },
    counting_blitz: { levels: 0, totalScore: 0, totalStars: 0, threeStarCount: 0 },
    colour_chain: { levels: 0, totalScore: 0, totalStars: 0, threeStarCount: 0 },
  };
  for (const [id, p] of Object.entries(levelProgress)) {
    const mode = classifyLevel(id);
    out[mode].levels += 1;
    out[mode].totalScore += p.bestScore;
    out[mode].totalStars += p.stars;
    if (p.stars === 3) out[mode].threeStarCount += 1;
  }
  return out;
}

function modeAvgScore(agg: ModeAggregate): number {
  if (agg.levels === 0) return 0;
  return Math.round(agg.totalScore / agg.levels);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ─── Memory score (weighted aggregate) ─────────────────────────────────

export function computeMemoryScore(input: AnalyticsInput): number {
  const { levelProgress, completedScores, bestStreak, totalStars } = input;
  const levelEntries = Object.values(levelProgress);
  if (levelEntries.length === 0 && completedScores.length === 0) return 0;

  // Accuracy = running average of all completed level scores
  const accuracy = completedScores.length
    ? completedScores.reduce((a, v) => a + v, 0) / completedScores.length
    : 0;

  // Average star rating (0-3) → map to 0-100
  const avgStars = levelEntries.length
    ? levelEntries.reduce((a, e) => a + e.stars, 0) / levelEntries.length
    : 0;
  const starScore = (avgStars / 3) * 100;

  // Consistency = best streak as a fraction of a reasonable ceiling
  const consistencyScore = clamp((bestStreak / 14) * 100, 0, 100);

  // Speed proxy — we don't track response times yet, so approximate from
  // score quality (higher scores → faster, more decisive play).
  const speedScore = clamp(accuracy * 0.95, 0, 100);

  // Completion — 3★ rate is a better proxy than raw level count because the
  // total-level target is fluid as new content ships.
  const threeStarCount = levelEntries.filter((e) => e.stars === 3).length;
  const completionScore = levelEntries.length
    ? clamp((threeStarCount / levelEntries.length) * 100, 0, 100)
    : clamp(totalStars / 3, 0, 100);

  const score = Math.round(
    accuracy * 0.30 +
      starScore * 0.20 +
      consistencyScore * 0.20 +
      speedScore * 0.15 +
      completionScore * 0.15,
  );
  return clamp(score, 0, 100);
}

// ─── "Top X%" estimation ───────────────────────────────────────────────
// Rough local mapping. A real percentile would come from a server-side
// aggregation over all player memory scores.

export function estimatePercentile(memoryScore: number): number {
  // Map memory score → percentile bucket. The mapping is intentionally
  // generous at the top so every decent player feels rewarded; this matches
  // the "Top 15%" ambition in the spec.
  if (memoryScore >= 90) return 3;
  if (memoryScore >= 80) return 8;
  if (memoryScore >= 70) return 15;
  if (memoryScore >= 60) return 25;
  if (memoryScore >= 50) return 40;
  if (memoryScore >= 40) return 55;
  if (memoryScore >= 25) return 70;
  return 85;
}

// ─── Stat cards ────────────────────────────────────────────────────────

export interface StatCardValues {
  accuracy: number;      // %
  bestStreak: number;    // days
  stars: number;         // total stars
  levelsDone: number;    // completed levels
  avgSpeed: number;      // seconds (1 decimal)
  daysActive: number;    // days played
}

export function computeStatCards(input: AnalyticsInput): StatCardValues {
  const { levelProgress, completedScores, bestStreak, totalStars, daysPlayed } = input;
  const levelEntries = Object.values(levelProgress);
  const accuracy = completedScores.length
    ? Math.round(completedScores.reduce((a, v) => a + v, 0) / completedScores.length)
    : 0;

  // Speed approximation: better players answer faster on average. Map 0%
  // accuracy → ~3.0s, 100% → ~0.9s. Until real timing data is recorded we
  // show this as a derived proxy so the card doesn't feel empty.
  const avgSpeed = levelEntries.length
    ? Math.max(0.9, Math.round((3.0 - (accuracy / 100) * 2.1) * 10) / 10)
    : 0;

  return {
    accuracy,
    bestStreak,
    stars: totalStars,
    levelsDone: levelEntries.length,
    avgSpeed,
    daysActive: daysPlayed,
  };
}

// ─── Brain profile (6-axis radar) ──────────────────────────────────────

export interface BrainProfile {
  visual: number;
  spatial: number;
  sequence: number;
  speed: number;
  focus: number;
  consistency: number;
}

export type BrainProfileKey = keyof BrainProfile;

export function computeBrainProfile(input: AnalyticsInput): BrainProfile {
  const { levelProgress, bestStreak, daysPlayed } = input;
  const byMode = aggregateByMode(levelProgress);
  const levelEntries = Object.values(levelProgress);

  // Visual — shape/colour recognition. Classic mode is the canonical shape +
  // colour test. Fall back to overall average if the player hasn't touched
  // Classic yet.
  const visual = byMode.classic.levels > 0
    ? modeAvgScore(byMode.classic)
    : Math.round(
        levelEntries.length
          ? levelEntries.reduce((a, e) => a + e.bestScore, 0) / levelEntries.length
          : 0,
      );

  // Spatial — position-based. Speed Recall asks "where was each item?" so
  // its avg score is the best spatial proxy we have.
  const spatial = modeAvgScore(byMode.speed_recall);

  // Sequence — direct from Sequence mode.
  const sequence = modeAvgScore(byMode.sequence);

  // Speed — Snap Match and Counting Blitz are both time-pressured modes.
  // Use their combined average.
  const speedLevels = byMode.snap_match.levels + byMode.counting_blitz.levels;
  const speed = speedLevels > 0
    ? Math.round(
        (byMode.snap_match.totalScore + byMode.counting_blitz.totalScore) / speedLevels,
      )
    : 0;

  // Focus — proxied by 3★ rate across all modes. Only players who stayed
  // sharp on the later questions in a level end up with 3 stars, so 3★
  // ratio is the best focus signal available without per-question data.
  const threeStars = levelEntries.filter((e) => e.stars === 3).length;
  const focus = levelEntries.length > 0
    ? clamp(Math.round((threeStars / levelEntries.length) * 100), 0, 100)
    : 0;

  // Consistency — daily play frequency + best streak (as specced).
  const streakFactor = clamp(bestStreak / 30, 0, 1) * 60;
  const frequencyFactor = clamp(daysPlayed / Math.max(daysPlayed, 14), 0, 1) * 40;
  const consistency = clamp(Math.round(streakFactor + frequencyFactor), 0, 100);

  return {
    visual: clamp(visual, 0, 100),
    spatial: clamp(spatial, 0, 100),
    sequence: clamp(sequence, 0, 100),
    speed: clamp(speed, 0, 100),
    focus,
    consistency,
  };
}

// ─── Insight card text ─────────────────────────────────────────────────

interface Insight {
  title: string;
  body: string;
}

const DIMENSION_LABEL: Record<BrainProfileKey, string> = {
  visual: 'Visual',
  spatial: 'Spatial',
  sequence: 'Sequence',
  speed: 'Speed',
  focus: 'Focus',
  consistency: 'Consistency',
};

const MODE_FOR_DIMENSION: Record<BrainProfileKey, string> = {
  visual: 'Classic',
  spatial: 'Speed Recall',
  sequence: 'Sequence',
  speed: 'Snap Match',
  focus: 'Counting Blitz',
  consistency: 'daily challenges',
};

export function generateInsight(profile: BrainProfile): Insight {
  const entries = Object.entries(profile) as [BrainProfileKey, number][];

  // If the player has zero data everywhere, show a welcome prompt instead of
  // a "strongest area" message that would be meaningless.
  const hasAnyData = entries.some(([, v]) => v > 0);
  if (!hasAnyData) {
    return {
      title: 'Build your brain profile',
      body: 'Play a few levels in any game mode and your memory profile will start to take shape.',
    };
  }

  const strongest = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
  const weakest = entries.reduce((a, b) => (a[1] < b[1] ? a : b));

  const strongestLabel = DIMENSION_LABEL[strongest[0]];
  const weakestLabel = DIMENSION_LABEL[weakest[0]].toLowerCase();
  const suggestedMode = MODE_FOR_DIMENSION[weakest[0]];

  return {
    title: `Your strongest area: ${strongestLabel}`,
    body: `You score ${strongest[1]} in ${strongestLabel.toLowerCase()} memory. Try ${suggestedMode} to sharpen your ${weakestLabel} skills.`,
  };
}

// ─── Sample data (free user preview) ───────────────────────────────────

export interface SampleAnalytics {
  memoryScore: number;
  percentile: number;
  statCards: StatCardValues;
  brainProfile: BrainProfile;
  insight: Insight;
}

export const SAMPLE_ANALYTICS: SampleAnalytics = {
  memoryScore: 82,
  percentile: 8,
  statCards: {
    accuracy: 87,
    bestStreak: 14,
    stars: 479,
    levelsDone: 142,
    avgSpeed: 1.4,
    daysActive: 23,
  },
  brainProfile: {
    visual: 82,
    spatial: 74,
    sequence: 68,
    speed: 88,
    focus: 76,
    consistency: 91,
  },
  insight: {
    title: 'Your strongest area: Consistency',
    body: 'You score 91 in consistency memory. Try Sequence to sharpen your sequence skills.',
  },
};
