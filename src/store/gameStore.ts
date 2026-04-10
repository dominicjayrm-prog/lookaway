import { create } from 'zustand';
import type { Level, GameState } from '@/src/types/game';
import { GEM_REWARDS, calculateReplayReward, checkStreakMilestone, INITIAL_GEMS, LIVES_CONFIG, POWER_UP_COSTS, bundlePrice, type PowerUpId } from '@/src/utils/scoring';
import { logEconomyEvent, ECONOMY_EVENTS } from '@/src/utils/economyLogger';
import { saveProgressToSupabase, loadProgressFromSupabase } from '@/src/utils/progressSync';
import { INITIAL_LOGIN_REWARD_STATE, type LoginRewardState } from '@/src/utils/dailyLoginRewards';
import { supabase } from '@/src/lib/supabase';

/** In-memory fallback for platforms where localStorage is unavailable */
let _memoryUserId: string | null = null;

/** Get current user ID for economy logging */
function getUserId(): string {
  try {
    // Intentional: sync access to cached session (not part of public SDK API)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = (supabase as unknown as { auth?: { session?: () => { user?: { id?: string } } | null } }).auth?.session?.();
    if (session?.user?.id) return session.user.id;
  } catch {}
  // Fallback: try localStorage (works on web, may throw on native iOS)
  try {
    const stored = localStorage.getItem('blanked-user-id');
    if (stored) return stored;
    const id = `anon-${Date.now()}`;
    localStorage.setItem('blanked-user-id', id);
    return id;
  } catch (e) {
    console.warn('localStorage unavailable, using in-memory fallback:', e);
  }
  // Final fallback: in-memory ID for native platforms
  if (!_memoryUserId) {
    _memoryUserId = `anon-${Date.now()}`;
  }
  return _memoryUserId;
}

interface Answer { questionId: string; selectedIndex: number | null; correctIndex: number; isCorrect: boolean; }
function buildLevelIds(): string[] {
  const counts = [20, 30, 35, 35, 40, 40];
  const ids: string[] = [];
  for (let w = 0; w < counts.length; w++) {
    for (let l = 1; l <= counts[w]; l++) ids.push(`w${w + 1}-l${l}`);
  }
  return ids;
}

export interface PowerUpInventory {
  // Universal
  extra_life: number;
  // Classic
  slowTime: number;
  peek: number;
  fiftyFifty: number;
  skip: number;
  // Speed Recall
  sr_slow_time: number;
  sr_ghost_outline: number;
  sr_second_chance: number;
  // Snap Match
  sm_slow_flash: number;
  sm_highlight: number;
  sm_freeze: number;
  // Sequence
  seq_replay_one: number;
  seq_safety_net: number;
  // Counting Blitz
  cb_slow_motion: number;
  cb_colour_filter: number;
  // Colour Chain
  cc_slow_time: number;
  cc_reveal_one: number;
}

/**
 * Cosmetics that are only granted to Blanked+ subscribers. Ownership of any
 * one of these is the current signal for active subscription (pre-RevenueCat).
 * Once RevenueCat is wired up, `isSubscribed()` in the store should read the
 * entitlement directly instead.
 */
export const SUBSCRIBER_COSMETIC_IDS = [
  'frame_prismatic', 'frame_diamond', 'frame_premium_gold',
  'banner_aurora', 'banner_holographic', 'banner_premium_gold',
  'expr_premium',
  'name_purple', 'name_gold', 'name_coral', 'name_ocean', 'name_mint',
];

/**
 * Authoritative subscription status. The local value is mirrored on the
 * `subscription_status` column in the `profiles` table and cloud is the
 * source of truth during `loadFromCloud` — that's how cancellations
 * propagate between devices.
 */
export type SubscriptionStatus = 'active' | 'inactive';

const DEFAULT_POWERUPS: PowerUpInventory = {
  extra_life: 0,
  slowTime: 0, peek: 0, fiftyFifty: 0, skip: 0,
  sr_slow_time: 0, sr_ghost_outline: 0, sr_second_chance: 0,
  sm_slow_flash: 0, sm_highlight: 0, sm_freeze: 0,
  seq_replay_one: 0, seq_safety_net: 0,
  cb_slow_motion: 0, cb_colour_filter: 0,
  cc_slow_time: 0, cc_reveal_one: 0,
};

// One-time migration: move w1-lX progress to w2-lX (world restructure)
function migrateWorldProgress() {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    if (localStorage.getItem('blanked_world_migrated')) return;

    const saved = localStorage.getItem('blanked-progress');
    if (!saved) { localStorage.setItem('blanked_world_migrated', 'true'); return; }

    const data = JSON.parse(saved);
    if (!data.levelProgress) { localStorage.setItem('blanked_world_migrated', 'true'); return; }

    const newProgress: Record<string, unknown> = {};
    let changed = false;

    for (const [key, value] of Object.entries(data.levelProgress)) {
      if (key.startsWith('w1-l')) {
        newProgress[key.replace('w1-l', 'w2-l')] = value;
        changed = true;
      } else {
        newProgress[key] = value;
      }
    }

    if (changed) {
      data.levelProgress = newProgress;
      localStorage.setItem('blanked-progress', JSON.stringify(data));
    }
    localStorage.setItem('blanked_world_migrated', 'true');
  } catch (e) {
    console.warn('World migration failed:', e);
  }
}

// Manual localStorage persistence
interface SavedState {
  gems?: number;
  lives?: number;
  maxLives?: number;
  livesLastLostAt?: number | null;
  streakCount?: number;
  bestStreak?: number;
  daysPlayed?: number;
  username?: string | null;
  avatarUrl?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  streakMilestonesClaimed?: number[];
  lastPlayDate?: string | null;
  totalStars?: number;
  highestWorld?: number;
  powerUps?: Partial<PowerUpInventory>;
  levelProgress?: Record<string, { stars: number; bestScore: number; attempts: number }>;
  completedScores?: number[];
  ownedCosmetics?: string[];
  equippedFrame?: string;
  equippedBanner?: string;
  equippedNameColor?: string;
  equippedExpression?: string;
  loginReward?: LoginRewardState;
}

// One-time migration: lift legacy `blanked_login_rewards` key into the main
// progress blob so daily login streaks start syncing across devices.
function migrateLoginReward(saved: SavedState): SavedState {
  if (saved.loginReward) return saved;
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return saved;
    const legacy = localStorage.getItem('blanked_login_rewards');
    if (!legacy) return saved;
    const parsed = JSON.parse(legacy) as LoginRewardState;
    if (parsed && typeof parsed.currentDay === 'number' && typeof parsed.lastClaimDate === 'string') {
      saved.loginReward = {
        currentDay: parsed.currentDay ?? 0,
        lastClaimDate: parsed.lastClaimDate ?? '',
        streak: parsed.streak ?? 0,
      };
      localStorage.removeItem('blanked_login_rewards');
    }
  } catch {}
  return saved;
}

function loadState(): SavedState {
  try {
    if (typeof window === 'undefined') return migrateLoginReward({});
    const saved = localStorage.getItem('blanked-progress');
    const parsed = saved ? (JSON.parse(saved) as SavedState) : {};
    return migrateLoginReward(parsed);
  } catch { return migrateLoginReward({}); }
}

function saveState(state: GameStore) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem('blanked-progress', JSON.stringify({
      gems: state.gems, lives: state.lives, maxLives: state.maxLives, livesLastLostAt: state.livesLastLostAt,
      streakCount: state.streakCount, bestStreak: state.bestStreak, daysPlayed: state.daysPlayed,
      username: state.username, avatarUrl: state.avatarUrl,
      subscriptionStatus: state.subscriptionStatus,
      streakMilestonesClaimed: state.streakMilestonesClaimed, lastPlayDate: state.lastPlayDate,
      totalStars: state.totalStars, highestWorld: state.highestWorld,
      levelProgress: state.levelProgress, completedScores: state.completedScores,
      powerUps: state.powerUps,
      ownedCosmetics: state.ownedCosmetics, equippedFrame: state.equippedFrame,
      equippedBanner: state.equippedBanner, equippedNameColor: state.equippedNameColor, equippedExpression: state.equippedExpression,
      loginReward: state.loginReward,
    }));
  } catch (e) {
    console.warn('Save state failed:', e);
  }

  // Also sync to Supabase (debounced, fire and forget)
  clearTimeout((saveState as { _syncTimer?: ReturnType<typeof setTimeout> })._syncTimer);
  (saveState as { _syncTimer?: ReturnType<typeof setTimeout> })._syncTimer = setTimeout(() => {
    const uid = state._authUserId;
    if (uid) {
      saveProgressToSupabase(uid, state).catch((e) => console.warn('Sync failed:', e));
    }
  }, 2000);
}

// Flush pending cloud sync on page unload (web)
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('beforeunload', () => {
    const timer = (saveState as { _syncTimer?: ReturnType<typeof setTimeout> })._syncTimer;
    if (timer) {
      clearTimeout(timer);
      const state = useGameStore?.getState?.();
      if (state?._authUserId) {
        saveProgressToSupabase(state._authUserId, state).catch(() => {});
      }
    }
  });
}

export interface GameStore {
  _authUserId: string | null; // Real Supabase auth user ID, set by CloudSyncLoader
  gems: number; lives: number; maxLives: number; livesLastLostAt: number | null;
  streakCount: number; bestStreak: number; daysPlayed: number;
  username: string | null;
  avatarUrl: string | null;
  subscriptionStatus: SubscriptionStatus;
  streakMilestonesClaimed: number[]; lastPlayDate: string | null;
  totalStars: number; highestWorld: number;
  powerUps: PowerUpInventory;
  levelProgress: Record<string, { stars: number; bestScore: number; attempts: number }>;
  completedScores: number[];
  currentLevel: Level | null; gameState: GameState; currentSceneIndex: number; currentQuestionIndex: number;
  answers: Answer[]; selectedOption: number | null; revealedCorrect: number | null; score: number;
  // ── Transient gameplay counters used by the weekly challenge system ──
  /** Power-ups used DURING the current level. Reset in `startLevel`,
   *  bumped by `usePowerUp`. Read by result.tsx when recording a level
   *  completion so challenges like flawless_3 / no_powerups_10 can
   *  distinguish "used zero" from "used at least one". */
  levelPowerUpsUsed: number;
  /** Timestamp (ms) the current question was presented. Set whenever we
   *  transition to QUESTION state. Used to compute response time on
   *  `revealAnswer` for the speed_accuracy_10 weekly challenge. */
  currentQuestionStartedAt: number;
  /** How many levels the player has completed this session. Reset when
   *  the app is backgrounded for > SESSION_RESET_MS or when the user
   *  manually closes the app. Read by the weekly tracker for
   *  endurance_8. */
  sessionLevelCount: number;
  /** Wall-clock of the last time the session counter was touched; used
   *  to decide whether to reset it on app foreground. */
  sessionLastTouchedAt: number;
  _hydrated: boolean;

  // Cosmetics
  ownedCosmetics: string[];   // IDs of owned cosmetics
  equippedFrame: string;      // equipped frame ID
  equippedBanner: string;     // equipped banner ID
  equippedNameColor: string;  // equipped name color ID
  equippedExpression: string; // equipped expression ID
  purchaseCosmetic: (id: string, gemCost: number) => boolean;
  unlockCosmetic: (id: string) => void;
  equipCosmetic: (type: 'frame' | 'banner' | 'name_color' | 'expression', id: string) => void;

  // Daily login reward (synced across devices)
  loginReward: LoginRewardState;
  claimLoginReward: (next: LoginRewardState) => void;

  // Economy
  addGems: (a: number) => void;
  spendGems: (a: number) => boolean;
  loseLife: () => void;
  refillLives: () => void;
  refillLivesWithGems: () => boolean;
  addStars: (c: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  checkLifeRegen: () => void;
  buyPowerUp: (id: string, qty?: number, cost?: number) => boolean;
  usePowerUp: (id: string) => boolean;
  getPowerUpCount: (id: string) => number;

  // Level completion with economy
  recordLevelComplete: (id: string, stars: number, pct: number) => number; // returns gems earned

  // Cloud sync
  syncToCloud: () => void;
  loadFromCloud: (userId: string) => Promise<void>;

  // Helpers
  getNextUnplayedLevelId: () => string;
  getMemoryScore: () => number;
  getCompletedLevelCount: () => number;
  /** Returns true when `subscriptionStatus === 'active'`. Cloud is the
   *  source of truth — `loadFromCloud` rewrites the local value on every
   *  sign-in and foreground resume. */
  isSubscribed: () => boolean;
  /** Paywall success path: flip local status to active, push to cloud. */
  activatePlus: () => void;
  /** Update the locally-cached avatar url after a successful upload so
   *  every surface that reads it from the store (profile header, home
   *  tab, etc.) refreshes immediately without waiting for the next
   *  loadFromCloud. The real source of truth is profiles.avatar_url
   *  on Supabase, set by avatarUpload.uploadAvatar. */
  setAvatarUrl: (url: string | null) => void;

  // Hydration — re-read localStorage after mount (fixes SSR/static export)
  hydrate: () => void;
  saveState: () => void;
  setAuthUserId: (id: string) => void;
  revokeSubscription: () => void;

  // Gameplay
  startLevel: (l: Level) => void;
  setGameState: (s: GameState) => void;
  selectOption: (i: number | null) => void;
  revealAnswer: () => void;
  nextQuestion: () => void;
  nextScene: () => void;
  completeLevel: () => void;
  resetGame: () => void;
  /** Increment the "levels cleared this continuous session" counter
   *  used by the endurance_8 weekly challenge. Called from result.tsx
   *  on a successful level complete. */
  bumpSessionLevelCount: () => void;
  /** Reset the session counter — called from the root layout when the
   *  app returns to foreground after being backgrounded for too long. */
  resetSessionLevelCount: () => void;
}

export const LIFE_REGEN_MS = LIVES_CONFIG.regenTimeMinutes * 60 * 1000;

export const useGameStore = create<GameStore>((set, get) => {
  const saved = loadState();

  return {
    gems: saved.gems ?? INITIAL_GEMS,
    lives: saved.lives ?? LIVES_CONFIG.maxLives,
    maxLives: saved.maxLives ?? LIVES_CONFIG.maxLives,
    livesLastLostAt: saved.livesLastLostAt ?? null,
    streakCount: saved.streakCount ?? 0,
    bestStreak: saved.bestStreak ?? saved.streakCount ?? 0,
    daysPlayed: saved.daysPlayed ?? 0,
    username: saved.username ?? null,
    avatarUrl: saved.avatarUrl ?? null,
    subscriptionStatus: saved.subscriptionStatus ?? 'inactive',
    lastPlayDate: saved.lastPlayDate ?? null,
    streakMilestonesClaimed: saved.streakMilestonesClaimed ?? [],
    totalStars: saved.totalStars ?? 0,
    highestWorld: saved.highestWorld ?? 1,
    powerUps: { ...DEFAULT_POWERUPS, ...saved.powerUps },
    levelProgress: saved.levelProgress ?? {},
    completedScores: saved.completedScores ?? [],
    currentLevel: null,
    gameState: 'READY' as GameState,
    currentSceneIndex: 0,
    currentQuestionIndex: 0,
    answers: [] as Answer[],
    selectedOption: null,
    revealedCorrect: null,
    score: 0,
    levelPowerUpsUsed: 0,
    currentQuestionStartedAt: Date.now(),
    sessionLevelCount: 0,
    sessionLastTouchedAt: Date.now(),
    _authUserId: null,
    _hydrated: false,

    // Cosmetics
    ownedCosmetics: saved.ownedCosmetics ?? [],
    equippedFrame: saved.equippedFrame ?? 'frame_blink_normal',
    equippedBanner: saved.equippedBanner ?? 'banner_none',
    equippedNameColor: saved.equippedNameColor ?? 'name_default',
    equippedExpression: saved.equippedExpression ?? 'expr_normal',

    // Daily login reward
    loginReward: saved.loginReward ?? { ...INITIAL_LOGIN_REWARD_STATE },
    claimLoginReward: (next) => {
      set({ loginReward: next });
      setTimeout(() => saveState(get()), 0);
    },
    purchaseCosmetic: (id, gemCost) => {
      const { gems, ownedCosmetics } = get();
      if (ownedCosmetics.includes(id) || gems < gemCost) return false;
      set({ gems: gems - gemCost, ownedCosmetics: [...ownedCosmetics, id] });
      setTimeout(() => saveState(get()), 0);
      // Immediate Supabase push so the new cosmetic survives a hard
      // close before the 2s debounce fires, and so friends can see
      // the player wearing it as soon as they equip it.
      const uid = get()._authUserId;
      if (uid) saveProgressToSupabase(uid, get()).catch((e) => console.warn('Purchase sync failed:', e));
      return true;
    },
    unlockCosmetic: (id) => {
      const { ownedCosmetics } = get();
      if (ownedCosmetics.includes(id)) return;
      set({ ownedCosmetics: [...ownedCosmetics, id] });
      setTimeout(() => saveState(get()), 0);
      const uid = get()._authUserId;
      if (uid) saveProgressToSupabase(uid, get()).catch((e) => console.warn('Unlock sync failed:', e));
    },
    equipCosmetic: (type, id) => {
      if (type === 'frame') set({ equippedFrame: id });
      else if (type === 'banner') set({ equippedBanner: id });
      else if (type === 'name_color') set({ equippedNameColor: id });
      else if (type === 'expression') set({ equippedExpression: id });
      setTimeout(() => saveState(get()), 0);
      // Also push immediately to Supabase, bypassing the 2s debounce.
      // Without this, friends wouldn't see the new cosmetic on their
      // profile popup until the player happens to trigger another
      // save (level complete, gem gain, etc). Equipping is rare
      // enough that the extra write per tap is fine.
      const uid = get()._authUserId;
      if (uid) saveProgressToSupabase(uid, get()).catch((e) => console.warn('Equip sync failed:', e));
    },

    addGems: (amount) => { if (amount <= 0) return; set((s) => ({ gems: s.gems + amount })); setTimeout(() => saveState(get()), 0); },
    spendGems: (amount) => { const { gems } = get(); if (gems < amount) return false; set({ gems: gems - amount }); setTimeout(() => saveState(get()), 0); return true; },
    loseLife: () => {
      set((s) => ({ lives: Math.max(0, s.lives - 1), livesLastLostAt: s.livesLastLostAt ?? Date.now() }));
      setTimeout(() => saveState(get()), 0);
      logEconomyEvent(getUserId(), ECONOMY_EVENTS.LIFE_LOST, -1, { levelId: get().currentLevel?.id });
    },
    refillLives: () => {
      set((s) => ({ lives: s.maxLives, livesLastLostAt: null }));
      setTimeout(() => saveState(get()), 0);
      logEconomyEvent(getUserId(), ECONOMY_EVENTS.IAP_LIVES, LIVES_CONFIG.maxLives, { method: 'iap' });
    },
    refillLivesWithGems: () => {
      const { gems } = get();
      if (gems < LIVES_CONFIG.gemRefillCost) return false;
      set((s) => ({ gems: s.gems - LIVES_CONFIG.gemRefillCost, lives: s.maxLives, livesLastLostAt: null }));
      setTimeout(() => saveState(get()), 0);
      logEconomyEvent(getUserId(), ECONOMY_EVENTS.GEM_SPEND_LIVES, -LIVES_CONFIG.gemRefillCost);
      return true;
    },
    addStars: (count) => { set((s) => ({ totalStars: s.totalStars + count })); setTimeout(() => saveState(get()), 0); },
    incrementStreak: () => {
      const today = new Date().toISOString().split('T')[0];
      const { lastPlayDate, streakCount, bestStreak, daysPlayed } = get();
      if (lastPlayDate === today) return; // Already played today
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const newStreak = lastPlayDate === yesterday ? streakCount + 1 : 1; // Continue or restart
      set({
        streakCount: newStreak,
        bestStreak: Math.max(bestStreak, newStreak),
        daysPlayed: daysPlayed + 1, // This branch only runs on a new calendar day
        lastPlayDate: today,
      });
      setTimeout(() => saveState(get()), 0);
    },
    resetStreak: () => { set({ streakCount: 0, lastPlayDate: null }); setTimeout(() => saveState(get()), 0); },
    checkLifeRegen: () => {
      const { lives, maxLives, livesLastLostAt } = get();
      if (lives >= maxLives || !livesLastLostAt) return;
      const elapsed = Date.now() - livesLastLostAt;
      const regen = Math.floor(elapsed / LIFE_REGEN_MS);
      if (regen > 0) {
        const actualRegen = Math.min(regen, maxLives - lives);
        const nl = Math.min(maxLives, lives + actualRegen);
        set({ lives: nl, livesLastLostAt: nl >= maxLives ? null : Date.now() - (elapsed % LIFE_REGEN_MS) });
        setTimeout(() => saveState(get()), 0);
        if (actualRegen > 0) logEconomyEvent(getUserId(), ECONOMY_EVENTS.LIFE_REGEN, actualRegen);
      }
    },

    // Power-up inventory
    buyPowerUp: (id, qty = 1, costOverride?) => {
      const singleCost = costOverride ?? (POWER_UP_COSTS as Record<string, number>)[id] ?? 30;
      const totalCost = bundlePrice(singleCost, qty);
      const { gems } = get();
      if (gems < totalCost) return false;
      set((s) => ({
        gems: s.gems - totalCost,
        powerUps: { ...s.powerUps, [id]: (s.powerUps[id as keyof PowerUpInventory] ?? 0) + qty },
      }));
      setTimeout(() => saveState(get()), 0);
      logEconomyEvent(getUserId(), ECONOMY_EVENTS.GEM_SPEND_POWERUP, -totalCost, { powerUp: id, qty });
      return true;
    },
    usePowerUp: (id) => {
      const { powerUps } = get();
      const count = powerUps[id as keyof PowerUpInventory] ?? 0;
      if (count <= 0) return false;
      set((s) => ({
        powerUps: { ...s.powerUps, [id]: (s.powerUps[id as keyof PowerUpInventory] ?? 0) - 1 },
        // Bump the per-level counter so we can tell "used zero" from
        // "used at least one" when recording weekly challenge progress.
        levelPowerUpsUsed: s.levelPowerUpsUsed + 1,
      }));
      setTimeout(() => saveState(get()), 0);
      logEconomyEvent(getUserId(), ECONOMY_EVENTS.POWERUP_USED, -1, { powerUp: id, levelId: get().currentLevel?.id });
      return true;
    },
    getPowerUpCount: (id) => get().powerUps[id as keyof PowerUpInventory] ?? 0,

    // Level completion with replay economy
    recordLevelComplete: (levelId, stars, scorePercent) => {
      if (!levelId) return 0;
      const clampedStars = Math.max(0, Math.min(3, stars));
      const clampedScore = Math.max(0, Math.min(100, scorePercent));
      const existing = get().levelProgress[levelId];
      let gemsEarned = 0;

      if (existing) {
        gemsEarned = calculateReplayReward(existing.stars, clampedStars);
      } else {
        gemsEarned = GEM_REWARDS[clampedStars as 0 | 1 | 2 | 3] ?? 0;
      }

      set((s) => ({
        gems: s.gems + gemsEarned,
        levelProgress: {
          ...s.levelProgress,
          [levelId]: {
            stars: existing ? Math.max(existing.stars, clampedStars) : clampedStars,
            bestScore: existing ? Math.max(existing.bestScore, clampedScore) : clampedScore,
            attempts: existing ? existing.attempts + 1 : 1,
          },
        },
        completedScores: [...s.completedScores.slice(-499), clampedScore],
      }));
      setTimeout(() => saveState(get()), 0);

      // Immediately sync to cloud so progress is saved even if app is killed
      const uid = get()._authUserId;
      if (uid) {
        setTimeout(() => saveProgressToSupabase(uid, get()).catch((e) => console.warn('Post-level sync failed:', e)), 500);
      }

      // Log to economy tracker
      if (gemsEarned > 0) {
        logEconomyEvent(getUserId(), ECONOMY_EVENTS.GEM_EARN_LEVEL, gemsEarned, { levelId, stars: clampedStars, scorePercent: clampedScore, replay: !!existing });
      }
      return gemsEarned;
    },

    getNextUnplayedLevelId: () => { const { levelProgress } = get(); const ids = buildLevelIds(); return ids.find((id) => !(id in levelProgress)) ?? ids[ids.length - 1]; },
    getMemoryScore: () => { const { completedScores } = get(); if (completedScores.length === 0) return 0; return Math.round(completedScores.reduce((a, v) => a + v, 0) / completedScores.length); },
    getCompletedLevelCount: () => Object.keys(get().levelProgress).length,
    isSubscribed: () => get().subscriptionStatus === 'active',
    setAvatarUrl: (url) => {
      set({ avatarUrl: url });
      setTimeout(() => saveState(get()), 0);
    },
    activatePlus: () => {
      set({ subscriptionStatus: 'active' });
      setTimeout(() => saveState(get()), 0);
      // Push immediately rather than waiting for the 2s debounce so a
      // subsequent foreground resume / loadFromCloud can't race the sync
      // and mistakenly strip the unlock we just granted.
      const uid = get()._authUserId;
      if (uid) saveProgressToSupabase(uid, get()).catch((e) => console.warn('Activate sync failed:', e));
    },

    // Re-read localStorage after mount — fixes static export where loadState() runs before window is ready
    hydrate: () => {
      if (get()._hydrated) return;
      migrateWorldProgress();
      const saved = loadState();
      if (typeof saved.gems === 'number') {
        set({
          gems: saved.gems ?? INITIAL_GEMS,
          lives: saved.lives ?? LIVES_CONFIG.maxLives,
          maxLives: saved.maxLives ?? LIVES_CONFIG.maxLives,
          livesLastLostAt: saved.livesLastLostAt ?? null,
          streakCount: saved.streakCount ?? 0,
          bestStreak: saved.bestStreak ?? saved.streakCount ?? 0,
          daysPlayed: saved.daysPlayed ?? 0,
          username: saved.username ?? null,
          avatarUrl: saved.avatarUrl ?? null,
          subscriptionStatus: saved.subscriptionStatus ?? 'inactive',
          streakMilestonesClaimed: saved.streakMilestonesClaimed ?? [],
          lastPlayDate: saved.lastPlayDate ?? null,
          totalStars: saved.totalStars ?? 0,
          highestWorld: saved.highestWorld ?? 1,
          powerUps: { ...DEFAULT_POWERUPS, ...(saved.powerUps ?? {}) },
          levelProgress: saved.levelProgress ?? {},
          completedScores: saved.completedScores ?? [],
          ownedCosmetics: saved.ownedCosmetics ?? [],
          equippedFrame: (saved.ownedCosmetics ?? []).includes(saved.equippedFrame ?? '') || saved.equippedFrame === 'frame_blink_normal' || saved.equippedFrame === 'frame_none' ? (saved.equippedFrame ?? 'frame_blink_normal') : 'frame_blink_normal',
          equippedBanner: (saved.ownedCosmetics ?? []).includes(saved.equippedBanner ?? '') || saved.equippedBanner === 'banner_none' || saved.equippedBanner === 'banner_purple_wave' ? (saved.equippedBanner ?? 'banner_none') : 'banner_none',
          equippedNameColor: (saved.ownedCosmetics ?? []).includes(saved.equippedNameColor ?? '') || saved.equippedNameColor === 'name_default' ? (saved.equippedNameColor ?? 'name_default') : 'name_default',
          equippedExpression: (saved.ownedCosmetics ?? []).includes(saved.equippedExpression ?? '') || saved.equippedExpression === 'expr_normal' ? (saved.equippedExpression ?? 'expr_normal') : 'expr_normal',
          loginReward: saved.loginReward ?? { ...INITIAL_LOGIN_REWARD_STATE },
          _hydrated: true,
        });
      } else {
        set({ _hydrated: true });
      }
    },
    saveState: () => saveState(get()),
    setAuthUserId: (id: string) => set({ _authUserId: id }),
    revokeSubscription: () => {
      // Flip status to inactive, strip subscriber-only cosmetics, and reset
      // any equipped subscriber cosmetics back to defaults. Called by
      // `loadFromCloud` when the cloud reports inactive (cross-device
      // cancellation), and future RevenueCat entitlement listeners.
      const { ownedCosmetics, equippedFrame, equippedBanner, equippedNameColor, equippedExpression } = get();
      const cleaned = ownedCosmetics.filter(id => !SUBSCRIBER_COSMETIC_IDS.includes(id));
      set({
        subscriptionStatus: 'inactive',
        ownedCosmetics: cleaned,
        equippedFrame: SUBSCRIBER_COSMETIC_IDS.includes(equippedFrame) ? 'frame_blink_normal' : equippedFrame,
        equippedBanner: SUBSCRIBER_COSMETIC_IDS.includes(equippedBanner) ? 'banner_none' : equippedBanner,
        equippedNameColor: SUBSCRIBER_COSMETIC_IDS.includes(equippedNameColor) ? 'name_default' : equippedNameColor,
        equippedExpression: SUBSCRIBER_COSMETIC_IDS.includes(equippedExpression) ? 'expr_normal' : equippedExpression,
      });
      setTimeout(() => saveState(get()), 0);
    },

    // Cloud sync
    syncToCloud: () => {
      const uid = get()._authUserId;
      if (uid) {
        saveProgressToSupabase(uid, get()).catch((e) => console.warn('Sync failed:', e));
      }
    },
    loadFromCloud: async (userId: string) => {
      const cloud = await loadProgressFromSupabase(userId);
      if (!cloud) return;
      const local = get();
      const localHasProgress = Object.keys(local.levelProgress).length > 0;

      // Merge level progress — keep the best from either source
      const mergedProgress = { ...cloud.levelProgress };
      for (const [id, lp] of Object.entries(local.levelProgress)) {
        const cp = mergedProgress[id];
        if (!cp) {
          mergedProgress[id] = lp;
        } else {
          mergedProgress[id] = {
            stars: Math.max(cp.stars, lp.stars),
            bestScore: Math.max(cp.bestScore, lp.bestScore),
            attempts: Math.max(cp.attempts, lp.attempts),
          };
        }
      }

      // Recalculate total stars from merged progress
      const mergedTotalStars = Object.values(mergedProgress).reduce((sum, p) => sum + p.stars, 0);
      const mergedScores = Object.values(mergedProgress).filter(p => p.bestScore > 0).map(p => p.bestScore);

      // ── Subscription: cloud is the source of truth ──
      // Cancellation propagates across devices here. If cloud says inactive
      // we drop local subscriber cosmetics and reset equipped items to
      // defaults — matching the same cleanup as `revokeSubscription`.
      // (The one exception is that `activatePlus` syncs immediately, so a
      //  freshly-bought local 'active' will be on the cloud before the next
      //  foreground resume fires loadFromCloud.)
      const cloudSubStatus: SubscriptionStatus = cloud.subscriptionStatus ?? 'inactive';
      const cloudIsActive = cloudSubStatus === 'active';

      // Merge cosmetics — keep union of both local and cloud (never lose a
      // purchase) UNLESS cloud says the user isn't a subscriber, in which
      // case subscriber-only cosmetics get stripped from the merge.
      let mergedCosmetics = [...new Set([...local.ownedCosmetics, ...cloud.ownedCosmetics])];
      if (!cloudIsActive) {
        mergedCosmetics = mergedCosmetics.filter((id) => !SUBSCRIBER_COSMETIC_IDS.includes(id));
      }
      // Resolve the "what should this equipped slot be?" question:
      //   - If the incoming id is nullish (never synced, fresh account)
      //     OR is a subscriber cosmetic on a non-subscriber → fall back.
      //   - Otherwise use whatever was passed in. This prevents null from
      //     leaking into the store and getting persisted to Supabase,
      //     which historically left the equipped_* columns stuck at null
      //     and made friends see a default Blink instead of the real
      //     customisation.
      const resolveEquipped = (id: string | null | undefined, fallback: string): string => {
        if (!id) return fallback;
        if (!cloudIsActive && SUBSCRIBER_COSMETIC_IDS.includes(id)) return fallback;
        return id;
      };

      // Login reward: pick whichever record was claimed most recently so the
      // player's streak and position in the 7-day cycle follow them across
      // devices. A claim from today always wins.
      const pickLoginReward = (): LoginRewardState => {
        const localLR = local.loginReward ?? { ...INITIAL_LOGIN_REWARD_STATE };
        const cloudLR = cloud.loginReward ?? { ...INITIAL_LOGIN_REWARD_STATE };
        if (!localLR.lastClaimDate) return cloudLR;
        if (!cloudLR.lastClaimDate) return localLR;
        return cloudLR.lastClaimDate >= localLR.lastClaimDate ? cloudLR : localLR;
      };

      set({
        gems: localHasProgress ? local.gems : cloud.gems,
        lives: localHasProgress ? local.lives : cloud.lives,
        livesLastLostAt: localHasProgress ? local.livesLastLostAt : cloud.livesLastLostAt,
        streakCount: Math.max(cloud.streakCount, local.streakCount),
        bestStreak: Math.max(cloud.bestStreak ?? 0, local.bestStreak ?? 0, cloud.streakCount, local.streakCount),
        daysPlayed: Math.max(cloud.daysPlayed ?? 0, local.daysPlayed ?? 0),
        // Username is server-sourced (set via app/username.tsx). Cloud wins;
        // keep local only as a fallback if cloud hasn't returned one.
        username: cloud.username ?? local.username ?? null,
        // Avatar url is server-sourced too (set via avatarUpload.ts
        // after a Supabase Storage upload succeeds). Cloud wins so a
        // fresh device picks up the player's uploaded photo on first
        // login without needing localStorage.
        avatarUrl: cloud.avatarUrl ?? local.avatarUrl ?? null,
        totalStars: mergedTotalStars,
        highestWorld: Math.max(cloud.highestWorld, local.highestWorld),
        levelProgress: mergedProgress,
        completedScores: mergedScores,
        subscriptionStatus: cloudSubStatus,
        ownedCosmetics: mergedCosmetics,
        equippedFrame: resolveEquipped(localHasProgress ? local.equippedFrame : cloud.equippedFrame, 'frame_blink_normal'),
        equippedBanner: resolveEquipped(localHasProgress ? local.equippedBanner : cloud.equippedBanner, 'banner_none'),
        equippedNameColor: resolveEquipped(localHasProgress ? local.equippedNameColor : cloud.equippedNameColor, 'name_default'),
        equippedExpression: resolveEquipped(localHasProgress ? local.equippedExpression : cloud.equippedExpression, 'expr_normal'),
        // Power-ups: keep the max of each type from local and cloud
        powerUps: (() => {
          const merged = { ...local.powerUps };
          for (const [key, val] of Object.entries(cloud.powerUps)) {
            merged[key as keyof typeof merged] = Math.max((merged as any)[key] ?? 0, val as number);
          }
          return merged;
        })(),
        // Streak milestones: union of claimed milestones (prevent re-claiming)
        streakMilestonesClaimed: [...new Set([...local.streakMilestonesClaimed, ...cloud.streakMilestonesClaimed])],
        lastPlayDate: local.lastPlayDate ?? cloud.lastPlayDate,
        completedScores: localHasProgress ? local.completedScores : cloud.completedScores,
        maxLives: Math.max(local.maxLives, cloud.maxLives),
        loginReward: pickLoginReward(),
      });
      setTimeout(() => saveState(get()), 0);
    },
    startLevel: (level) => {
      // Reset transient gameplay counters. The session counter is NOT
      // reset here — it accumulates across levels until the app is
      // backgrounded for long enough (handled elsewhere).
      set({
        currentLevel: level,
        gameState: 'MEMORISE' as GameState,
        currentSceneIndex: 0,
        currentQuestionIndex: 0,
        answers: [],
        selectedOption: null,
        revealedCorrect: null,
        score: 0,
        levelPowerUpsUsed: 0,
        currentQuestionStartedAt: Date.now(),
      });
    },
    setGameState: (gameState) => {
      // When the gameplay state machine transitions into QUESTION we
      // stamp the start time so the weekly challenge tracker can tell
      // whether an answer came in under 2 seconds.
      if (gameState === 'QUESTION') {
        set({ gameState, currentQuestionStartedAt: Date.now() });
      } else {
        set({ gameState });
      }
    },
    selectOption: (index) => set({ selectedOption: index }),
    revealAnswer: () => {
      const { currentLevel, currentSceneIndex, currentQuestionIndex, selectedOption, answers, currentQuestionStartedAt } = get();
      if (!currentLevel) return;
      const scene = currentLevel.scenes[currentSceneIndex];
      if (!scene || currentQuestionIndex >= scene.questions.length) return;
      const q = scene.questions[currentQuestionIndex];
      const isCorrect = selectedOption !== null && selectedOption === q.correctIndex;
      const responseTimeMs = Date.now() - currentQuestionStartedAt;
      set({
        revealedCorrect: q.correctIndex,
        answers: [...answers, { questionId: q.id, selectedIndex: selectedOption, correctIndex: q.correctIndex, isCorrect }],
        gameState: 'REVEAL',
      });
      // Fire-and-forget weekly challenge tracking. Any completion toast
      // is surfaced by the result screen when the level finishes.
      import('@/src/utils/weeklyChallenges')
        .then((m) => m.recordQuestionAnsweredForChallenges(isCorrect, responseTimeMs))
        .catch(() => {});
    },
    nextQuestion: () => {
      const { currentLevel, currentSceneIndex, currentQuestionIndex } = get();
      if (!currentLevel) return;
      const scene = currentLevel.scenes[currentSceneIndex];
      if (!scene) return;
      const nq = currentQuestionIndex + 1;
      if (nq < scene.questions.length) {
        set({ currentQuestionIndex: nq, selectedOption: null, revealedCorrect: null, gameState: 'QUESTION', currentQuestionStartedAt: Date.now() });
      } else {
        const ns = currentSceneIndex + 1;
        if (ns < currentLevel.scenes.length) set({ gameState: 'SCENE_SCORE', selectedOption: null, revealedCorrect: null });
        else get().completeLevel();
      }
    },
    nextScene: () => {
      const { currentSceneIndex } = get();
      set({ currentSceneIndex: currentSceneIndex + 1, currentQuestionIndex: 0, selectedOption: null, revealedCorrect: null, gameState: 'MEMORISE' });
    },
    completeLevel: () => { const { answers, currentLevel } = get(); if (!currentLevel) return; const t = answers.length; const c = answers.filter((a) => a.isCorrect).length; const pct = t > 0 ? Math.round((c / t) * 100) : 0; set({ score: pct, gameState: pct >= currentLevel.requiredScore ? 'COMPLETE' : 'FAILED' }); },
    resetGame: () => set({
      currentLevel: null,
      gameState: 'READY',
      currentSceneIndex: 0,
      currentQuestionIndex: 0,
      answers: [],
      selectedOption: null,
      revealedCorrect: null,
      score: 0,
      levelPowerUpsUsed: 0,
    }),
    bumpSessionLevelCount: () => set((s) => ({
      sessionLevelCount: s.sessionLevelCount + 1,
      sessionLastTouchedAt: Date.now(),
    })),
    resetSessionLevelCount: () => set({
      sessionLevelCount: 0,
      sessionLastTouchedAt: Date.now(),
    }),
  };
});
