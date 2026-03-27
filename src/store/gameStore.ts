import { create } from 'zustand';
import type { Level, GameState } from '@/src/types/game';

interface Answer {
  questionId: string;
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
}

function buildLevelIds(): string[] {
  const ids: string[] = [];
  for (let i = 1; i <= 10; i++) ids.push(`w1-l${i}`);
  return ids;
}

export interface GameStore {
  gems: number;
  lives: number;
  maxLives: number;
  livesLastLostAt: number | null;
  streakCount: number;
  totalStars: number;
  highestWorld: number;
  levelProgress: Record<string, { stars: number; bestScore: number; attempts: number }>;
  completedScores: number[];
  currentLevel: Level | null;
  gameState: GameState;
  currentSceneIndex: number;
  currentQuestionIndex: number;
  answers: Answer[];
  selectedOption: number | null;
  revealedCorrect: number | null;
  score: number;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  loseLife: () => void;
  refillLives: () => void;
  addStars: (count: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  recordLevelComplete: (levelId: string, stars: number, scorePercent: number) => void;
  getNextUnplayedLevelId: () => string;
  getMemoryScore: () => number;
  getCompletedLevelCount: () => number;
  startLevel: (level: Level) => void;
  setGameState: (state: GameState) => void;
  selectOption: (index: number | null) => void;
  revealAnswer: () => void;
  nextQuestion: () => void;
  nextScene: () => void;
  completeLevel: () => void;
  resetGame: () => void;
}

export const LIFE_REGEN_MS = 30 * 60 * 1000;

export const useGameStore = create<GameStore>((set, get) => ({
  gems: 100, lives: 5, maxLives: 5, livesLastLostAt: null, streakCount: 0, totalStars: 0, highestWorld: 1,
  levelProgress: {}, completedScores: [],
  currentLevel: null, gameState: 'READY', currentSceneIndex: 0, currentQuestionIndex: 0, answers: [], selectedOption: null, revealedCorrect: null, score: 0,

  addGems: (amount) => set((s) => ({ gems: s.gems + amount })),
  spendGems: (amount) => { const { gems } = get(); if (gems < amount) return false; set({ gems: gems - amount }); return true; },
  loseLife: () => set((s) => ({ lives: Math.max(0, s.lives - 1), livesLastLostAt: Date.now() })),
  refillLives: () => set((s) => ({ lives: s.maxLives, livesLastLostAt: null })),
  addStars: (count) => set((s) => ({ totalStars: s.totalStars + count })),
  incrementStreak: () => set((s) => ({ streakCount: s.streakCount + 1 })),
  resetStreak: () => set({ streakCount: 0 }),

  recordLevelComplete: (levelId, stars, scorePercent) => set((s) => {
    const existing = s.levelProgress[levelId];
    return {
      levelProgress: { ...s.levelProgress, [levelId]: { stars: existing ? Math.max(existing.stars, stars) : stars, bestScore: existing ? Math.max(existing.bestScore, scorePercent) : scorePercent, attempts: existing ? existing.attempts + 1 : 1 } },
      completedScores: [...s.completedScores, scorePercent],
    };
  }),
  getNextUnplayedLevelId: () => { const { levelProgress } = get(); const ids = buildLevelIds(); return ids.find((id) => !(id in levelProgress)) ?? ids[ids.length - 1]; },
  getMemoryScore: () => { const { completedScores } = get(); if (completedScores.length === 0) return 0; return Math.round(completedScores.reduce((a, v) => a + v, 0) / completedScores.length); },
  getCompletedLevelCount: () => Object.keys(get().levelProgress).length,

  startLevel: (level) => set({ currentLevel: level, gameState: 'MEMORISE', currentSceneIndex: 0, currentQuestionIndex: 0, answers: [], selectedOption: null, revealedCorrect: null, score: 0 }),
  setGameState: (gameState) => set({ gameState }),
  selectOption: (index) => set({ selectedOption: index }),
  revealAnswer: () => { const { currentLevel, currentSceneIndex, currentQuestionIndex, selectedOption, answers } = get(); if (!currentLevel) return; const scene = currentLevel.scenes[currentSceneIndex]; if (!scene || currentQuestionIndex >= scene.questions.length) return; const question = scene.questions[currentQuestionIndex]; const isCorrect = selectedOption !== null && selectedOption === question.correctIndex; set({ revealedCorrect: question.correctIndex, answers: [...answers, { questionId: question.id, selectedIndex: selectedOption, correctIndex: question.correctIndex, isCorrect }], gameState: 'REVEAL' }); },
  nextQuestion: () => { const { currentLevel, currentSceneIndex, currentQuestionIndex } = get(); if (!currentLevel) return; const scene = currentLevel.scenes[currentSceneIndex]; if (!scene) return; const nextQ = currentQuestionIndex + 1; if (nextQ < scene.questions.length) { set({ currentQuestionIndex: nextQ, selectedOption: null, revealedCorrect: null, gameState: 'QUESTION' }); } else { const ns = currentSceneIndex + 1; if (ns < currentLevel.scenes.length) { set({ gameState: 'SCENE_SCORE' }); } else { get().completeLevel(); } } },
  nextScene: () => { const { currentSceneIndex } = get(); set({ currentSceneIndex: currentSceneIndex + 1, currentQuestionIndex: 0, selectedOption: null, revealedCorrect: null, gameState: 'MEMORISE' }); },
  completeLevel: () => { const { answers, currentLevel } = get(); if (!currentLevel) return; const total = answers.length; const correct = answers.filter((a) => a.isCorrect).length; const pct = total > 0 ? Math.round((correct / total) * 100) : 0; set({ score: pct, gameState: pct >= currentLevel.requiredScore ? 'COMPLETE' : 'FAILED' }); },
  resetGame: () => set({ currentLevel: null, gameState: 'READY', currentSceneIndex: 0, currentQuestionIndex: 0, answers: [], selectedOption: null, revealedCorrect: null, score: 0 }),
}));
