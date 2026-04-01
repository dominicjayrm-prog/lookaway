export type ShapeType =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'star'
  | 'diamond'
  | 'hexagon'
  | 'heart'
  | 'number'
  | 'letter';

export interface SceneObject {
  id: string;
  type: ShapeType;
  color: string;
  x: number; // 0-100 percentage position
  y: number; // 0-100 percentage position
  size: number; // Relative size 20-60
  rotation?: number;
  label?: string; // For number/letter types
  content?: string; // Number or letter displayed inside the shape (World 3+)
  zIndex?: number;
}

export type QuestionCategory =
  | 'count'
  | 'color'
  | 'position'
  | 'size'
  | 'detail'
  | 'comparison'
  | 'presence';

export interface Question {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  category: QuestionCategory;
  timeLimit: number; // seconds
}

export interface Scene {
  id: string;
  viewTime: number; // seconds to memorise
  objects: SceneObject[];
  questions: Question[];
}

export interface Level {
  id: string;
  worldId: number; // 1-6
  levelNumber: number; // 1-200
  title: string;
  scenes: Scene[];
  requiredScore: number; // min % to pass (typically 60)
  parScore: number; // score for 3 stars (typically 100)
}

export type GameState =
  | 'READY'
  | 'MEMORISE'
  | 'TRANSITION'
  | 'QUESTION'
  | 'REVEAL'
  | 'SCENE_SCORE'
  | 'COMPLETE'
  | 'FAILED';

export type PowerUpType = 'slowTime' | 'peek' | '50/50' | 'skip';

export interface PowerUp {
  type: PowerUpType;
  name: string;
  icon: string;
  cost: number;
  description: string;
}

export const POWER_UPS: Record<PowerUpType, PowerUp> = {
  slowTime: {
    type: 'slowTime',
    name: 'Slow Time',
    icon: '\u23F1',
    cost: 30,
    description: '+3 seconds viewing time',
  },
  peek: {
    type: 'peek',
    name: 'Peek',
    icon: '\uD83D\uDC41',
    cost: 40,
    description: 'Flash the scene for 1 second',
  },
  '50/50': {
    type: '50/50',
    name: '50/50',
    icon: '\u2702\uFE0F',
    cost: 25,
    description: 'Remove 2 wrong options',
  },
  skip: {
    type: 'skip',
    name: 'Skip',
    icon: '\u23ED',
    cost: 50,
    description: 'Skip question (counts as correct)',
  },
};
