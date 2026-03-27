import { create } from 'zustand';
import type { Level, GameState } from '@/src/types/game';

interface Answer {
  questionId: string;
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
}

export interface GameStore {
  // Player state
  gems: number;
  lives: number;
  maxLives: number;
  livesLastLostAt: number | null;
  streakCount: number;
  totalStars: number;
  highestWorld: number;

  // Current game state
  currentLevel: Level | null;
  gameState: GameState;
  currentSceneIndex: number;
  currentQuestionIndex: number;
  answers: Answer[];
  selectedOption: number | null;
  revealedCorrect: number | null;
  score: number;

  // Actions \u2014 player
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  loseLife: () => void;
  refillLives: () => void;
  addStars: (count: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;

  // Actions \u2014 game
  startLevel: (level: Level) => void;
  setGameState: (state: GameState) => void;
  selectOption: (index: number | null) => void;
  revealAnswer: () => void;
  nextQuestion: () => void;
  nextScene: () => void;
  completeLevel: () => void;
  resetGame: () => void;
}

export const LIFE_REGEN_MS = 30 * 60 * 1000; // 30 minutes

export const useGameStore = create<GameStore>((set, get) => ({
  // Player defaults
  gems: 100,
  lives: 5,
  maxLives: 5,
  livesLastLostAt: null,
  streakCount: 0,
  totalStars: 0,
  highestWorld: 1,

  // Game defaults
  currentLevel: null,
  gameState: 'READY',
  currentSceneIndex: 0,
  currentQuestionIndex: 0,
  answers: [],
  selectedOption: null,
  revealedCorrect: null,
  score: 0,

  // Player actions
  addGems: (amount) => set((s) => ({ gems: s.gems + amount })),

  spendGems: (amount) => {
    const { gems } = get();
    if (gems < amount) return false;
    set({ gems: gems - amount });
    return true;
  },

  loseLife: () =>
    set((s) => ({
      lives: Math.max(0, s.lives - 1),
      livesLastLostAt: Date.now(),
    })),

  refillLives: () =>
    set((s) => ({ lives: s.maxLives, livesLastLostAt: null })),

  addStars: (count) =>
    set((s) => ({ totalStars: s.totalStars + count })),

  incrementStreak: () =>
    set((s) => ({ streakCount: s.streakCount + 1 })),

  resetStreak: () => set({ streakCount: 0 }),

  // Game actions
  startLevel: (level) =>
    set({
      currentLevel: level,
      gameState: 'MEMORISE',
      currentSceneIndex: 0,
      currentQuestionIndex: 0,
      answers: [],
      selectedOption: null,
      revealedCorrect: null,
      score: 0,
    }),

  setGameState: (gameState) => set({ gameState }),

  selectOption: (index) => set({ selectedOption: index }),

  revealAnswer: () => {
    const { currentLevel, currentSceneIndex, currentQuestionIndex, selectedOption, answers } = get();
    if (!currentLevel) return;

    const scene = currentLevel.scenes[currentSceneIndex];
    if (!scene || currentQuestionIndex >= scene.questions.length) return;

    const question = scene.questions[currentQuestionIndex];
    const isCorrect = selectedOption !== null && selectedOption === question.correctIndex;

    const answer: Answer = {
      questionId: question.id,
      selectedIndex: selectedOption,
      correctIndex: question.correctIndex,
      isCorrect,
    };

    set({
      revealedCorrect: question.correctIndex,
      answers: [...answers, answer],
      gameState: 'REVEAL',
    });
  },

  nextQuestion: () => {
    const { currentLevel, currentSceneIndex, currentQuestionIndex } = get();
    if (!currentLevel) return;

    const scene = currentLevel.scenes[currentSceneIndex];
    if (!scene) return;

    const nextQ = currentQuestionIndex + 1;

    if (nextQ < scene.questions.length) {
      set({
        currentQuestionIndex: nextQ,
        selectedOption: null,
        revealedCorrect: null,
        gameState: 'QUESTION',
      });
    } else {
      const nextScene = currentSceneIndex + 1;
      if (nextScene < currentLevel.scenes.length) {
        set({ gameState: 'SCENE_SCORE' });
      } else {
        get().completeLevel();
      }
    }
  },

  nextScene: () => {
    const { currentSceneIndex } = get();
    set({
      currentSceneIndex: currentSceneIndex + 1,
      currentQuestionIndex: 0,
      selectedOption: null,
      revealedCorrect: null,
      gameState: 'MEMORISE',
    });
  },

  completeLevel: () => {
    const { answers, currentLevel } = get();
    if (!currentLevel) return;

    const totalQuestions = answers.length;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const scorePercent = totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

    const passed = scorePercent >= currentLevel.requiredScore;

    set({
      score: scorePercent,
      gameState: passed ? 'COMPLETE' : 'FAILED',
    });
  },

  resetGame: () =>
    set({
      currentLevel: null,
      gameState: 'READY',
      currentSceneIndex: 0,
      currentQuestionIndex: 0,
      answers: [],
      selectedOption: null,
      revealedCorrect: null,
      score: 0,
    }),
}));
