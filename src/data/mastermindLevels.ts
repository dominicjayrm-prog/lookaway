/**
 * Mastermind level data types + stub loader.
 *
 * The actual level data (all 40 levels) will live in this file as
 * a hardcoded array in Chunk 3. For now, this exports the types
 * and a placeholder so the stage rendering system can be built
 * and tested against dummy data.
 */

export interface MastermindShape {
  id: string;
  type: 'circle' | 'square' | 'triangle' | 'star' | 'diamond';
  colour: string;
  position: { x: number; y: number };
}

export interface MastermindStage {
  shapes: MastermindShape[];
}

export interface MastermindQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  targetStage?: number;
}

export interface MastermindLevel {
  level: number;
  stageCount: 2 | 3;
  secondsPerStage: 2 | 3;
  stages: MastermindStage[];
  questions: MastermindQuestion[];
}

// ─── Dummy levels for testing the stage rendering system ────────

const DUMMY_2_STAGE: MastermindLevel = {
  level: 0,
  stageCount: 2,
  secondsPerStage: 3,
  stages: [
    {
      shapes: [
        { id: 's1', type: 'circle', colour: '#FF6B6B', position: { x: 25, y: 30 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 70, y: 30 } },
        { id: 's3', type: 'star', colour: '#6C5CE7', position: { x: 45, y: 70 } },
      ],
    },
    {
      shapes: [
        { id: 's1', type: 'circle', colour: '#00B894', position: { x: 25, y: 30 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 70, y: 30 } },
        { id: 's3', type: 'star', colour: '#6C5CE7', position: { x: 45, y: 70 } },
      ],
    },
  ],
  questions: [
    { text: 'What colour was the circle in Stage 1?', options: ['Red', 'Green', 'Blue', 'Purple'], correctIndex: 0, targetStage: 1 },
    { text: 'What colour is the circle NOW (Stage 2)?', options: ['Red', 'Green', 'Blue', 'Purple'], correctIndex: 1, targetStage: 2 },
    { text: 'Which shape changed colour?', options: ['Circle', 'Square', 'Star', 'None'], correctIndex: 0 },
    { text: 'How many shapes are in Stage 2?', options: ['2', '3', '4', '5'], correctIndex: 1, targetStage: 2 },
    { text: 'What type of shape is in the bottom-centre?', options: ['Circle', 'Square', 'Star', 'Triangle'], correctIndex: 2 },
  ],
};

const DUMMY_3_STAGE: MastermindLevel = {
  level: 0,
  stageCount: 3,
  secondsPerStage: 3,
  stages: [
    {
      shapes: [
        { id: 's1', type: 'circle', colour: '#FF6B6B', position: { x: 20, y: 25 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 75, y: 25 } },
        { id: 's3', type: 'triangle', colour: '#D4A012', position: { x: 50, y: 65 } },
        { id: 's4', type: 'diamond', colour: '#6C5CE7', position: { x: 20, y: 65 } },
      ],
    },
    {
      shapes: [
        { id: 's1', type: 'circle', colour: '#FF6B6B', position: { x: 75, y: 25 } },
        { id: 's2', type: 'square', colour: '#00B894', position: { x: 20, y: 25 } },
        { id: 's3', type: 'triangle', colour: '#D4A012', position: { x: 50, y: 65 } },
        { id: 's4', type: 'diamond', colour: '#6C5CE7', position: { x: 20, y: 65 } },
      ],
    },
    {
      shapes: [
        { id: 's1', type: 'circle', colour: '#FF6B6B', position: { x: 75, y: 25 } },
        { id: 's2', type: 'square', colour: '#00B894', position: { x: 20, y: 25 } },
        { id: 's3', type: 'star', colour: '#FD79A8', position: { x: 50, y: 65 } },
        { id: 's4', type: 'diamond', colour: '#6C5CE7', position: { x: 20, y: 65 } },
      ],
    },
  ],
  questions: [
    { text: 'Where was the circle in Stage 1?', options: ['Top-left', 'Top-right', 'Bottom-left', 'Centre'], correctIndex: 0, targetStage: 1 },
    { text: 'What colour did the square change to in Stage 2?', options: ['Blue', 'Green', 'Red', 'Purple'], correctIndex: 1, targetStage: 2 },
    { text: 'What shape replaced the triangle in Stage 3?', options: ['Diamond', 'Star', 'Circle', 'Square'], correctIndex: 1, targetStage: 3 },
    { text: 'Was the diamond present in all 3 stages?', options: ['Yes', 'No', 'Only Stage 1-2', 'Only Stage 2-3'], correctIndex: 0 },
    { text: 'How many shapes moved between Stage 1 and 2?', options: ['0', '1', '2', '3'], correctIndex: 2 },
  ],
};

/** All Mastermind levels indexed by level number (1-40). */
const LEVELS: Record<number, MastermindLevel> = {

  // ═══════════════════════════════════════════════════════════════
  // LEVELS 1-8: LEARNING PHASE
  // 3 shapes, 2 stages, 1 change, 3 seconds per stage
  // L1-2: colour swap, L3-4: position move, L5-6: shape added, L7-8: shape removed
  // ═══════════════════════════════════════════════════════════════

  1: {
    level: 1, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FF6B6B', position: { x: 25, y: 30 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 70, y: 30 } },
        { id: 's3', type: 'star', colour: '#6C5CE7', position: { x: 48, y: 72 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#00B894', position: { x: 25, y: 30 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 70, y: 30 } },
        { id: 's3', type: 'star', colour: '#6C5CE7', position: { x: 48, y: 72 } },
      ] },
    ],
    questions: [
      { text: 'What colour was the circle in Stage 1?', options: ['Red', 'Green', 'Blue', 'Purple'], correctIndex: 0, targetStage: 1 },
      { text: 'What colour is the circle in Stage 2?', options: ['Red', 'Green', 'Blue', 'Purple'], correctIndex: 1, targetStage: 2 },
      { text: 'Which shape changed colour?', options: ['Circle', 'Square', 'Star', 'None'], correctIndex: 0 },
      { text: 'How many shapes are on screen?', options: ['2', '3', '4', '5'], correctIndex: 1 },
      { text: 'What shape is at the bottom?', options: ['Circle', 'Square', 'Star', 'Triangle'], correctIndex: 2 },
    ],
  },

  2: {
    level: 2, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'triangle', colour: '#D4A012', position: { x: 22, y: 28 } },
        { id: 's2', type: 'diamond', colour: '#0984E3', position: { x: 75, y: 35 } },
        { id: 's3', type: 'circle', colour: '#FD79A8', position: { x: 50, y: 75 } },
      ] },
      { shapes: [
        { id: 's1', type: 'triangle', colour: '#D4A012', position: { x: 22, y: 28 } },
        { id: 's2', type: 'diamond', colour: '#00CEC9', position: { x: 75, y: 35 } },
        { id: 's3', type: 'circle', colour: '#FD79A8', position: { x: 50, y: 75 } },
      ] },
    ],
    questions: [
      { text: 'What colour was the diamond in Stage 1?', options: ['Blue', 'Teal', 'Gold', 'Pink'], correctIndex: 0, targetStage: 1 },
      { text: 'What colour is the diamond in Stage 2?', options: ['Blue', 'Teal', 'Gold', 'Pink'], correctIndex: 1, targetStage: 2 },
      { text: 'Which shape changed colour?', options: ['Triangle', 'Diamond', 'Circle', 'None'], correctIndex: 1 },
      { text: 'What colour is the triangle?', options: ['Blue', 'Pink', 'Gold', 'Teal'], correctIndex: 2 },
      { text: 'What shape is at the bottom?', options: ['Triangle', 'Diamond', 'Circle', 'Star'], correctIndex: 2 },
    ],
  },

  3: {
    level: 3, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'square', colour: '#FF6B6B', position: { x: 20, y: 30 } },
        { id: 's2', type: 'circle', colour: '#6C5CE7', position: { x: 78, y: 32 } },
        { id: 's3', type: 'triangle', colour: '#00B894', position: { x: 45, y: 70 } },
      ] },
      { shapes: [
        { id: 's1', type: 'square', colour: '#FF6B6B', position: { x: 78, y: 30 } },
        { id: 's2', type: 'circle', colour: '#6C5CE7', position: { x: 78, y: 32 } },
        { id: 's3', type: 'triangle', colour: '#00B894', position: { x: 45, y: 70 } },
      ] },
    ],
    questions: [
      { text: 'Where was the red square in Stage 1?', options: ['Left', 'Right', 'Centre', 'Bottom'], correctIndex: 0, targetStage: 1 },
      { text: 'Where is the red square in Stage 2?', options: ['Left', 'Right', 'Centre', 'Bottom'], correctIndex: 1, targetStage: 2 },
      { text: 'Which shape moved?', options: ['Circle', 'Triangle', 'Square', 'None'], correctIndex: 2 },
      { text: 'What colour is the triangle?', options: ['Red', 'Purple', 'Green', 'Blue'], correctIndex: 2 },
      { text: 'Did the circle move between stages?', options: ['Yes', 'No'], correctIndex: 1 },
    ],
  },

  4: {
    level: 4, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'star', colour: '#D4A012', position: { x: 50, y: 22 } },
        { id: 's2', type: 'diamond', colour: '#FF6B6B', position: { x: 22, y: 68 } },
        { id: 's3', type: 'square', colour: '#0984E3', position: { x: 78, y: 68 } },
      ] },
      { shapes: [
        { id: 's1', type: 'star', colour: '#D4A012', position: { x: 50, y: 72 } },
        { id: 's2', type: 'diamond', colour: '#FF6B6B', position: { x: 22, y: 68 } },
        { id: 's3', type: 'square', colour: '#0984E3', position: { x: 78, y: 68 } },
      ] },
    ],
    questions: [
      { text: 'Where was the star in Stage 1?', options: ['Top', 'Bottom', 'Left', 'Right'], correctIndex: 0, targetStage: 1 },
      { text: 'Where did the star move to in Stage 2?', options: ['Top', 'Bottom', 'Left', 'Right'], correctIndex: 1, targetStage: 2 },
      { text: 'Which shape moved?', options: ['Diamond', 'Square', 'Star', 'None'], correctIndex: 2 },
      { text: 'What colour is the diamond?', options: ['Gold', 'Red', 'Blue', 'Green'], correctIndex: 1 },
      { text: 'How many shapes are at the bottom in Stage 2?', options: ['1', '2', '3', '0'], correctIndex: 2, targetStage: 2 },
    ],
  },

  5: {
    level: 5, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'circle', colour: '#0984E3', position: { x: 30, y: 35 } },
        { id: 's2', type: 'square', colour: '#FF9F43', position: { x: 72, y: 35 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#0984E3', position: { x: 30, y: 35 } },
        { id: 's2', type: 'square', colour: '#FF9F43', position: { x: 72, y: 35 } },
        { id: 's3', type: 'triangle', colour: '#00B894', position: { x: 50, y: 72 } },
      ] },
    ],
    questions: [
      { text: 'How many shapes in Stage 1?', options: ['1', '2', '3', '4'], correctIndex: 1, targetStage: 1 },
      { text: 'How many shapes in Stage 2?', options: ['1', '2', '3', '4'], correctIndex: 2, targetStage: 2 },
      { text: 'What shape was added in Stage 2?', options: ['Circle', 'Square', 'Triangle', 'Star'], correctIndex: 2 },
      { text: 'What colour is the new shape?', options: ['Blue', 'Orange', 'Green', 'Red'], correctIndex: 2 },
      { text: 'Where did the new shape appear?', options: ['Top-left', 'Top-right', 'Bottom-centre', 'Centre'], correctIndex: 2, targetStage: 2 },
    ],
  },

  6: {
    level: 6, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'star', colour: '#6C5CE7', position: { x: 25, y: 30 } },
        { id: 's2', type: 'circle', colour: '#D4A012', position: { x: 70, y: 65 } },
      ] },
      { shapes: [
        { id: 's1', type: 'star', colour: '#6C5CE7', position: { x: 25, y: 30 } },
        { id: 's2', type: 'circle', colour: '#D4A012', position: { x: 70, y: 65 } },
        { id: 's3', type: 'diamond', colour: '#FF6B6B', position: { x: 50, y: 30 } },
      ] },
    ],
    questions: [
      { text: 'Was the diamond present in Stage 1?', options: ['Yes', 'No'], correctIndex: 1, targetStage: 1 },
      { text: 'What shape appeared in Stage 2?', options: ['Star', 'Circle', 'Diamond', 'Square'], correctIndex: 2 },
      { text: 'What colour is the diamond?', options: ['Purple', 'Gold', 'Red', 'Blue'], correctIndex: 2, targetStage: 2 },
      { text: 'How many shapes in Stage 2?', options: ['1', '2', '3', '4'], correctIndex: 2, targetStage: 2 },
      { text: 'What colour is the star?', options: ['Red', 'Gold', 'Purple', 'Green'], correctIndex: 2 },
    ],
  },

  7: {
    level: 7, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'circle', colour: '#00CEC9', position: { x: 25, y: 30 } },
        { id: 's2', type: 'square', colour: '#FF6B6B', position: { x: 75, y: 30 } },
        { id: 's3', type: 'triangle', colour: '#D4A012', position: { x: 50, y: 72 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#00CEC9', position: { x: 25, y: 30 } },
        { id: 's3', type: 'triangle', colour: '#D4A012', position: { x: 50, y: 72 } },
      ] },
    ],
    questions: [
      { text: 'Which shape disappeared in Stage 2?', options: ['Circle', 'Square', 'Triangle', 'None'], correctIndex: 1 },
      { text: 'How many shapes in Stage 1?', options: ['1', '2', '3', '4'], correctIndex: 2, targetStage: 1 },
      { text: 'How many shapes in Stage 2?', options: ['1', '2', '3', '4'], correctIndex: 1, targetStage: 2 },
      { text: 'What colour was the removed shape?', options: ['Teal', 'Red', 'Gold', 'Blue'], correctIndex: 1 },
      { text: 'Is the triangle still present in Stage 2?', options: ['Yes', 'No'], correctIndex: 0, targetStage: 2 },
    ],
  },

  8: {
    level: 8, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#6C5CE7', position: { x: 20, y: 28 } },
        { id: 's2', type: 'star', colour: '#FD79A8', position: { x: 50, y: 50 } },
        { id: 's3', type: 'circle', colour: '#0984E3', position: { x: 80, y: 72 } },
      ] },
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#6C5CE7', position: { x: 20, y: 28 } },
        { id: 's3', type: 'circle', colour: '#0984E3', position: { x: 80, y: 72 } },
      ] },
    ],
    questions: [
      { text: 'Which shape disappeared?', options: ['Diamond', 'Star', 'Circle', 'None'], correctIndex: 1 },
      { text: 'What colour was the missing shape?', options: ['Purple', 'Pink', 'Blue', 'Red'], correctIndex: 1 },
      { text: 'Where was the missing shape?', options: ['Top-left', 'Centre', 'Bottom-right', 'Top-right'], correctIndex: 1, targetStage: 1 },
      { text: 'How many shapes remain in Stage 2?', options: ['1', '2', '3', '0'], correctIndex: 1, targetStage: 2 },
      { text: 'What shape is at the top-left?', options: ['Star', 'Circle', 'Diamond', 'Square'], correctIndex: 2 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // LEVELS 9-16: BUILDING COMPLEXITY
  // 4 shapes, 2 stages, 1-2 changes, 3 seconds
  // ═══════════════════════════════════════════════════════════════

  9: {
    level: 9, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FF6B6B', position: { x: 20, y: 25 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 75, y: 25 } },
        { id: 's3', type: 'triangle', colour: '#00B894', position: { x: 20, y: 70 } },
        { id: 's4', type: 'star', colour: '#D4A012', position: { x: 75, y: 70 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FF6B6B', position: { x: 20, y: 25 } },
        { id: 's2', type: 'square', colour: '#00CEC9', position: { x: 75, y: 25 } },
        { id: 's3', type: 'triangle', colour: '#00B894', position: { x: 20, y: 70 } },
        { id: 's4', type: 'star', colour: '#D4A012', position: { x: 75, y: 70 } },
      ] },
    ],
    questions: [
      { text: 'What colour was the square in Stage 1?', options: ['Blue', 'Teal', 'Green', 'Red'], correctIndex: 0, targetStage: 1 },
      { text: 'What colour is the square in Stage 2?', options: ['Blue', 'Teal', 'Green', 'Red'], correctIndex: 1, targetStage: 2 },
      { text: 'Which shape changed colour?', options: ['Circle', 'Square', 'Triangle', 'Star'], correctIndex: 1 },
      { text: 'What colour is the star?', options: ['Red', 'Blue', 'Green', 'Gold'], correctIndex: 3 },
      { text: 'How many shapes are there?', options: ['2', '3', '4', '5'], correctIndex: 2 },
    ],
  },

  10: {
    level: 10, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#FD79A8', position: { x: 25, y: 25 } },
        { id: 's2', type: 'circle', colour: '#6C5CE7', position: { x: 72, y: 28 } },
        { id: 's3', type: 'square', colour: '#FF9F43', position: { x: 25, y: 72 } },
        { id: 's4', type: 'triangle', colour: '#00B894', position: { x: 72, y: 72 } },
      ] },
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#FD79A8', position: { x: 25, y: 25 } },
        { id: 's2', type: 'circle', colour: '#6C5CE7', position: { x: 25, y: 72 } },
        { id: 's3', type: 'square', colour: '#FF9F43', position: { x: 72, y: 28 } },
        { id: 's4', type: 'triangle', colour: '#00B894', position: { x: 72, y: 72 } },
      ] },
    ],
    questions: [
      { text: 'Where was the circle in Stage 1?', options: ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'], correctIndex: 1, targetStage: 1 },
      { text: 'Where is the circle in Stage 2?', options: ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'], correctIndex: 2, targetStage: 2 },
      { text: 'Which shapes swapped positions?', options: ['Circle & Square', 'Diamond & Triangle', 'Circle & Triangle', 'None'], correctIndex: 0 },
      { text: 'Did the diamond move?', options: ['Yes', 'No'], correctIndex: 1 },
      { text: 'What colour is the square?', options: ['Pink', 'Purple', 'Orange', 'Green'], correctIndex: 2 },
    ],
  },
};

/** Get a Mastermind level by number. Returns null if not found.
 *  For testing the stage system, level 998 = 2-stage dummy,
 *  level 999 = 3-stage dummy. */
export function getMastermindLevel(levelNum: number): MastermindLevel | null {
  if (levelNum === 998) return DUMMY_2_STAGE;
  if (levelNum === 999) return DUMMY_3_STAGE;
  return LEVELS[levelNum] ?? null;
}
