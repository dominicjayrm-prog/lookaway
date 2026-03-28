import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Level, GameState } from '@/src/types/game';

interface Answer { questionId: string; selectedIndex: number | null; correctIndex: number; isCorrect: boolean; }
function buildLevelIds(): string[] { const ids: string[] = []; for (let i = 1; i <= 10; i++) ids.push(`w1-l${i}`); return ids; }

// Web-safe storage that falls back gracefully
const webStorage = {
  getItem: (name: string): string | null => { try { return typeof window !== 'undefined' ? localStorage.getItem(name) : null; } catch { return null; } },
  setItem: (name: string, value: string): void => { try { if (typeof window !== 'undefined') localStorage.setItem(name, value); } catch {} },
  removeItem: (name: string): void => { try { if (typeof window !== 'undefined') localStorage.removeItem(name); } catch {} },
};

export interface GameStore {
  gems: number; lives: number; maxLives: number; livesLastLostAt: number | null; streakCount: number; totalStars: number; highestWorld: number;
  levelProgress: Record<string, { stars: number; bestScore: number; attempts: number }>; completedScores: number[];
  currentLevel: Level | null; gameState: GameState; currentSceneIndex: number; currentQuestionIndex: number; answers: Answer[]; selectedOption: number | null; revealedCorrect: number | null; score: number;
  addGems: (a: number) => void; spendGems: (a: number) => boolean; loseLife: () => void; refillLives: () => void; addStars: (c: number) => void; incrementStreak: () => void; resetStreak: () => void; checkLifeRegen: () => void;
  recordLevelComplete: (id: string, stars: number, pct: number) => void; getNextUnplayedLevelId: () => string; getMemoryScore: () => number; getCompletedLevelCount: () => number;
  startLevel: (l: Level) => void; setGameState: (s: GameState) => void; selectOption: (i: number | null) => void; revealAnswer: () => void; nextQuestion: () => void; nextScene: () => void; completeLevel: () => void; resetGame: () => void;
}

export const LIFE_REGEN_MS = 30 * 60 * 1000;

export const useGameStore = create<GameStore>()(persist((set, get) => ({
  gems: 100, lives: 5, maxLives: 5, livesLastLostAt: null, streakCount: 0, totalStars: 0, highestWorld: 1,
  levelProgress: {}, completedScores: [],
  currentLevel: null, gameState: 'READY' as GameState, currentSceneIndex: 0, currentQuestionIndex: 0, answers: [] as Answer[], selectedOption: null, revealedCorrect: null, score: 0,
  addGems: (amount) => set((s) => ({ gems: s.gems + amount })),
  spendGems: (amount) => { const { gems } = get(); if (gems < amount) return false; set({ gems: gems - amount }); return true; },
  loseLife: () => set((s) => ({ lives: Math.max(0, s.lives - 1), livesLastLostAt: Date.now() })),
  refillLives: () => set((s) => ({ lives: s.maxLives, livesLastLostAt: null })),
  addStars: (count) => set((s) => ({ totalStars: s.totalStars + count })),
  incrementStreak: () => set((s) => ({ streakCount: s.streakCount + 1 })),
  resetStreak: () => set({ streakCount: 0 }),
  checkLifeRegen: () => { const { lives, maxLives, livesLastLostAt } = get(); if (lives >= maxLives || !livesLastLostAt) return; const elapsed = Date.now() - livesLastLostAt; const regen = Math.floor(elapsed / LIFE_REGEN_MS); if (regen > 0) { const nl = Math.min(maxLives, lives + regen); set({ lives: nl, livesLastLostAt: nl >= maxLives ? null : Date.now() - (elapsed % LIFE_REGEN_MS) }); } },
  recordLevelComplete: (levelId, stars, scorePercent) => set((s) => { const e = s.levelProgress[levelId]; return { levelProgress: { ...s.levelProgress, [levelId]: { stars: e ? Math.max(e.stars, stars) : stars, bestScore: e ? Math.max(e.bestScore, scorePercent) : scorePercent, attempts: e ? e.attempts + 1 : 1 } }, completedScores: [...s.completedScores, scorePercent] }; }),
  getNextUnplayedLevelId: () => { const { levelProgress } = get(); const ids = buildLevelIds(); return ids.find((id) => !(id in levelProgress)) ?? ids[ids.length - 1]; },
  getMemoryScore: () => { const { completedScores } = get(); if (completedScores.length === 0) return 0; return Math.round(completedScores.reduce((a, v) => a + v, 0) / completedScores.length); },
  getCompletedLevelCount: () => Object.keys(get().levelProgress).length,
  startLevel: (level) => set({ currentLevel: level, gameState: 'MEMORISE' as GameState, currentSceneIndex: 0, currentQuestionIndex: 0, answers: [], selectedOption: null, revealedCorrect: null, score: 0 }),
  setGameState: (gameState) => set({ gameState }),
  selectOption: (index) => set({ selectedOption: index }),
  revealAnswer: () => { const { currentLevel, currentSceneIndex, currentQuestionIndex, selectedOption, answers } = get(); if (!currentLevel) return; const scene = currentLevel.scenes[currentSceneIndex]; if (!scene || currentQuestionIndex >= scene.questions.length) return; const q = scene.questions[currentQuestionIndex]; set({ revealedCorrect: q.correctIndex, answers: [...answers, { questionId: q.id, selectedIndex: selectedOption, correctIndex: q.correctIndex, isCorrect: selectedOption !== null && selectedOption === q.correctIndex }], gameState: 'REVEAL' }); },
  nextQuestion: () => { const { currentLevel, currentSceneIndex, currentQuestionIndex } = get(); if (!currentLevel) return; const scene = currentLevel.scenes[currentSceneIndex]; if (!scene) return; const nq = currentQuestionIndex + 1; if (nq < scene.questions.length) { set({ currentQuestionIndex: nq, selectedOption: null, revealedCorrect: null, gameState: 'QUESTION' }); } else { const ns = currentSceneIndex + 1; if (ns < currentLevel.scenes.length) set({ gameState: 'SCENE_SCORE' }); else get().completeLevel(); } },
  nextScene: () => { const { currentSceneIndex } = get(); set({ currentSceneIndex: currentSceneIndex + 1, currentQuestionIndex: 0, selectedOption: null, revealedCorrect: null, gameState: 'MEMORISE' }); },
  completeLevel: () => { const { answers, currentLevel } = get(); if (!currentLevel) return; const t = answers.length; const c = answers.filter((a) => a.isCorrect).length; const pct = t > 0 ? Math.round((c / t) * 100) : 0; set({ score: pct, gameState: pct >= currentLevel.requiredScore ? 'COMPLETE' : 'FAILED' }); },
  resetGame: () => set({ currentLevel: null, gameState: 'READY', currentSceneIndex: 0, currentQuestionIndex: 0, answers: [], selectedOption: null, revealedCorrect: null, score: 0 }),
}), { name: 'lookaway-progress', storage: createJSONStorage(() => webStorage), partialize: (state) => ({ gems: state.gems, lives: state.lives, maxLives: state.maxLives, livesLastLostAt: state.livesLastLostAt, streakCount: state.streakCount, totalStars: state.totalStars, highestWorld: state.highestWorld, levelProgress: state.levelProgress, completedScores: state.completedScores }) }));
