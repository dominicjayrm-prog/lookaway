/**
 * Weekly Challenges — 3 rotating goals per week, all players get the same set.
 * Resets every Monday 00:00 UTC. Goals are deterministic (seeded from week number).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Goal definitions ──────────────────────────────────────────────────
export interface WeeklyGoal {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  reward: number; // gems
  trackingKey: string; // key used to increment progress
}

// Pool of possible goals — 3 are picked per week
const GOAL_POOL: WeeklyGoal[] = [
  { id: 'complete_levels_5', title: 'Level crusher', description: 'Complete 5 levels', icon: '\u{1F3AF}', target: 5, reward: 15, trackingKey: 'levels_completed' },
  { id: 'complete_levels_10', title: 'Grinder', description: 'Complete 10 levels', icon: '\u{1F3AF}', target: 10, reward: 30, trackingKey: 'levels_completed' },
  { id: 'earn_stars_10', title: 'Star collector', description: 'Earn 10 stars', icon: '\u2B50', target: 10, reward: 20, trackingKey: 'stars_earned' },
  { id: 'earn_stars_25', title: 'Constellation', description: 'Earn 25 stars', icon: '\u2B50', target: 25, reward: 40, trackingKey: 'stars_earned' },
  { id: 'perfect_levels_3', title: 'Perfectionist', description: 'Get 3 stars on 3 levels', icon: '\u{1F451}', target: 3, reward: 25, trackingKey: 'perfect_levels' },
  { id: 'correct_streak_5', title: 'Sharp memory', description: 'Get 5 answers correct in a row', icon: '\u{1F9E0}', target: 5, reward: 10, trackingKey: 'correct_streak' },
  { id: 'correct_streak_10', title: 'On fire', description: '10 correct answers in a row', icon: '\u{1F525}', target: 10, reward: 25, trackingKey: 'correct_streak' },
  { id: 'play_daily', title: 'Daily devotee', description: 'Play the daily challenge', icon: '\u{1F4C5}', target: 1, reward: 10, trackingKey: 'daily_played' },
  { id: 'use_powerups_3', title: 'Power player', description: 'Use 3 power-ups', icon: '\u26A1', target: 3, reward: 10, trackingKey: 'powerups_used' },
  { id: 'challenge_friend', title: 'Challenger', description: 'Challenge a friend', icon: '\u2694\uFE0F', target: 1, reward: 10, trackingKey: 'friends_challenged' },
  { id: 'score_90_twice', title: 'Brainiac', description: 'Score 90%+ on 2 levels', icon: '\u{1F4AA}', target: 2, reward: 20, trackingKey: 'high_score_levels' },
  { id: 'play_3_modes', title: 'Explorer', description: 'Play 3 different game modes', icon: '\u{1F30D}', target: 3, reward: 20, trackingKey: 'modes_played' },
];

// ── Week calculation ──────────────────────────────────────────────────
function getWeekNumber(): number {
  // ISO week number — same for all players worldwide
  const now = new Date();
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  return Math.floor((dayOfYear + startOfYear.getUTCDay() + 6) / 7);
}

function getWeekYear(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-W${getWeekNumber()}`;
}

/** Simple seeded random (deterministic per week so all players get same goals) */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Pick 3 non-conflicting goals for the current week */
function getGoalsForWeek(): WeeklyGoal[] {
  const weekNum = getWeekNumber();
  const year = new Date().getUTCFullYear();
  const seed = year * 100 + weekNum;
  const rng = seededRandom(seed);

  // Shuffle pool deterministically
  const pool = [...GOAL_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Pick 3 with unique tracking keys (no two goals tracking the same thing)
  const selected: WeeklyGoal[] = [];
  const usedKeys = new Set<string>();
  for (const goal of pool) {
    if (usedKeys.has(goal.trackingKey)) continue;
    selected.push(goal);
    usedKeys.add(goal.trackingKey);
    if (selected.length === 3) break;
  }

  return selected;
}

// ── Persistence ───────────────────────────────────────────────────────
const STORAGE_KEY = 'blanked_weekly_challenges';

export interface WeeklyChallengeState {
  weekId: string; // e.g. "2026-W15"
  goals: WeeklyGoal[];
  progress: Record<string, number>; // trackingKey -> current count
  claimed: Record<string, boolean>; // goalId -> true if gems claimed
}

async function loadState(): Promise<WeeklyChallengeState> {
  const currentWeek = getWeekYear();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state: WeeklyChallengeState = JSON.parse(raw);
      // Same week — return existing progress
      if (state.weekId === currentWeek) return state;
    }
  } catch {}

  // New week or first ever — generate fresh goals
  const goals = getGoalsForWeek();
  const fresh: WeeklyChallengeState = {
    weekId: currentWeek,
    goals,
    progress: {},
    claimed: {},
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

async function saveState(state: WeeklyChallengeState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Public API ────────────────────────────────────────────────────────

/** Get current weekly challenge state */
export async function getWeeklyChallenges(): Promise<WeeklyChallengeState> {
  return loadState();
}

/** Increment progress for a tracking key (call from game flow) */
export async function incrementWeeklyProgress(trackingKey: string, amount: number = 1): Promise<void> {
  const state = await loadState();
  state.progress[trackingKey] = (state.progress[trackingKey] ?? 0) + amount;
  await saveState(state);
}

/** Set progress for a tracking key to at least `value` (for "max" type tracking like streaks) */
export async function setWeeklyProgressMax(trackingKey: string, value: number): Promise<void> {
  const state = await loadState();
  state.progress[trackingKey] = Math.max(state.progress[trackingKey] ?? 0, value);
  await saveState(state);
}

/** Claim a completed goal's gem reward. Returns gems earned (0 if already claimed or not done). */
export async function claimWeeklyReward(goalId: string): Promise<number> {
  const state = await loadState();
  if (state.claimed[goalId]) return 0;

  const goal = state.goals.find(g => g.id === goalId);
  if (!goal) return 0;

  const progress = state.progress[goal.trackingKey] ?? 0;
  if (progress < goal.target) return 0;

  state.claimed[goalId] = true;
  await saveState(state);
  return goal.reward;
}

/** Get time remaining until weekly reset (next Monday 00:00 UTC) */
export function getTimeUntilReset(): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  const nextMonday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilMonday,
    0, 0, 0, 0
  ));

  const diff = nextMonday.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.floor(diff / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes };
}
