import { create } from 'zustand';
import type { Level, GameState } from '@/src/types/game';
import { GEM_REWARDS, calculateReplayReward, checkStreakMilestone, INITIAL_GEMS, LIVES_CONFIG, POWER_UP_COSTS, bundlePrice, type PowerUpId } from '@/src/utils/scoring';
import { logEconomyEvent, ECONOMY_EVENTS } from '@/src/utils/economyLogger';
import { saveProgressToSupabase, loadProgressFromSupabase } from '@/src/utils/progressSync';
import { supabase } from '@/src/lib/supabase';

/** In-memory fallback for platforms where localStorage is unavailable */
let _memoryUserId: string | null = null;

/** Get current user ID for economy logging */
function getUserId(): string {
  try {
    // @ts-ignore - access session synchronously from cache
    const session = (supabase as any).auth?.session?.();
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
  slowTime: number;
  peek: number;
  fiftyFifty: number;
  skip: number;
}

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
function loadState(): Partial<GameStore> {
  try {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem('blanked-progress');
    if (!saved) return {};
    return JSON.parse(saved);
  } catch { return {}; }
}

function saveState(state: GameStore) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem('blanked-progress', JSON.stringify({
      gems: state.gems, lives: state.lives, maxLives: state.maxLives, livesLastLostAt: state.livesLastLostAt,
      streakCount: state.streakCount, streakMilestonesClaimed: state.streakMilestonesClaimed, lastPlayDate: state.lastPlayDate,
      totalStars: state.totalStars, highestWorld: state.highestWorld,
      levelProgress: state.levelProgress, completedScores: state.completedScores,
      powerUps: state.powerUps,
    }));
  } catch (e) {
    console.warn('Save state failed:', e);
  }

  // Also sync to Supabase (debounced, fire and forget)
  clearTimeout((saveState as any)._syncTimer);
  (saveState as any)._syncTimer = setTimeout(() => {
    const uid = state._authUserId;
    if (uid) {
      saveProgressToSupabase(uid, state).catch((e) => console.warn('Sync failed:', e));
    }
  }, 2000);
}

export interface GameStore {
  _authUserId: string | null; // Real Supabase auth user ID, set by CloudSyncLoader
  gems: number; lives: number; maxLives: number; livesLastLostAt: number | null;
  streakCount: number; streakMilestonesClaimed: number[]; lastPlayDate: string | null;
  totalStars: number; highestWorld: number;
  powerUps: PowerUpInventory;
  levelProgress: Record<string, { stars: number; bestScore: number; attempts: number }>;
  completedScores: number[];
  currentLevel: Level | null; gameState: GameState; currentSceneIndex: number; currentQuestionIndex: number;
  answers: Answer[]; selectedOption: number | null; revealedCorrect: number | null; score: number;
  _hydrated: boolean;

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
  buyPowerUp: (id: PowerUpId, qty?: number) => boolean;
  usePowerUp: (id: PowerUpId) => boolean;
  getPowerUpCount: (id: PowerUpId) => number;

  // Level completion with economy
  recordLevelComplete: (id: string, stars: number, pct: number) => number; // returns gems earned

  // Cloud sync
  syncToCloud: () => void;
  loadFromCloud: (userId: string) => Promise<void>;

  // Helpers
  getNextUnplayedLevelId: () => string;
  getMemoryScore: () => number;
  getCompletedLevelCount: () => number;

  // Hydration — re-read localStorage after mount (fixes SSR/static export)
  hydrate: () => void;
  saveState: () => void;
  setAuthUserId: (id: string) => void;

  // Gameplay
  startLevel: (l: Level) => void;
  setGameState: (s: GameState) => void;
  selectOption: (i: number | null) => void;
  revealAnswer: () => void;
  nextQuestion: () => void;
  nextScene: () => void;
  completeLevel: () => void;
  resetGame: () => void;
}

export const LIFE_REGEN_MS = LIVES_CONFIG.regenTimeMinutes * 60 * 1000;

export const useGameStore = create<GameStore>((set, get) => {
  const saved = loadState();

  return {
    gems: (saved as any).gems ?? INITIAL_GEMS,
    lives: (saved as any).lives ?? LIVES_CONFIG.maxLives,
    maxLives: (saved as any).maxLives ?? LIVES_CONFIG.maxLives,
    livesLastLostAt: (saved as any).livesLastLostAt ?? null,
    streakCount: (saved as any).streakCount ?? 0,
    lastPlayDate: (saved as any).lastPlayDate ?? null,
    streakMilestonesClaimed: (saved as any).streakMilestonesClaimed ?? [],
    totalStars: (saved as any).totalStars ?? 0,
    highestWorld: (saved as any).highestWorld ?? 1,
    powerUps: (saved as any).powerUps ?? { slowTime: 0, peek: 0, fiftyFifty: 0, skip: 0 },
    levelProgress: (saved as any).levelProgress ?? {},
    completedScores: (saved as any).completedScores ?? [],
    currentLevel: null,
    gameState: 'READY' as GameState,
    currentSceneIndex: 0,
    currentQuestionIndex: 0,
    answers: [] as Answer[],
    selectedOption: null,
    revealedCorrect: null,
    score: 0,
    _authUserId: null,
    _hydrated: false,

    addGems: (amount) => { set((s) => ({ gems: s.gems + amount })); setTimeout(() => saveState(get()), 0); },
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
      const { lastPlayDate, streakCount } = get();
      if (lastPlayDate === today) return; // Already played today
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const newStreak = lastPlayDate === yesterday ? streakCount + 1 : 1; // Continue or restart
      set({ streakCount: newStreak, lastPlayDate: today });
      setTimeout(() => saveState(get()), 0);
    },
    resetStreak: () => { set({ streakCount: 0, lastPlayDate: null }); setTimeout(() => saveState(get()), 0); },
    checkLifeRegen: () => {
      const { lives, maxLives, livesLastLostAt } = get();
      if (lives >= maxLives || !livesLastLostAt) return;
      const elapsed = Date.now() - livesLastLostAt;
      const regen = Math.floor(elapsed / LIFE_REGEN_MS);
      if (regen > 0) {
        const actualRegen = Math.min(regen, maxLives - lives); // Cap to max lives deficit
        const nl = Math.min(maxLives, lives + regen);
        set({ lives: nl, livesLastLostAt: nl >= maxLives ? null : Date.now() - (elapsed % LIFE_REGEN_MS) });
        setTimeout(() => saveState(get()), 0);
        if (actualRegen > 0) logEconomyEvent(getUserId(), ECONOMY_EVENTS.LIFE_REGEN, actualRegen);
      }
    },

    // Power-up inventory
    buyPowerUp: (id, qty = 1) => {
      const cost = bundlePrice(POWER_UP_COSTS[id], qty);
      const { gems } = get();
      if (gems < cost) return false;
      set((s) => ({
        gems: s.gems - cost,
        powerUps: { ...s.powerUps, [id]: s.powerUps[id] + qty },
      }));
      setTimeout(() => saveState(get()), 0);
      logEconomyEvent(getUserId(), ECONOMY_EVENTS.GEM_SPEND_POWERUP, -cost, { powerUp: id, qty });
      return true;
    },
    usePowerUp: (id) => {
      const { powerUps } = get();
      if (powerUps[id] <= 0) return false;
      set((s) => ({
        powerUps: { ...s.powerUps, [id]: s.powerUps[id] - 1 },
      }));
      setTimeout(() => saveState(get()), 0);
      logEconomyEvent(getUserId(), ECONOMY_EVENTS.POWERUP_USED, -1, { powerUp: id, levelId: get().currentLevel?.id });
      return true;
    },
    getPowerUpCount: (id) => get().powerUps[id],

    // Level completion with replay economy
    recordLevelComplete: (levelId, stars, scorePercent) => {
      const existing = get().levelProgress[levelId];
      let gemsEarned = 0;

      if (existing) {
        gemsEarned = calculateReplayReward(existing.stars, stars);
      } else {
        gemsEarned = GEM_REWARDS[stars as 0 | 1 | 2 | 3] ?? 0;
      }

      set((s) => ({
        gems: s.gems + gemsEarned,
        levelProgress: {
          ...s.levelProgress,
          [levelId]: {
            stars: existing ? Math.max(existing.stars, stars) : stars,
            bestScore: existing ? Math.max(existing.bestScore, scorePercent) : scorePercent,
            attempts: existing ? existing.attempts + 1 : 1,
          },
        },
        completedScores: [...s.completedScores, scorePercent],
      }));
      setTimeout(() => saveState(get()), 0);

      // Immediately sync to cloud so progress is saved even if app is killed
      const uid = get()._authUserId;
      if (uid) {
        setTimeout(() => saveProgressToSupabase(uid, get()).catch((e) => console.warn('Post-level sync failed:', e)), 500);
      }

      // Log to economy tracker
      if (gemsEarned > 0) {
        logEconomyEvent(getUserId(), ECONOMY_EVENTS.GEM_EARN_LEVEL, gemsEarned, { levelId, stars, scorePercent, replay: !!existing });
      }
      return gemsEarned;
    },

    getNextUnplayedLevelId: () => { const { levelProgress } = get(); const ids = buildLevelIds(); return ids.find((id) => !(id in levelProgress)) ?? ids[ids.length - 1]; },
    getMemoryScore: () => { const { completedScores } = get(); if (completedScores.length === 0) return 0; return Math.round(completedScores.reduce((a, v) => a + v, 0) / completedScores.length); },
    getCompletedLevelCount: () => Object.keys(get().levelProgress).length,

    // Re-read localStorage after mount — fixes static export where loadState() runs before window is ready
    hydrate: () => {
      if (get()._hydrated) return;
      migrateWorldProgress();
      const saved = loadState();
      const hasData = saved && typeof (saved as Record<string, unknown>).gems === 'number';
      if (hasData) {
        const s = saved as Record<string, unknown>;
        set({
          gems: s.gems as number ?? INITIAL_GEMS,
          lives: s.lives as number ?? LIVES_CONFIG.maxLives,
          maxLives: s.maxLives as number ?? LIVES_CONFIG.maxLives,
          livesLastLostAt: s.livesLastLostAt as number | null ?? null,
          streakCount: s.streakCount as number ?? 0,
          streakMilestonesClaimed: s.streakMilestonesClaimed as number[] ?? [],
          lastPlayDate: s.lastPlayDate as string | null ?? null,
          totalStars: s.totalStars as number ?? 0,
          highestWorld: s.highestWorld as number ?? 1,
          powerUps: s.powerUps as PowerUpInventory ?? { slowTime: 0, peek: 0, fiftyFifty: 0, skip: 0 },
          levelProgress: s.levelProgress as Record<string, { stars: number; bestScore: number; attempts: number }> ?? {},
          completedScores: s.completedScores as number[] ?? [],
          _hydrated: true,
        });
      } else {
        set({ _hydrated: true });
      }
    },
    saveState: () => saveState(get()),
    setAuthUserId: (id: string) => set({ _authUserId: id }),

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

      // For gems/lives: if local has real progress, trust local (it's more current).
      // Only use cloud values if local is fresh/empty (new device).
      set({
        gems: localHasProgress ? local.gems : cloud.gems,
        lives: localHasProgress ? local.lives : cloud.lives,
        livesLastLostAt: localHasProgress ? local.livesLastLostAt : cloud.livesLastLostAt,
        streakCount: Math.max(cloud.streakCount, local.streakCount),
        totalStars: mergedTotalStars,
        highestWorld: Math.max(cloud.highestWorld, local.highestWorld),
        levelProgress: mergedProgress,
        completedScores: mergedScores,
      });
      setTimeout(() => saveState(get()), 0);
    },
    startLevel: (level) => set({ currentLevel: level, gameState: 'MEMORISE' as GameState, currentSceneIndex: 0, currentQuestionIndex: 0, answers: [], selectedOption: null, revealedCorrect: null, score: 0 }),
    setGameState: (gameState) => set({ gameState }),
    selectOption: (index) => set({ selectedOption: index }),
    revealAnswer: () => { const { currentLevel, currentSceneIndex, currentQuestionIndex, selectedOption, answers } = get(); if (!currentLevel) return; const scene = currentLevel.scenes[currentSceneIndex]; if (!scene || currentQuestionIndex >= scene.questions.length) return; const q = scene.questions[currentQuestionIndex]; set({ revealedCorrect: q.correctIndex, answers: [...answers, { questionId: q.id, selectedIndex: selectedOption, correctIndex: q.correctIndex, isCorrect: selectedOption !== null && selectedOption === q.correctIndex }], gameState: 'REVEAL' }); },
    nextQuestion: () => { const { currentLevel, currentSceneIndex, currentQuestionIndex } = get(); if (!currentLevel) return; const scene = currentLevel.scenes[currentSceneIndex]; if (!scene) return; const nq = currentQuestionIndex + 1; if (nq < scene.questions.length) { set({ currentQuestionIndex: nq, selectedOption: null, revealedCorrect: null, gameState: 'QUESTION' }); } else { const ns = currentSceneIndex + 1; if (ns < currentLevel.scenes.length) set({ gameState: 'SCENE_SCORE' }); else get().completeLevel(); } },
    nextScene: () => { const { currentSceneIndex } = get(); set({ currentSceneIndex: currentSceneIndex + 1, currentQuestionIndex: 0, selectedOption: null, revealedCorrect: null, gameState: 'MEMORISE' }); },
    completeLevel: () => { const { answers, currentLevel } = get(); if (!currentLevel) return; const t = answers.length; const c = answers.filter((a) => a.isCorrect).length; const pct = t > 0 ? Math.round((c / t) * 100) : 0; set({ score: pct, gameState: pct >= currentLevel.requiredScore ? 'COMPLETE' : 'FAILED' }); },
    resetGame: () => set({ currentLevel: null, gameState: 'READY', currentSceneIndex: 0, currentQuestionIndex: 0, answers: [], selectedOption: null, revealedCorrect: null, score: 0 }),
  };
});
