/**
 * Weekly Challenges — rotating 3-category pool system.
 *
 * Every Monday 00:00 UTC three challenges are selected (one from each
 * category: engagement / consistency / skill) from a pool of 17. The
 * selection:
 *   - Excludes challenges seen in the last 4 weeks (falls back to the
 *     full pool only when the fresh subset is empty).
 *   - Filters engagement challenges by `requiresMinModes` so players
 *     who haven't unlocked enough modes never see impossible goals.
 *   - Rejects conflicting pairs (e.g. correct_streak_5 and
 *     correct_streak_20 together) and re-rolls the consistency slot.
 *
 * Persistence lives in AsyncStorage (matches the pattern the old
 * system used). Cross-device Supabase sync can be layered on later by
 * writing these structures to `weekly_challenge_progress` +
 * `weekly_counters` tables — all the counter keys below already map
 * 1:1 to what the spec'd schema wants.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ─────────────────────────────────────────────────────────────

export type ChallengeCategory = 'engagement' | 'consistency' | 'skill';

export interface ChallengeTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;       // Emoji displayed on the card
  target: number;
  trackingKey: string;
  /** Minimum number of unlocked modes required for this challenge to be
   *  eligible (engagement category only). */
  requiresMinModes?: number;
}

export interface WeeklyChallenge extends ChallengeTemplate {
  category: ChallengeCategory;
  gems: number;
}

/** The WeeklyGoal shape is kept as an alias of the new type so the
 *  existing UI (WeeklyChallengesCard) can keep consuming it without
 *  changing its import. */
export type WeeklyGoal = WeeklyChallenge & { reward: number };

// ── Pools ─────────────────────────────────────────────────────────────
// Each pool is standalone — the selector picks exactly ONE from each.

const ENGAGEMENT_POOL: ChallengeTemplate[] = [
  {
    id: 'challenge_friend',
    title: 'Challenge a friend',
    description: 'Send a challenge to any friend',
    icon: '\u2694\uFE0F',
    target: 1,
    trackingKey: 'friends_challenged_this_week',
  },
  {
    id: 'play_5_days',
    title: 'Play 5 days this week',
    description: 'Complete at least one level on 5 different days',
    icon: '\u{1F4C5}',
    target: 5,
    trackingKey: 'unique_days_played_this_week',
  },
  {
    id: 'play_every_day',
    title: 'Play every day this week',
    description: 'Complete at least one level every day for 7 days straight',
    icon: '\u{1F525}',
    target: 7,
    trackingKey: 'unique_days_played_this_week',
  },
  {
    id: 'play_3_modes',
    title: 'Play 3 different game modes',
    description: "Complete a level in 3 different modes you've unlocked",
    icon: '\u{1F3AE}',
    target: 3,
    trackingKey: 'unique_modes_played_this_week',
    requiresMinModes: 3,
  },
];

const CONSISTENCY_POOL: ChallengeTemplate[] = [
  {
    id: 'complete_15_levels',
    title: 'Complete 15 levels',
    description: 'Finish 15 levels in any mode this week',
    icon: '\u{1F9E9}',
    target: 15,
    trackingKey: 'levels_completed_this_week',
  },
  {
    id: 'complete_25_levels',
    title: 'Complete 25 levels',
    description: 'Finish 25 levels in any mode this week',
    icon: '\u{1F9E9}',
    target: 25,
    trackingKey: 'levels_completed_this_week',
  },
  {
    id: 'correct_streak_5',
    title: 'Get 5 answers correct in a row',
    description: 'Answer 5 questions in a row without a single mistake',
    icon: '\u{1F3AF}',
    target: 5,
    trackingKey: 'best_correct_streak_this_week',
  },
  {
    id: 'earn_25_stars',
    title: 'Earn 25 stars this week',
    description: 'Collect 25 stars across all levels and modes',
    icon: '\u2B50',
    target: 25,
    trackingKey: 'stars_earned_this_week',
  },
  {
    id: 'answer_75_correct',
    title: 'Answer 75 questions correctly',
    description: 'Get 75 total correct answers this week',
    icon: '\u2705',
    target: 75,
    trackingKey: 'correct_answers_this_week',
  },
  {
    id: 'no_powerups_10',
    title: 'Complete 10 levels without power-ups',
    description: 'Finish 10 levels using zero power-ups \u2014 pure memory',
    icon: '\u{1F4AA}',
    target: 10,
    trackingKey: 'levels_no_powerups_this_week',
  },
  {
    id: 'no_life_loss_5',
    title: 'Win 5 levels in a row',
    description: 'Win 5 consecutive levels without losing a single life',
    icon: '\u2764\uFE0F',
    target: 5,
    trackingKey: 'best_no_fail_streak_this_week',
  },
];

const SKILL_POOL: ChallengeTemplate[] = [
  {
    id: 'perfect_3_levels',
    title: 'Score 100% on 3 levels',
    description: 'Get every single question right on 3 different levels',
    icon: '\u{1F48E}',
    target: 3,
    trackingKey: 'perfect_levels_this_week',
  },
  {
    id: 'improve_5_stars',
    title: 'Improve your stars on 5 levels',
    description: "Get a higher star rating on 5 levels you've already completed",
    icon: '\u{1F4C8}',
    target: 5,
    trackingKey: 'levels_star_improved_this_week',
  },
  {
    id: 'speed_accuracy_10',
    title: '10 in a row under 2 seconds',
    description: 'Get 10 consecutive correct answers each faster than 2 seconds',
    icon: '\u26A1',
    target: 10,
    trackingKey: 'best_fast_correct_streak_this_week',
  },
  {
    id: 'flawless_3',
    title: 'Complete 3 flawless levels',
    description: 'Finish 3 levels with 100% accuracy and zero power-ups used',
    icon: '\u{1F451}',
    target: 3,
    trackingKey: 'flawless_levels_this_week',
  },
  {
    id: 'score_95_on_5',
    title: 'Score 95%+ on 5 levels',
    description: 'Achieve at least 95% accuracy on 5 different levels this week',
    icon: '\u{1F3C6}',
    target: 5,
    trackingKey: 'levels_95_plus_this_week',
  },
  {
    id: 'correct_streak_20',
    title: 'Answer 20 in a row',
    description: 'The ultimate memory streak \u2014 one wrong answer resets it',
    icon: '\u{1F9E0}',
    target: 20,
    trackingKey: 'best_correct_streak_this_week',
  },
  {
    id: 'endurance_8',
    title: 'Complete 8 levels in one session',
    description: 'Finish 8 levels without closing the app',
    icon: '\u{1F50B}',
    target: 8,
    trackingKey: 'best_session_levels_this_week',
  },
];

const CATEGORY_REWARDS: Record<ChallengeCategory, number> = {
  engagement: 10,
  consistency: 10,
  skill: 20,
};

// ── Week calculation (ISO week, Monday-anchored, UTC) ────────────────

function getWeekNumber(): number {
  const now = new Date();
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  return Math.floor((dayOfYear + startOfYear.getUTCDay() + 6) / 7);
}

function getWeekYear(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-W${String(getWeekNumber()).padStart(2, '0')}`;
}

// ── Persistence ──────────────────────────────────────────────────────

const STORAGE_KEY = 'blanked_weekly_challenges_v2';
// How many past weeks of challenge IDs to keep around for the no-repeat
// filter. Spec says 4.
const HISTORY_WEEKS = 4;

export interface WeeklyChallengeState {
  weekId: string;
  goals: WeeklyGoal[];
  progress: Record<string, number>;
  claimed: Record<string, boolean>;
  /** IDs of challenges the player has seen in recent weeks — most recent
   *  first. Trimmed to HISTORY_WEEKS entries. */
  history: { weekId: string; ids: string[] }[];
  /** Internal set state: comma-separated day numbers the player has
   *  played on this week (0-6). Matched by trackingKey logic. */
  daysPlayedSet: string;
  /** Internal set state: comma-separated mode ids played this week. */
  modesPlayedSet: string;
}

function emptyState(weekId: string, goals: WeeklyGoal[], history: WeeklyChallengeState['history']): WeeklyChallengeState {
  return {
    weekId,
    goals,
    progress: {},
    claimed: {},
    history,
    daysPlayedSet: '',
    modesPlayedSet: '',
  };
}

// ── Selection logic ──────────────────────────────────────────────────

function pickOne<T>(pool: T[], fresh: T[]): T {
  const src = fresh.length > 0 ? fresh : pool;
  return src[Math.floor(Math.random() * src.length)];
}

interface SelectionContext {
  unlockedModes: number;
  recentIds: Set<string>;
}

function toWeekly(template: ChallengeTemplate, category: ChallengeCategory): WeeklyGoal {
  const gems = CATEGORY_REWARDS[category];
  return { ...template, category, gems, reward: gems };
}

function selectWeeklyChallenges(ctx: SelectionContext): WeeklyGoal[] {
  const { unlockedModes, recentIds } = ctx;

  const eligibleEngagement = ENGAGEMENT_POOL.filter(
    c => !c.requiresMinModes || unlockedModes >= c.requiresMinModes,
  );
  const freshEngagement = eligibleEngagement.filter(c => !recentIds.has(c.id));
  const freshConsistency = CONSISTENCY_POOL.filter(c => !recentIds.has(c.id));
  const freshSkill = SKILL_POOL.filter(c => !recentIds.has(c.id));

  const engagement = toWeekly(pickOne(eligibleEngagement, freshEngagement), 'engagement');
  let consistency = toWeekly(pickOne(CONSISTENCY_POOL, freshConsistency), 'consistency');
  const skill = toWeekly(pickOne(SKILL_POOL, freshSkill), 'skill');

  // Conflict: don't pair correct_streak_5 with correct_streak_20 — same
  // tracking key, two different targets, confusing to the player. If that
  // combo came up, re-roll the consistency slot excluding correct_streak_5.
  if (consistency.id === 'correct_streak_5' && skill.id === 'correct_streak_20') {
    const altFresh = freshConsistency.filter(c => c.id !== 'correct_streak_5');
    const altPool = CONSISTENCY_POOL.filter(c => c.id !== 'correct_streak_5');
    consistency = toWeekly(pickOne(altPool, altFresh), 'consistency');
  }

  return [engagement, consistency, skill];
}

// ── Storage ──────────────────────────────────────────────────────────

async function loadRaw(): Promise<WeeklyChallengeState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeeklyChallengeState;
  } catch {
    return null;
  }
}

async function saveState(state: WeeklyChallengeState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Figure out how many modes the player has actually unlocked. Without a
 * formal "mode unlock" system we infer it from the level progress map:
 * each mode id that appears in at least one completed level is counted.
 */
function countUnlockedModesFromProgress(levelProgress: Record<string, unknown>): number {
  const modes = new Set<string>();
  modes.add('classic'); // Classic is always unlocked
  for (const id of Object.keys(levelProgress)) {
    if (id.startsWith('sr-')) modes.add('speed_recall');
    else if (id.startsWith('sm-')) modes.add('snap_match');
    else if (id.startsWith('seq-')) modes.add('sequence');
    else if (id.startsWith('cb-')) modes.add('counting_blitz');
    else if (id.startsWith('cc-')) modes.add('colour_chain');
  }
  return modes.size;
}

/**
 * Load the current week's state. If the week has rolled over, generate
 * a new set of challenges with the selection logic above and archive the
 * previous week's ids into `history`.
 *
 * `levelProgress` is optional — if passed we use it to determine
 * unlocked modes for the engagement filter. If omitted the selector
 * assumes all modes are available (matches the old behaviour).
 */
async function loadState(levelProgress?: Record<string, unknown>): Promise<WeeklyChallengeState> {
  const currentWeek = getWeekYear();
  const existing = await loadRaw();

  if (existing && existing.weekId === currentWeek) {
    return existing;
  }

  // New week (or first ever). Build the history list: if there was a
  // previous state, push its ids to the front of history, then trim.
  const priorHistory = existing?.history ?? [];
  const newHistory = existing
    ? [{ weekId: existing.weekId, ids: existing.goals.map(g => g.id) }, ...priorHistory].slice(0, HISTORY_WEEKS)
    : priorHistory;

  const recentIds = new Set<string>(newHistory.flatMap(h => h.ids));
  const unlockedModes = countUnlockedModesFromProgress(levelProgress ?? {});
  const goals = selectWeeklyChallenges({ unlockedModes, recentIds });

  const fresh = emptyState(currentWeek, goals, newHistory);
  await saveState(fresh);
  return fresh;
}

// ── Mutex for read-modify-write safety ───────────────────────────────

let _writeLock: Promise<void> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = _writeLock;
  let release: () => void;
  _writeLock = new Promise<void>(r => { release = r; });
  return prev.then(fn).finally(() => release!());
}

// ── Public API ───────────────────────────────────────────────────────

/** Read the current state. The card on the home screen calls this. */
export async function getWeeklyChallenges(levelProgress?: Record<string, unknown>): Promise<WeeklyChallengeState> {
  return loadState(levelProgress);
}

/** Increment a tracking counter by `amount`. */
export async function incrementWeeklyProgress(trackingKey: string, amount: number = 1): Promise<void> {
  return withLock(async () => {
    const state = await loadState();
    state.progress[trackingKey] = (state.progress[trackingKey] ?? 0) + amount;
    await saveState(state);
  });
}

/** For "best ever this week" style counters — only writes if `value`
 *  is higher than the stored one. */
export async function setWeeklyProgressMax(trackingKey: string, value: number): Promise<void> {
  return withLock(async () => {
    const state = await loadState();
    state.progress[trackingKey] = Math.max(state.progress[trackingKey] ?? 0, value);
    await saveState(state);
  });
}

/** Claim a completed goal's gem reward. Returns gems earned (0 if
 *  already claimed or the target hasn't been hit yet). */
export async function claimWeeklyReward(goalId: string): Promise<number> {
  return withLock(async () => {
    const state = await loadState();
    if (state.claimed[goalId]) return 0;
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return 0;
    const progress = state.progress[goal.trackingKey] ?? 0;
    if (progress < goal.target) return 0;
    state.claimed[goalId] = true;
    await saveState(state);
    return goal.gems;
  });
}

/** Time remaining until next Monday 00:00 UTC. Used by the card timer. */
export function getTimeUntilReset(): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilMonday,
    0, 0, 0, 0,
  ));
  const diff = nextMonday.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.floor(diff / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
}

// ── Higher-level tracking helpers ────────────────────────────────────

function classifyMode(levelId: string): string {
  if (levelId.startsWith('sr-')) return 'speed_recall';
  if (levelId.startsWith('sm-')) return 'snap_match';
  if (levelId.startsWith('seq-')) return 'sequence';
  if (levelId.startsWith('cb-')) return 'counting_blitz';
  if (levelId.startsWith('cc-')) return 'colour_chain';
  return 'classic';
}

export interface LevelCompleteEvent {
  levelId: string;
  stars: number;             // 0-3 stars earned THIS attempt
  previousStars: number;     // Best star rating before this attempt
  score: number;             // 0-100 accuracy %
  correctAnswers: number;    // Correct answers count for this attempt
  powerUpsUsed: number;      // Power-ups consumed during the level
  sessionLevelCount: number; // How many levels already done in this session
}

/** Record all the per-level counters in one shot. Called from result.tsx
 *  after a level passes. Returns the (possibly updated) state so callers
 *  can dispatch completion toasts. */
export async function recordLevelCompleteForChallenges(event: LevelCompleteEvent): Promise<WeeklyChallenge[]> {
  return withLock(async () => {
    const state = await loadState();

    // Simple counters
    state.progress.levels_completed_this_week = (state.progress.levels_completed_this_week ?? 0) + 1;
    state.progress.stars_earned_this_week = (state.progress.stars_earned_this_week ?? 0) + event.stars;
    state.progress.correct_answers_this_week = (state.progress.correct_answers_this_week ?? 0) + event.correctAnswers;

    if (event.powerUpsUsed === 0) {
      state.progress.levels_no_powerups_this_week = (state.progress.levels_no_powerups_this_week ?? 0) + 1;
    }
    if (event.score === 100) {
      state.progress.perfect_levels_this_week = (state.progress.perfect_levels_this_week ?? 0) + 1;
    }
    if (event.score === 100 && event.powerUpsUsed === 0) {
      state.progress.flawless_levels_this_week = (state.progress.flawless_levels_this_week ?? 0) + 1;
    }
    if (event.score >= 95) {
      state.progress.levels_95_plus_this_week = (state.progress.levels_95_plus_this_week ?? 0) + 1;
    }
    // Star improvement: strictly more stars than an existing record.
    if (event.previousStars > 0 && event.stars > event.previousStars) {
      state.progress.levels_star_improved_this_week = (state.progress.levels_star_improved_this_week ?? 0) + 1;
    }

    // Unique days set (0-6). Count up the size of the set.
    const dayNum = String(new Date().getUTCDay());
    const days = new Set(state.daysPlayedSet.split(',').filter(Boolean));
    if (!days.has(dayNum)) {
      days.add(dayNum);
      state.daysPlayedSet = Array.from(days).join(',');
      state.progress.unique_days_played_this_week = days.size;
    }

    // Unique modes set.
    const mode = classifyMode(event.levelId);
    const modes = new Set(state.modesPlayedSet.split(',').filter(Boolean));
    if (!modes.has(mode)) {
      modes.add(mode);
      state.modesPlayedSet = Array.from(modes).join(',');
      state.progress.unique_modes_played_this_week = modes.size;
    }

    // Session endurance: best run without app backgrounding.
    state.progress.best_session_levels_this_week = Math.max(
      state.progress.best_session_levels_this_week ?? 0,
      event.sessionLevelCount,
    );

    // Consecutive-win streak (no_life_loss): bumped here as a win adds
    // one to the running streak. Failures reset via `recordLevelFailed`.
    state.progress.__current_no_fail_streak = (state.progress.__current_no_fail_streak ?? 0) + 1;
    state.progress.best_no_fail_streak_this_week = Math.max(
      state.progress.best_no_fail_streak_this_week ?? 0,
      state.progress.__current_no_fail_streak,
    );

    await saveState(state);
    return getNewlyCompletedGoals(state);
  });
}

/** Called from result.tsx when a level fails — resets the consecutive
 *  win streak. */
export async function recordLevelFailedForChallenges(): Promise<void> {
  return withLock(async () => {
    const state = await loadState();
    state.progress.__current_no_fail_streak = 0;
    await saveState(state);
  });
}

/** Called from gameStore.revealAnswer — tracks the per-question streaks
 *  and fires any challenges that just crossed their target. */
export async function recordQuestionAnsweredForChallenges(isCorrect: boolean, responseTimeMs: number): Promise<WeeklyChallenge[]> {
  return withLock(async () => {
    const state = await loadState();
    if (!isCorrect) {
      state.progress.__current_correct_streak = 0;
      state.progress.__current_fast_correct_streak = 0;
      await saveState(state);
      return [];
    }
    state.progress.__current_correct_streak = (state.progress.__current_correct_streak ?? 0) + 1;
    state.progress.best_correct_streak_this_week = Math.max(
      state.progress.best_correct_streak_this_week ?? 0,
      state.progress.__current_correct_streak,
    );
    if (responseTimeMs < 2000) {
      state.progress.__current_fast_correct_streak = (state.progress.__current_fast_correct_streak ?? 0) + 1;
      state.progress.best_fast_correct_streak_this_week = Math.max(
        state.progress.best_fast_correct_streak_this_week ?? 0,
        state.progress.__current_fast_correct_streak,
      );
    } else {
      state.progress.__current_fast_correct_streak = 0;
    }
    await saveState(state);
    return getNewlyCompletedGoals(state);
  });
}

/** Called from challenge-mode.tsx after a friend_challenges row is
 *  successfully inserted. */
export async function recordFriendChallengedForChallenges(): Promise<WeeklyChallenge[]> {
  return withLock(async () => {
    const state = await loadState();
    state.progress.friends_challenged_this_week = (state.progress.friends_challenged_this_week ?? 0) + 1;
    await saveState(state);
    return getNewlyCompletedGoals(state);
  });
}

/**
 * Cache of goal ids we've already surfaced as "completed toast" this
 * session, so we only fire the completion callback once even if the
 * progress updates cross the target multiple times.
 */
const _completionNotified = new Set<string>();

function getNewlyCompletedGoals(state: WeeklyChallengeState): WeeklyChallenge[] {
  const newly: WeeklyChallenge[] = [];
  for (const goal of state.goals) {
    const progress = state.progress[goal.trackingKey] ?? 0;
    if (progress >= goal.target && !_completionNotified.has(goal.id)) {
      _completionNotified.add(goal.id);
      newly.push(goal);
    }
  }
  return newly;
}

/** Reset the "already notified" set on a new week / after clearing
 *  progress manually during dev. */
export function resetCompletionNotificationCache(): void {
  _completionNotified.clear();
}
