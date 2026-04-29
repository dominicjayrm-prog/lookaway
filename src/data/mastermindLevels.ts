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
  // Widened to 2-5 to support the Endgame 20 levels (L41-55) which
  // push beyond W6's original 2-3 stage ceiling. Levels 49+ use 4-5
  // stages, levels 45-55 use 1.5s per stage. Runtime in
  // app/game/mastermind.tsx already iterates `stages.length` and
  // reads `secondsPerStage` as a number, so this widen is purely a
  // type concession — no behaviour change for L1-40.
  stageCount: 2 | 3 | 4 | 5;
  secondsPerStage: number;
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

  11: {
    level: 11, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FF6B6B', position: { x: 22, y: 25 } },
        { id: 's2', type: 'triangle', colour: '#0984E3', position: { x: 78, y: 25 } },
        { id: 's3', type: 'star', colour: '#D4A012', position: { x: 22, y: 72 } },
        { id: 's4', type: 'square', colour: '#6C5CE7', position: { x: 78, y: 72 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FD79A8', position: { x: 22, y: 25 } },
        { id: 's2', type: 'triangle', colour: '#0984E3', position: { x: 78, y: 25 } },
        { id: 's3', type: 'star', colour: '#D4A012', position: { x: 22, y: 72 } },
        { id: 's4', type: 'square', colour: '#6C5CE7', position: { x: 78, y: 72 } },
      ] },
    ],
    questions: [
      { text: 'What colour was the circle in Stage 1?', options: ['Red', 'Pink', 'Blue', 'Gold'], correctIndex: 0, targetStage: 1 },
      { text: 'What colour is the circle in Stage 2?', options: ['Red', 'Pink', 'Blue', 'Gold'], correctIndex: 1, targetStage: 2 },
      { text: 'Which shape changed?', options: ['Triangle', 'Star', 'Circle', 'Square'], correctIndex: 2 },
      { text: 'What colour is the star?', options: ['Purple', 'Blue', 'Red', 'Gold'], correctIndex: 3 },
      { text: 'Where is the triangle?', options: ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'], correctIndex: 1 },
    ],
  },

  12: {
    level: 12, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#00B894', position: { x: 50, y: 22 } },
        { id: 's2', type: 'circle', colour: '#FF9F43', position: { x: 20, y: 50 } },
        { id: 's3', type: 'square', colour: '#0984E3', position: { x: 80, y: 50 } },
        { id: 's4', type: 'triangle', colour: '#FF6B6B', position: { x: 50, y: 78 } },
      ] },
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#00CEC9', position: { x: 50, y: 22 } },
        { id: 's2', type: 'circle', colour: '#FF9F43', position: { x: 20, y: 50 } },
        { id: 's3', type: 'square', colour: '#0984E3', position: { x: 80, y: 50 } },
        { id: 's4', type: 'triangle', colour: '#FF6B6B', position: { x: 50, y: 78 } },
      ] },
    ],
    questions: [
      { text: 'What colour was the diamond in Stage 1?', options: ['Green', 'Teal', 'Blue', 'Orange'], correctIndex: 0, targetStage: 1 },
      { text: 'The diamond changed to what colour?', options: ['Green', 'Teal', 'Blue', 'Orange'], correctIndex: 1, targetStage: 2 },
      { text: 'Where is the diamond?', options: ['Top', 'Left', 'Right', 'Bottom'], correctIndex: 0 },
      { text: 'What colour is the triangle?', options: ['Orange', 'Blue', 'Red', 'Green'], correctIndex: 2 },
      { text: 'Did any shape move position?', options: ['Yes', 'No'], correctIndex: 1 },
    ],
  },

  13: {
    level: 13, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'star', colour: '#6C5CE7', position: { x: 25, y: 28 } },
        { id: 's2', type: 'circle', colour: '#FF6B6B', position: { x: 75, y: 28 } },
        { id: 's3', type: 'diamond', colour: '#00B894', position: { x: 25, y: 72 } },
        { id: 's4', type: 'square', colour: '#D4A012', position: { x: 75, y: 72 } },
      ] },
      { shapes: [
        { id: 's1', type: 'star', colour: '#0984E3', position: { x: 25, y: 28 } },
        { id: 's2', type: 'circle', colour: '#FF6B6B', position: { x: 25, y: 72 } },
        { id: 's3', type: 'diamond', colour: '#00B894', position: { x: 75, y: 28 } },
        { id: 's4', type: 'square', colour: '#D4A012', position: { x: 75, y: 72 } },
      ] },
    ],
    questions: [
      { text: 'The star changed from what colour?', options: ['Purple', 'Blue', 'Red', 'Green'], correctIndex: 0, targetStage: 1 },
      { text: 'Which two shapes swapped positions?', options: ['Star & Square', 'Circle & Diamond', 'Star & Diamond', 'Circle & Square'], correctIndex: 1 },
      { text: 'Where is the circle in Stage 2?', options: ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'], correctIndex: 2, targetStage: 2 },
      { text: 'How many changes happened?', options: ['1', '2', '3', '0'], correctIndex: 1 },
      { text: 'What colour is the square?', options: ['Purple', 'Red', 'Green', 'Gold'], correctIndex: 3 },
    ],
  },

  14: {
    level: 14, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'triangle', colour: '#FD79A8', position: { x: 20, y: 30 } },
        { id: 's2', type: 'star', colour: '#00CEC9', position: { x: 50, y: 30 } },
        { id: 's3', type: 'circle', colour: '#FF9F43', position: { x: 80, y: 30 } },
        { id: 's4', type: 'diamond', colour: '#6C5CE7', position: { x: 50, y: 72 } },
      ] },
      { shapes: [
        { id: 's1', type: 'triangle', colour: '#FD79A8', position: { x: 20, y: 30 } },
        { id: 's2', type: 'star', colour: '#00CEC9', position: { x: 50, y: 72 } },
        { id: 's3', type: 'circle', colour: '#D4A012', position: { x: 80, y: 30 } },
        { id: 's4', type: 'diamond', colour: '#6C5CE7', position: { x: 50, y: 30 } },
      ] },
    ],
    questions: [
      { text: 'The circle changed from what colour?', options: ['Orange', 'Gold', 'Teal', 'Pink'], correctIndex: 0, targetStage: 1 },
      { text: 'What colour is the circle in Stage 2?', options: ['Orange', 'Gold', 'Teal', 'Pink'], correctIndex: 1, targetStage: 2 },
      { text: 'Which shapes swapped?', options: ['Star & Diamond', 'Triangle & Circle', 'Star & Triangle', 'None'], correctIndex: 0 },
      { text: 'Where is the star in Stage 2?', options: ['Top', 'Bottom', 'Left', 'Right'], correctIndex: 1, targetStage: 2 },
      { text: 'What shape is pink?', options: ['Star', 'Circle', 'Triangle', 'Diamond'], correctIndex: 2 },
    ],
  },

  15: {
    level: 15, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'square', colour: '#0984E3', position: { x: 22, y: 25 } },
        { id: 's2', type: 'circle', colour: '#00B894', position: { x: 78, y: 25 } },
        { id: 's3', type: 'star', colour: '#FF6B6B', position: { x: 22, y: 75 } },
        { id: 's4', type: 'triangle', colour: '#D4A012', position: { x: 78, y: 75 } },
      ] },
      { shapes: [
        { id: 's1', type: 'square', colour: '#0984E3', position: { x: 22, y: 25 } },
        { id: 's2', type: 'circle', colour: '#00B894', position: { x: 78, y: 25 } },
        { id: 's3', type: 'star', colour: '#FF6B6B', position: { x: 22, y: 75 } },
        { id: 's4', type: 'triangle', colour: '#D4A012', position: { x: 78, y: 75 } },
        { id: 's5', type: 'diamond', colour: '#6C5CE7', position: { x: 50, y: 50 } },
      ] },
    ],
    questions: [
      { text: 'Which shape was NOT in Stage 1?', options: ['Square', 'Diamond', 'Star', 'Circle'], correctIndex: 1 },
      { text: 'What colour is the new shape?', options: ['Blue', 'Green', 'Red', 'Purple'], correctIndex: 3, targetStage: 2 },
      { text: 'Where did the new shape appear?', options: ['Top-left', 'Centre', 'Bottom-right', 'Top-right'], correctIndex: 1, targetStage: 2 },
      { text: 'How many shapes in Stage 1?', options: ['3', '4', '5', '6'], correctIndex: 1, targetStage: 1 },
      { text: 'What shape is gold?', options: ['Star', 'Triangle', 'Diamond', 'Circle'], correctIndex: 1 },
    ],
  },

  16: {
    level: 16, stageCount: 2, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FF9F43', position: { x: 20, y: 28 } },
        { id: 's2', type: 'diamond', colour: '#FD79A8', position: { x: 50, y: 28 } },
        { id: 's3', type: 'triangle', colour: '#00CEC9', position: { x: 80, y: 28 } },
        { id: 's4', type: 'star', colour: '#6C5CE7', position: { x: 35, y: 72 } },
        { id: 's5', type: 'square', colour: '#0984E3', position: { x: 65, y: 72 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FF9F43', position: { x: 20, y: 28 } },
        { id: 's2', type: 'diamond', colour: '#FD79A8', position: { x: 50, y: 28 } },
        { id: 's3', type: 'triangle', colour: '#00CEC9', position: { x: 80, y: 28 } },
        { id: 's4', type: 'star', colour: '#6C5CE7', position: { x: 35, y: 72 } },
      ] },
    ],
    questions: [
      { text: 'Which shape disappeared in Stage 2?', options: ['Circle', 'Star', 'Square', 'Triangle'], correctIndex: 2 },
      { text: 'What colour was the removed shape?', options: ['Orange', 'Pink', 'Blue', 'Purple'], correctIndex: 2 },
      { text: 'How many shapes in Stage 2?', options: ['3', '4', '5', '6'], correctIndex: 1, targetStage: 2 },
      { text: 'What shape is teal?', options: ['Circle', 'Diamond', 'Triangle', 'Star'], correctIndex: 2 },
      { text: 'Are all Stage 1 shapes still in Stage 2?', options: ['Yes', 'No'], correctIndex: 1 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // LEVELS 17-28: THREE STAGES INTRODUCED
  // 5 shapes, 3 stages, 2 changes per transition, 3 seconds
  // ═══════════════════════════════════════════════════════════════

  17: {
    level: 17, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FF6B6B', position: { x: 20, y: 22 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 80, y: 22 } },
        { id: 's3', type: 'triangle', colour: '#00B894', position: { x: 50, y: 50 } },
        { id: 's4', type: 'star', colour: '#D4A012', position: { x: 20, y: 78 } },
        { id: 's5', type: 'diamond', colour: '#6C5CE7', position: { x: 80, y: 78 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#00CEC9', position: { x: 20, y: 22 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 80, y: 22 } },
        { id: 's3', type: 'triangle', colour: '#00B894', position: { x: 50, y: 50 } },
        { id: 's4', type: 'star', colour: '#D4A012', position: { x: 20, y: 78 } },
        { id: 's5', type: 'diamond', colour: '#6C5CE7', position: { x: 80, y: 78 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#00CEC9', position: { x: 20, y: 22 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 80, y: 22 } },
        { id: 's3', type: 'triangle', colour: '#FF6B6B', position: { x: 50, y: 50 } },
        { id: 's4', type: 'star', colour: '#D4A012', position: { x: 20, y: 78 } },
        { id: 's5', type: 'diamond', colour: '#6C5CE7', position: { x: 80, y: 78 } },
      ] },
    ],
    questions: [
      { text: 'What colour was the circle in Stage 1?', options: ['Red', 'Teal', 'Blue', 'Green'], correctIndex: 0, targetStage: 1 },
      { text: 'What colour is the triangle in Stage 3?', options: ['Green', 'Red', 'Blue', 'Gold'], correctIndex: 1, targetStage: 3 },
      { text: 'The circle changed colour in which transition?', options: ['Stage 1→2', 'Stage 2→3', 'Both', 'Neither'], correctIndex: 0 },
      { text: 'Was the star the same colour in all stages?', options: ['Yes', 'No'], correctIndex: 0 },
      { text: 'How many total colour changes occurred?', options: ['1', '2', '3', '0'], correctIndex: 1 },
    ],
  },

  18: {
    level: 18, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#FD79A8', position: { x: 25, y: 25 } },
        { id: 's2', type: 'star', colour: '#FF9F43', position: { x: 75, y: 25 } },
        { id: 's3', type: 'circle', colour: '#0984E3', position: { x: 50, y: 50 } },
        { id: 's4', type: 'square', colour: '#00B894', position: { x: 25, y: 75 } },
        { id: 's5', type: 'triangle', colour: '#D4A012', position: { x: 75, y: 75 } },
      ] },
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#FD79A8', position: { x: 75, y: 25 } },
        { id: 's2', type: 'star', colour: '#FF9F43', position: { x: 25, y: 25 } },
        { id: 's3', type: 'circle', colour: '#0984E3', position: { x: 50, y: 50 } },
        { id: 's4', type: 'square', colour: '#00B894', position: { x: 25, y: 75 } },
        { id: 's5', type: 'triangle', colour: '#D4A012', position: { x: 75, y: 75 } },
      ] },
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#FD79A8', position: { x: 75, y: 25 } },
        { id: 's2', type: 'star', colour: '#FF9F43', position: { x: 25, y: 25 } },
        { id: 's3', type: 'circle', colour: '#6C5CE7', position: { x: 50, y: 50 } },
        { id: 's4', type: 'square', colour: '#00B894', position: { x: 25, y: 75 } },
        { id: 's5', type: 'triangle', colour: '#D4A012', position: { x: 75, y: 75 } },
      ] },
    ],
    questions: [
      { text: 'Where was the diamond in Stage 1?', options: ['Top-left', 'Top-right', 'Bottom-left', 'Centre'], correctIndex: 0, targetStage: 1 },
      { text: 'Which shapes swapped in Stage 1→2?', options: ['Diamond & Star', 'Circle & Triangle', 'Square & Star', 'None'], correctIndex: 0 },
      { text: 'What colour is the circle in Stage 3?', options: ['Blue', 'Purple', 'Pink', 'Green'], correctIndex: 1, targetStage: 3 },
      { text: 'Did the triangle change in any stage?', options: ['Yes', 'No'], correctIndex: 1 },
      { text: 'The circle changed colour in which transition?', options: ['Stage 1→2', 'Stage 2→3', 'Both', 'Neither'], correctIndex: 1 },
    ],
  },

  19: {
    level: 19, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'square', colour: '#FF6B6B', position: { x: 20, y: 22 } },
        { id: 's2', type: 'circle', colour: '#6C5CE7', position: { x: 50, y: 22 } },
        { id: 's3', type: 'triangle', colour: '#00CEC9', position: { x: 80, y: 22 } },
        { id: 's4', type: 'star', colour: '#D4A012', position: { x: 35, y: 65 } },
        { id: 's5', type: 'diamond', colour: '#0984E3', position: { x: 65, y: 65 } },
      ] },
      { shapes: [
        { id: 's1', type: 'square', colour: '#FF6B6B', position: { x: 20, y: 22 } },
        { id: 's2', type: 'circle', colour: '#6C5CE7', position: { x: 50, y: 22 } },
        { id: 's3', type: 'triangle', colour: '#00CEC9', position: { x: 80, y: 22 } },
        { id: 's4', type: 'star', colour: '#D4A012', position: { x: 35, y: 65 } },
        { id: 's5', type: 'diamond', colour: '#0984E3', position: { x: 65, y: 65 } },
        { id: 's6', type: 'circle', colour: '#FD79A8', position: { x: 50, y: 85 } },
      ] },
      { shapes: [
        { id: 's1', type: 'square', colour: '#FF6B6B', position: { x: 20, y: 22 } },
        { id: 's2', type: 'circle', colour: '#6C5CE7', position: { x: 50, y: 22 } },
        { id: 's3', type: 'triangle', colour: '#00CEC9', position: { x: 80, y: 22 } },
        { id: 's4', type: 'star', colour: '#D4A012', position: { x: 35, y: 65 } },
        { id: 's6', type: 'circle', colour: '#FD79A8', position: { x: 50, y: 85 } },
      ] },
    ],
    questions: [
      { text: 'What shape was added in Stage 2?', options: ['Square', 'Circle', 'Star', 'Triangle'], correctIndex: 1, targetStage: 2 },
      { text: 'What shape was removed in Stage 3?', options: ['Star', 'Diamond', 'Circle', 'Square'], correctIndex: 1, targetStage: 3 },
      { text: 'Was the pink circle in Stage 1?', options: ['Yes', 'No'], correctIndex: 1, targetStage: 1 },
      { text: 'How many shapes in Stage 3?', options: ['4', '5', '6', '3'], correctIndex: 1, targetStage: 3 },
      { text: 'What colour is the star?', options: ['Red', 'Teal', 'Gold', 'Blue'], correctIndex: 2 },
    ],
  },

  20: {
    level: 20, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'circle', colour: '#0984E3', position: { x: 22, y: 25 } },
        { id: 's2', type: 'triangle', colour: '#FF6B6B', position: { x: 78, y: 25 } },
        { id: 's3', type: 'diamond', colour: '#D4A012', position: { x: 22, y: 55 } },
        { id: 's4', type: 'star', colour: '#00B894', position: { x: 78, y: 55 } },
        { id: 's5', type: 'square', colour: '#6C5CE7', position: { x: 50, y: 80 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#0984E3', position: { x: 78, y: 55 } },
        { id: 's2', type: 'triangle', colour: '#FF6B6B', position: { x: 78, y: 25 } },
        { id: 's3', type: 'diamond', colour: '#D4A012', position: { x: 22, y: 55 } },
        { id: 's4', type: 'star', colour: '#00B894', position: { x: 22, y: 25 } },
        { id: 's5', type: 'square', colour: '#6C5CE7', position: { x: 50, y: 80 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FF9F43', position: { x: 78, y: 55 } },
        { id: 's2', type: 'triangle', colour: '#FF6B6B', position: { x: 78, y: 25 } },
        { id: 's3', type: 'diamond', colour: '#D4A012', position: { x: 22, y: 55 } },
        { id: 's4', type: 'star', colour: '#00B894', position: { x: 22, y: 25 } },
        { id: 's5', type: 'square', colour: '#00CEC9', position: { x: 50, y: 80 } },
      ] },
    ],
    questions: [
      { text: 'Where was the circle in Stage 1?', options: ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'], correctIndex: 0, targetStage: 1 },
      { text: 'Which shapes swapped in Stage 1→2?', options: ['Circle & Star', 'Triangle & Diamond', 'Circle & Square', 'None'], correctIndex: 0 },
      { text: 'What colour is the circle in Stage 3?', options: ['Blue', 'Orange', 'Green', 'Purple'], correctIndex: 1, targetStage: 3 },
      { text: 'What colour is the square in Stage 3?', options: ['Purple', 'Teal', 'Gold', 'Red'], correctIndex: 1, targetStage: 3 },
      { text: 'Did the triangle change at all?', options: ['Yes', 'No'], correctIndex: 1 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // LEVELS 21-28: FULL 3-STAGE DIFFICULTY
  // 5 shapes, 3 stages, 2 changes per transition
  // ═══════════════════════════════════════════════════════════════

  21: {
    level: 21, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FF6B6B', position: { x: 20, y: 20 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 50, y: 20 } },
        { id: 's3', type: 'star', colour: '#D4A012', position: { x: 80, y: 20 } },
        { id: 's4', type: 'triangle', colour: '#6C5CE7', position: { x: 35, y: 60 } },
        { id: 's5', type: 'diamond', colour: '#00B894', position: { x: 65, y: 60 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#00CEC9', position: { x: 20, y: 20 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 80, y: 20 } },
        { id: 's3', type: 'star', colour: '#D4A012', position: { x: 50, y: 20 } },
        { id: 's4', type: 'triangle', colour: '#6C5CE7', position: { x: 35, y: 60 } },
        { id: 's5', type: 'diamond', colour: '#00B894', position: { x: 65, y: 60 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#00CEC9', position: { x: 20, y: 20 } },
        { id: 's2', type: 'square', colour: '#FD79A8', position: { x: 80, y: 20 } },
        { id: 's3', type: 'star', colour: '#D4A012', position: { x: 50, y: 20 } },
        { id: 's4', type: 'triangle', colour: '#6C5CE7', position: { x: 65, y: 60 } },
        { id: 's5', type: 'diamond', colour: '#00B894', position: { x: 35, y: 60 } },
      ] },
    ],
    questions: [
      { text: 'What colour was the circle in Stage 1?', options: ['Red', 'Teal', 'Blue', 'Green'], correctIndex: 0, targetStage: 1 },
      { text: 'Which shapes swapped in Stage 1→2?', options: ['Square & Star', 'Circle & Diamond', 'Triangle & Diamond', 'None'], correctIndex: 0 },
      { text: 'What colour is the square in Stage 3?', options: ['Blue', 'Pink', 'Red', 'Teal'], correctIndex: 1, targetStage: 3 },
      { text: 'Did the triangle and diamond swap in Stage 2→3?', options: ['Yes', 'No'], correctIndex: 0 },
      { text: 'Was the star gold in all 3 stages?', options: ['Yes', 'No'], correctIndex: 0 },
    ],
  },

  22: {
    level: 22, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#FF9F43', position: { x: 25, y: 25 } },
        { id: 's2', type: 'circle', colour: '#6C5CE7', position: { x: 75, y: 25 } },
        { id: 's3', type: 'star', colour: '#FF6B6B', position: { x: 25, y: 55 } },
        { id: 's4', type: 'triangle', colour: '#0984E3', position: { x: 75, y: 55 } },
        { id: 's5', type: 'square', colour: '#00B894', position: { x: 50, y: 80 } },
      ] },
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#FF9F43', position: { x: 25, y: 25 } },
        { id: 's2', type: 'circle', colour: '#6C5CE7', position: { x: 75, y: 25 } },
        { id: 's3', type: 'star', colour: '#FF6B6B', position: { x: 25, y: 55 } },
        { id: 's4', type: 'triangle', colour: '#0984E3', position: { x: 75, y: 55 } },
      ] },
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#FF9F43', position: { x: 25, y: 25 } },
        { id: 's2', type: 'circle', colour: '#D4A012', position: { x: 75, y: 25 } },
        { id: 's3', type: 'star', colour: '#FF6B6B', position: { x: 25, y: 55 } },
        { id: 's4', type: 'triangle', colour: '#0984E3', position: { x: 75, y: 55 } },
      ] },
    ],
    questions: [
      { text: 'Which shape disappeared in Stage 2?', options: ['Diamond', 'Circle', 'Square', 'Star'], correctIndex: 2 },
      { text: 'What colour was the circle in Stage 1?', options: ['Purple', 'Gold', 'Orange', 'Blue'], correctIndex: 0, targetStage: 1 },
      { text: 'What colour is the circle in Stage 3?', options: ['Purple', 'Gold', 'Orange', 'Blue'], correctIndex: 1, targetStage: 3 },
      { text: 'Was the square present in Stage 3?', options: ['Yes', 'No'], correctIndex: 1, targetStage: 3 },
      { text: 'How many shapes in Stage 3?', options: ['3', '4', '5', '6'], correctIndex: 1, targetStage: 3 },
    ],
  },

  23: {
    level: 23, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'square', colour: '#00CEC9', position: { x: 20, y: 22 } },
        { id: 's2', type: 'triangle', colour: '#FF6B6B', position: { x: 80, y: 22 } },
        { id: 's3', type: 'circle', colour: '#D4A012', position: { x: 50, y: 48 } },
        { id: 's4', type: 'diamond', colour: '#FD79A8', position: { x: 20, y: 78 } },
        { id: 's5', type: 'star', colour: '#0984E3', position: { x: 80, y: 78 } },
      ] },
      { shapes: [
        { id: 's1', type: 'square', colour: '#00CEC9', position: { x: 80, y: 22 } },
        { id: 's2', type: 'triangle', colour: '#FF6B6B', position: { x: 20, y: 22 } },
        { id: 's3', type: 'circle', colour: '#6C5CE7', position: { x: 50, y: 48 } },
        { id: 's4', type: 'diamond', colour: '#FD79A8', position: { x: 20, y: 78 } },
        { id: 's5', type: 'star', colour: '#0984E3', position: { x: 80, y: 78 } },
      ] },
      { shapes: [
        { id: 's1', type: 'square', colour: '#00CEC9', position: { x: 80, y: 22 } },
        { id: 's2', type: 'triangle', colour: '#FF6B6B', position: { x: 20, y: 22 } },
        { id: 's3', type: 'circle', colour: '#6C5CE7', position: { x: 50, y: 48 } },
        { id: 's4', type: 'diamond', colour: '#FD79A8', position: { x: 80, y: 78 } },
        { id: 's5', type: 'star', colour: '#00B894', position: { x: 20, y: 78 } },
      ] },
    ],
    questions: [
      { text: 'Where was the square in Stage 1?', options: ['Top-left', 'Top-right', 'Bottom-left', 'Centre'], correctIndex: 0, targetStage: 1 },
      { text: 'The circle was gold in which stage?', options: ['Stage 1', 'Stage 2', 'Stage 3', 'All'], correctIndex: 0 },
      { text: 'What colour is the star in Stage 3?', options: ['Blue', 'Green', 'Pink', 'Teal'], correctIndex: 1, targetStage: 3 },
      { text: 'Did the diamond and star swap in Stage 2→3?', options: ['Yes', 'No'], correctIndex: 0 },
      { text: 'How many position changes total across all transitions?', options: ['2', '3', '4', '1'], correctIndex: 2 },
    ],
  },

  24: {
    level: 24, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'star', colour: '#D4A012', position: { x: 50, y: 20 } },
        { id: 's2', type: 'circle', colour: '#FF6B6B', position: { x: 20, y: 50 } },
        { id: 's3', type: 'square', colour: '#0984E3', position: { x: 80, y: 50 } },
        { id: 's4', type: 'triangle', colour: '#00B894', position: { x: 35, y: 80 } },
        { id: 's5', type: 'diamond', colour: '#6C5CE7', position: { x: 65, y: 80 } },
      ] },
      { shapes: [
        { id: 's1', type: 'star', colour: '#D4A012', position: { x: 50, y: 20 } },
        { id: 's2', type: 'circle', colour: '#FF6B6B', position: { x: 80, y: 50 } },
        { id: 's3', type: 'square', colour: '#0984E3', position: { x: 20, y: 50 } },
        { id: 's4', type: 'triangle', colour: '#FD79A8', position: { x: 35, y: 80 } },
        { id: 's5', type: 'diamond', colour: '#6C5CE7', position: { x: 65, y: 80 } },
      ] },
      { shapes: [
        { id: 's1', type: 'star', colour: '#FF9F43', position: { x: 50, y: 20 } },
        { id: 's2', type: 'circle', colour: '#FF6B6B', position: { x: 80, y: 50 } },
        { id: 's3', type: 'square', colour: '#0984E3', position: { x: 20, y: 50 } },
        { id: 's4', type: 'triangle', colour: '#FD79A8', position: { x: 35, y: 80 } },
        { id: 's5', type: 'diamond', colour: '#00CEC9', position: { x: 65, y: 80 } },
      ] },
    ],
    questions: [
      { text: 'Which shapes swapped in Stage 1→2?', options: ['Circle & Square', 'Star & Triangle', 'Diamond & Circle', 'None'], correctIndex: 0 },
      { text: 'What colour was the triangle in Stage 1?', options: ['Green', 'Pink', 'Gold', 'Blue'], correctIndex: 0, targetStage: 1 },
      { text: 'What colour is the star in Stage 3?', options: ['Gold', 'Orange', 'Red', 'Teal'], correctIndex: 1, targetStage: 3 },
      { text: 'The diamond changed colour in which transition?', options: ['Stage 1→2', 'Stage 2→3', 'Both', 'Neither'], correctIndex: 1 },
      { text: 'Was the circle red in all 3 stages?', options: ['Yes', 'No'], correctIndex: 0 },
    ],
  },

  25: {
    level: 25, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'circle', colour: '#6C5CE7', position: { x: 22, y: 22 } },
        { id: 's2', type: 'diamond', colour: '#FF6B6B', position: { x: 78, y: 22 } },
        { id: 's3', type: 'star', colour: '#00B894', position: { x: 50, y: 50 } },
        { id: 's4', type: 'square', colour: '#0984E3', position: { x: 22, y: 78 } },
        { id: 's5', type: 'triangle', colour: '#D4A012', position: { x: 78, y: 78 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#6C5CE7', position: { x: 22, y: 22 } },
        { id: 's2', type: 'diamond', colour: '#FF6B6B', position: { x: 78, y: 22 } },
        { id: 's3', type: 'star', colour: '#00B894', position: { x: 50, y: 50 } },
        { id: 's4', type: 'square', colour: '#0984E3', position: { x: 78, y: 78 } },
        { id: 's5', type: 'triangle', colour: '#FF9F43', position: { x: 22, y: 78 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FD79A8', position: { x: 22, y: 22 } },
        { id: 's2', type: 'diamond', colour: '#FF6B6B', position: { x: 78, y: 22 } },
        { id: 's3', type: 'star', colour: '#00B894', position: { x: 50, y: 50 } },
        { id: 's4', type: 'square', colour: '#0984E3', position: { x: 78, y: 78 } },
        { id: 's5', type: 'triangle', colour: '#FF9F43', position: { x: 22, y: 78 } },
      ] },
    ],
    questions: [
      { text: 'Did the square and triangle swap positions?', options: ['Yes, in S1→2', 'Yes, in S2→3', 'No', 'Yes, in both'], correctIndex: 0 },
      { text: 'What colour was the triangle in Stage 1?', options: ['Orange', 'Gold', 'Pink', 'Red'], correctIndex: 1, targetStage: 1 },
      { text: 'What colour is the circle in Stage 3?', options: ['Purple', 'Pink', 'Blue', 'Green'], correctIndex: 1, targetStage: 3 },
      { text: 'Was the star green in all stages?', options: ['Yes', 'No'], correctIndex: 0 },
      { text: 'The circle changed colour in which transition?', options: ['Stage 1→2', 'Stage 2→3', 'Both', 'Neither'], correctIndex: 1 },
    ],
  },

  26: {
    level: 26, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'triangle', colour: '#00CEC9', position: { x: 20, y: 25 } },
        { id: 's2', type: 'star', colour: '#FF6B6B', position: { x: 50, y: 25 } },
        { id: 's3', type: 'circle', colour: '#D4A012', position: { x: 80, y: 25 } },
        { id: 's4', type: 'square', colour: '#6C5CE7', position: { x: 35, y: 70 } },
        { id: 's5', type: 'diamond', colour: '#FD79A8', position: { x: 65, y: 70 } },
      ] },
      { shapes: [
        { id: 's1', type: 'triangle', colour: '#00CEC9', position: { x: 20, y: 25 } },
        { id: 's2', type: 'star', colour: '#FF6B6B', position: { x: 50, y: 25 } },
        { id: 's3', type: 'circle', colour: '#D4A012', position: { x: 80, y: 25 } },
        { id: 's4', type: 'square', colour: '#6C5CE7', position: { x: 65, y: 70 } },
        { id: 's5', type: 'diamond', colour: '#0984E3', position: { x: 35, y: 70 } },
      ] },
      { shapes: [
        { id: 's1', type: 'triangle', colour: '#FF9F43', position: { x: 20, y: 25 } },
        { id: 's3', type: 'circle', colour: '#D4A012', position: { x: 80, y: 25 } },
        { id: 's4', type: 'square', colour: '#6C5CE7', position: { x: 65, y: 70 } },
        { id: 's5', type: 'diamond', colour: '#0984E3', position: { x: 35, y: 70 } },
      ] },
    ],
    questions: [
      { text: 'Did the square and diamond swap in S1→2?', options: ['Yes', 'No'], correctIndex: 0 },
      { text: 'Which shape was removed in Stage 3?', options: ['Triangle', 'Star', 'Circle', 'Square'], correctIndex: 1, targetStage: 3 },
      { text: 'What colour was the diamond in Stage 1?', options: ['Pink', 'Blue', 'Purple', 'Teal'], correctIndex: 0, targetStage: 1 },
      { text: 'What colour is the triangle in Stage 3?', options: ['Teal', 'Orange', 'Gold', 'Red'], correctIndex: 1, targetStage: 3 },
      { text: 'How many shapes in Stage 3?', options: ['3', '4', '5', '6'], correctIndex: 1, targetStage: 3 },
    ],
  },

  27: {
    level: 27, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'square', colour: '#FF6B6B', position: { x: 22, y: 20 } },
        { id: 's2', type: 'circle', colour: '#0984E3', position: { x: 50, y: 20 } },
        { id: 's3', type: 'diamond', colour: '#00B894', position: { x: 78, y: 20 } },
        { id: 's4', type: 'star', colour: '#D4A012', position: { x: 35, y: 55 } },
        { id: 's5', type: 'triangle', colour: '#6C5CE7', position: { x: 65, y: 55 } },
      ] },
      { shapes: [
        { id: 's1', type: 'square', colour: '#FF6B6B', position: { x: 22, y: 20 } },
        { id: 's2', type: 'circle', colour: '#0984E3', position: { x: 50, y: 20 } },
        { id: 's3', type: 'diamond', colour: '#00B894', position: { x: 78, y: 20 } },
        { id: 's4', type: 'star', colour: '#D4A012', position: { x: 35, y: 55 } },
        { id: 's5', type: 'triangle', colour: '#6C5CE7', position: { x: 65, y: 55 } },
        { id: 's6', type: 'circle', colour: '#FD79A8', position: { x: 50, y: 82 } },
      ] },
      { shapes: [
        { id: 's1', type: 'square', colour: '#FF9F43', position: { x: 22, y: 20 } },
        { id: 's2', type: 'circle', colour: '#0984E3', position: { x: 50, y: 20 } },
        { id: 's3', type: 'diamond', colour: '#00B894', position: { x: 78, y: 20 } },
        { id: 's4', type: 'star', colour: '#D4A012', position: { x: 65, y: 55 } },
        { id: 's5', type: 'triangle', colour: '#6C5CE7', position: { x: 35, y: 55 } },
        { id: 's6', type: 'circle', colour: '#FD79A8', position: { x: 50, y: 82 } },
      ] },
    ],
    questions: [
      { text: 'What shape was added in Stage 2?', options: ['Star', 'Circle', 'Diamond', 'Square'], correctIndex: 1, targetStage: 2 },
      { text: 'What colour is the new circle?', options: ['Blue', 'Pink', 'Red', 'Green'], correctIndex: 1 },
      { text: 'The square changed colour in which transition?', options: ['S1→2', 'S2→3', 'Both', 'Neither'], correctIndex: 1 },
      { text: 'Did the star and triangle swap in S2→3?', options: ['Yes', 'No'], correctIndex: 0 },
      { text: 'Was the blue circle present in all stages?', options: ['Yes', 'No'], correctIndex: 0 },
    ],
  },

  28: {
    level: 28, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FF6B6B', position: { x: 25, y: 22 } },
        { id: 's2', type: 'star', colour: '#00CEC9', position: { x: 75, y: 22 } },
        { id: 's3', type: 'triangle', colour: '#D4A012', position: { x: 25, y: 55 } },
        { id: 's4', type: 'square', colour: '#6C5CE7', position: { x: 75, y: 55 } },
        { id: 's5', type: 'diamond', colour: '#0984E3', position: { x: 50, y: 80 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#00B894', position: { x: 75, y: 22 } },
        { id: 's2', type: 'star', colour: '#00CEC9', position: { x: 25, y: 22 } },
        { id: 's3', type: 'triangle', colour: '#D4A012', position: { x: 25, y: 55 } },
        { id: 's4', type: 'square', colour: '#6C5CE7', position: { x: 75, y: 55 } },
        { id: 's5', type: 'diamond', colour: '#0984E3', position: { x: 50, y: 80 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#00B894', position: { x: 75, y: 22 } },
        { id: 's2', type: 'star', colour: '#FF9F43', position: { x: 25, y: 22 } },
        { id: 's3', type: 'triangle', colour: '#D4A012', position: { x: 75, y: 55 } },
        { id: 's4', type: 'square', colour: '#6C5CE7', position: { x: 25, y: 55 } },
        { id: 's5', type: 'diamond', colour: '#FD79A8', position: { x: 50, y: 80 } },
      ] },
    ],
    questions: [
      { text: 'What colour was the circle in Stage 1?', options: ['Red', 'Green', 'Teal', 'Gold'], correctIndex: 0, targetStage: 1 },
      { text: 'Circle and star swapped in which transition?', options: ['S1→2', 'S2→3', 'Both', 'Neither'], correctIndex: 0 },
      { text: 'Triangle and square swapped in which transition?', options: ['S1→2', 'S2→3', 'Both', 'Neither'], correctIndex: 1 },
      { text: 'What colour is the diamond in Stage 3?', options: ['Blue', 'Pink', 'Green', 'Teal'], correctIndex: 1, targetStage: 3 },
      { text: 'What colour is the star in Stage 3?', options: ['Teal', 'Orange', 'Gold', 'Red'], correctIndex: 1, targetStage: 3 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // LEVELS 29-35: PEAK DIFFICULTY
  // 6 shapes, 3 stages, 2-3 changes per transition, 3 seconds
  // ═══════════════════════════════════════════════════════════════

  29: {
    level: 29, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'circle', colour: '#FF6B6B', position: { x: 18, y: 20 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 50, y: 20 } },
        { id: 's3', type: 'star', colour: '#D4A012', position: { x: 82, y: 20 } },
        { id: 's4', type: 'triangle', colour: '#6C5CE7', position: { x: 18, y: 55 } },
        { id: 's5', type: 'diamond', colour: '#00B894', position: { x: 50, y: 55 } },
        { id: 's6', type: 'circle', colour: '#FD79A8', position: { x: 82, y: 55 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#00CEC9', position: { x: 18, y: 20 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 82, y: 20 } },
        { id: 's3', type: 'star', colour: '#D4A012', position: { x: 50, y: 20 } },
        { id: 's4', type: 'triangle', colour: '#FF9F43', position: { x: 18, y: 55 } },
        { id: 's5', type: 'diamond', colour: '#00B894', position: { x: 50, y: 55 } },
        { id: 's6', type: 'circle', colour: '#FD79A8', position: { x: 82, y: 55 } },
      ] },
      { shapes: [
        { id: 's1', type: 'circle', colour: '#00CEC9', position: { x: 18, y: 20 } },
        { id: 's2', type: 'square', colour: '#0984E3', position: { x: 82, y: 20 } },
        { id: 's3', type: 'star', colour: '#FF6B6B', position: { x: 50, y: 20 } },
        { id: 's4', type: 'triangle', colour: '#FF9F43', position: { x: 18, y: 55 } },
        { id: 's5', type: 'diamond', colour: '#00B894', position: { x: 82, y: 55 } },
        { id: 's6', type: 'circle', colour: '#6C5CE7', position: { x: 50, y: 55 } },
      ] },
    ],
    questions: [
      { text: 'Red circle became what colour in S1→2?', options: ['Teal', 'Pink', 'Orange', 'Blue'], correctIndex: 0 },
      { text: 'Square and star swapped in which transition?', options: ['S1→2', 'S2→3', 'Both', 'Neither'], correctIndex: 0 },
      { text: 'What colour is the star in Stage 3?', options: ['Gold', 'Red', 'Teal', 'Orange'], correctIndex: 1, targetStage: 3 },
      { text: 'The pink circle changed to what in S3?', options: ['Teal', 'Purple', 'Blue', 'Orange'], correctIndex: 1, targetStage: 3 },
      { text: 'Did the diamond swap positions in S2→3?', options: ['Yes', 'No'], correctIndex: 0 },
    ],
  },

  30: {
    level: 30, stageCount: 3, secondsPerStage: 3,
    stages: [
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#FF9F43', position: { x: 20, y: 18 } },
        { id: 's2', type: 'triangle', colour: '#6C5CE7', position: { x: 50, y: 18 } },
        { id: 's3', type: 'star', colour: '#00B894', position: { x: 80, y: 18 } },
        { id: 's4', type: 'circle', colour: '#FF6B6B', position: { x: 20, y: 50 } },
        { id: 's5', type: 'square', colour: '#0984E3', position: { x: 50, y: 50 } },
        { id: 's6', type: 'diamond', colour: '#D4A012', position: { x: 80, y: 50 } },
      ] },
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#FF9F43', position: { x: 20, y: 18 } },
        { id: 's2', type: 'triangle', colour: '#6C5CE7', position: { x: 50, y: 18 } },
        { id: 's3', type: 'star', colour: '#00B894', position: { x: 80, y: 18 } },
        { id: 's4', type: 'circle', colour: '#FF6B6B', position: { x: 50, y: 50 } },
        { id: 's5', type: 'square', colour: '#0984E3', position: { x: 20, y: 50 } },
        { id: 's6', type: 'diamond', colour: '#FD79A8', position: { x: 80, y: 50 } },
      ] },
      { shapes: [
        { id: 's1', type: 'diamond', colour: '#00CEC9', position: { x: 20, y: 18 } },
        { id: 's2', type: 'triangle', colour: '#6C5CE7', position: { x: 50, y: 18 } },
        { id: 's4', type: 'circle', colour: '#FF6B6B', position: { x: 50, y: 50 } },
        { id: 's5', type: 'square', colour: '#0984E3', position: { x: 20, y: 50 } },
        { id: 's6', type: 'diamond', colour: '#FD79A8', position: { x: 80, y: 50 } },
      ] },
    ],
    questions: [
      { text: 'Circle and square swapped in which transition?', options: ['S1→2', 'S2→3', 'Both', 'Neither'], correctIndex: 0 },
      { text: 'Which shape was removed in Stage 3?', options: ['Diamond', 'Star', 'Triangle', 'Circle'], correctIndex: 1, targetStage: 3 },
      { text: 'The gold diamond at x:80 changed to what colour in S2?', options: ['Orange', 'Pink', 'Teal', 'Gold'], correctIndex: 1, targetStage: 2 },
      { text: 'What colour is the top-left diamond in Stage 3?', options: ['Orange', 'Teal', 'Pink', 'Gold'], correctIndex: 1, targetStage: 3 },
      { text: 'How many shapes in Stage 3?', options: ['4', '5', '6', '3'], correctIndex: 1, targetStage: 3 },
    ],
  },

  // LEVELS 31-35: continued peak (6 shapes, 3 stages, 2-3 changes, 3s)
  31: { level: 31, stageCount: 3, secondsPerStage: 3, stages: [
    { shapes: [{ id:'s1',type:'star',colour:'#D4A012',position:{x:18,y:20}},{id:'s2',type:'circle',colour:'#FF6B6B',position:{x:50,y:20}},{id:'s3',type:'square',colour:'#0984E3',position:{x:82,y:20}},{id:'s4',type:'triangle',colour:'#00B894',position:{x:18,y:55}},{id:'s5',type:'diamond',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FF9F43',position:{x:82,y:55}}]},
    { shapes: [{ id:'s1',type:'star',colour:'#D4A012',position:{x:50,y:20}},{id:'s2',type:'circle',colour:'#FD79A8',position:{x:18,y:20}},{id:'s3',type:'square',colour:'#0984E3',position:{x:82,y:20}},{id:'s4',type:'triangle',colour:'#00B894',position:{x:18,y:55}},{id:'s5',type:'diamond',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FF9F43',position:{x:82,y:55}}]},
    { shapes: [{ id:'s1',type:'star',colour:'#00CEC9',position:{x:50,y:20}},{id:'s2',type:'circle',colour:'#FD79A8',position:{x:18,y:20}},{id:'s3',type:'square',colour:'#0984E3',position:{x:82,y:55}},{id:'s4',type:'triangle',colour:'#00B894',position:{x:18,y:55}},{id:'s5',type:'diamond',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FF9F43',position:{x:82,y:20}}]}],
    questions: [{ text:'Red circle became what colour in S1→2?',options:['Pink','Teal','Orange','Gold'],correctIndex:0},{text:'Star and circle swapped in S1→2?',options:['Yes','No'],correctIndex:0},{text:'What colour is the star in S3?',options:['Gold','Teal','Red','Pink'],correctIndex:1,targetStage:3},{text:'Square and orange circle swapped in S2→3?',options:['Yes','No'],correctIndex:0},{text:'Did the triangle move in any stage?',options:['Yes','No'],correctIndex:1}]},

  32: { level: 32, stageCount: 3, secondsPerStage: 3, stages: [
    { shapes: [{id:'s1',type:'diamond',colour:'#FD79A8',position:{x:20,y:22}},{id:'s2',type:'star',colour:'#D4A012',position:{x:50,y:22}},{id:'s3',type:'triangle',colour:'#0984E3',position:{x:80,y:22}},{id:'s4',type:'circle',colour:'#FF6B6B',position:{x:20,y:58}},{id:'s5',type:'square',colour:'#00B894',position:{x:50,y:58}},{id:'s6',type:'diamond',colour:'#6C5CE7',position:{x:80,y:58}}]},
    { shapes: [{id:'s1',type:'diamond',colour:'#FD79A8',position:{x:20,y:22}},{id:'s2',type:'star',colour:'#D4A012',position:{x:50,y:22}},{id:'s3',type:'triangle',colour:'#0984E3',position:{x:80,y:22}},{id:'s4',type:'circle',colour:'#FF6B6B',position:{x:50,y:58}},{id:'s5',type:'square',colour:'#00B894',position:{x:80,y:58}},{id:'s6',type:'diamond',colour:'#00CEC9',position:{x:20,y:58}}]},
    { shapes: [{id:'s1',type:'diamond',colour:'#FF9F43',position:{x:20,y:22}},{id:'s2',type:'star',colour:'#D4A012',position:{x:50,y:22}},{id:'s3',type:'triangle',colour:'#0984E3',position:{x:80,y:22}},{id:'s4',type:'circle',colour:'#FF6B6B',position:{x:50,y:58}},{id:'s5',type:'square',colour:'#00B894',position:{x:80,y:58}}]}],
    questions: [{text:'Bottom 3 shapes rotated in S1→2?',options:['Yes','No'],correctIndex:0},{text:'Purple diamond changed to what in S2?',options:['Teal','Pink','Orange','Gold'],correctIndex:0,targetStage:2},{text:'Which shape was removed in S3?',options:['Circle','Star','Diamond','Square'],correctIndex:2,targetStage:3},{text:'Pink diamond changed to what in S3?',options:['Orange','Teal','Purple','Pink'],correctIndex:0,targetStage:3},{text:'How many shapes in S3?',options:['4','5','6','3'],correctIndex:1,targetStage:3}]},

  33: { level: 33, stageCount: 3, secondsPerStage: 3, stages: [
    { shapes: [{id:'s1',type:'circle',colour:'#00CEC9',position:{x:18,y:20}},{id:'s2',type:'square',colour:'#FF6B6B',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#6C5CE7',position:{x:82,y:20}},{id:'s4',type:'triangle',colour:'#D4A012',position:{x:18,y:58}},{id:'s5',type:'diamond',colour:'#0984E3',position:{x:50,y:58}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:82,y:58}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#00CEC9',position:{x:82,y:20}},{id:'s2',type:'square',colour:'#FF6B6B',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#6C5CE7',position:{x:18,y:20}},{id:'s4',type:'triangle',colour:'#FF9F43',position:{x:18,y:58}},{id:'s5',type:'diamond',colour:'#0984E3',position:{x:50,y:58}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:82,y:58}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#00B894',position:{x:82,y:20}},{id:'s2',type:'square',colour:'#FF6B6B',position:{x:50,y:58}},{id:'s3',type:'star',colour:'#6C5CE7',position:{x:18,y:20}},{id:'s4',type:'triangle',colour:'#FF9F43',position:{x:18,y:58}},{id:'s5',type:'diamond',colour:'#0984E3',position:{x:50,y:20}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:82,y:58}}]}],
    questions: [{text:'Teal circle and star swapped in S1→2?',options:['Yes','No'],correctIndex:0},{text:'Triangle colour in S1?',options:['Gold','Orange','Red','Green'],correctIndex:0,targetStage:1},{text:'Teal circle changed to what in S3?',options:['Green','Teal','Pink','Blue'],correctIndex:0,targetStage:3},{text:'Square and diamond swapped in S2→3?',options:['Yes','No'],correctIndex:0},{text:'Pink circle stayed in same position?',options:['Yes','No'],correctIndex:0}]},

  34: { level: 34, stageCount: 3, secondsPerStage: 3, stages: [
    { shapes: [{id:'s1',type:'star',colour:'#FF6B6B',position:{x:22,y:18}},{id:'s2',type:'diamond',colour:'#0984E3',position:{x:78,y:18}},{id:'s3',type:'circle',colour:'#00B894',position:{x:22,y:50}},{id:'s4',type:'square',colour:'#D4A012',position:{x:78,y:50}},{id:'s5',type:'triangle',colour:'#6C5CE7',position:{x:35,y:80}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:65,y:80}}]},
    { shapes: [{id:'s1',type:'star',colour:'#FF6B6B',position:{x:22,y:18}},{id:'s2',type:'diamond',colour:'#0984E3',position:{x:78,y:18}},{id:'s3',type:'circle',colour:'#00CEC9',position:{x:78,y:50}},{id:'s4',type:'square',colour:'#D4A012',position:{x:22,y:50}},{id:'s5',type:'triangle',colour:'#FF9F43',position:{x:35,y:80}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:65,y:80}}]},
    { shapes: [{id:'s1',type:'star',colour:'#FF6B6B',position:{x:22,y:18}},{id:'s2',type:'diamond',colour:'#D4A012',position:{x:78,y:18}},{id:'s3',type:'circle',colour:'#00CEC9',position:{x:78,y:50}},{id:'s4',type:'square',colour:'#0984E3',position:{x:22,y:50}},{id:'s5',type:'triangle',colour:'#FF9F43',position:{x:65,y:80}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:35,y:80}}]}],
    questions: [{text:'Circle and square swapped in S1→2?',options:['Yes','No'],correctIndex:0},{text:'Circle colour in S1?',options:['Green','Teal','Blue','Gold'],correctIndex:0,targetStage:1},{text:'Diamond colour in S3?',options:['Blue','Gold','Pink','Teal'],correctIndex:1,targetStage:3},{text:'Triangles and stars at bottom swapped in S2→3?',options:['Yes','No'],correctIndex:0},{text:'Red star moved at any point?',options:['Yes','No'],correctIndex:1}]},

  35: { level: 35, stageCount: 3, secondsPerStage: 3, stages: [
    { shapes: [{id:'s1',type:'circle',colour:'#D4A012',position:{x:20,y:20}},{id:'s2',type:'triangle',colour:'#FF6B6B',position:{x:50,y:20}},{id:'s3',type:'diamond',colour:'#00B894',position:{x:80,y:20}},{id:'s4',type:'square',colour:'#0984E3',position:{x:20,y:55}},{id:'s5',type:'star',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#D4A012',position:{x:20,y:20}},{id:'s2',type:'triangle',colour:'#00CEC9',position:{x:50,y:20}},{id:'s3',type:'diamond',colour:'#00B894',position:{x:80,y:55}},{id:'s4',type:'square',colour:'#0984E3',position:{x:20,y:55}},{id:'s5',type:'star',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:80,y:20}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#FF9F43',position:{x:20,y:20}},{id:'s2',type:'triangle',colour:'#00CEC9',position:{x:50,y:55}},{id:'s3',type:'diamond',colour:'#00B894',position:{x:80,y:55}},{id:'s4',type:'square',colour:'#0984E3',position:{x:20,y:55}},{id:'s5',type:'star',colour:'#FF6B6B',position:{x:50,y:20}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:80,y:20}}]}],
    questions: [{text:'Triangle colour in S1?',options:['Red','Teal','Gold','Pink'],correctIndex:0,targetStage:1},{text:'Diamond and pink circle swapped in S1→2?',options:['Yes','No'],correctIndex:0},{text:'Gold circle changed to what in S3?',options:['Orange','Teal','Pink','Gold'],correctIndex:0,targetStage:3},{text:'Triangle and star swapped in S2→3?',options:['Yes','No'],correctIndex:0},{text:'Star colour in S3?',options:['Purple','Red','Gold','Teal'],correctIndex:1,targetStage:3}]},

  // ═══════════════════════════════════════════════════════════════
  // LEVELS 36-40: THE GAUNTLET
  // 6 shapes, 3 stages, 3 changes per transition, 2 SECONDS
  // ═══════════════════════════════════════════════════════════════

  36: { level: 36, stageCount: 3, secondsPerStage: 2, stages: [
    { shapes: [{id:'s1',type:'circle',colour:'#FF6B6B',position:{x:18,y:20}},{id:'s2',type:'square',colour:'#0984E3',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:82,y:20}},{id:'s4',type:'triangle',colour:'#00B894',position:{x:18,y:55}},{id:'s5',type:'diamond',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#00CEC9',position:{x:82,y:20}},{id:'s2',type:'square',colour:'#FF9F43',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:18,y:20}},{id:'s4',type:'triangle',colour:'#00B894',position:{x:18,y:55}},{id:'s5',type:'diamond',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#00CEC9',position:{x:82,y:20}},{id:'s2',type:'square',colour:'#FF9F43',position:{x:50,y:55}},{id:'s3',type:'star',colour:'#FF6B6B',position:{x:18,y:20}},{id:'s4',type:'triangle',colour:'#6C5CE7',position:{x:18,y:55}},{id:'s5',type:'diamond',colour:'#00B894',position:{x:50,y:20}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:82,y:55}}]}],
    questions: [{text:'Circle colour in S1?',options:['Red','Teal','Pink','Orange'],correctIndex:0,targetStage:1},{text:'Star and circle swapped in S1→2?',options:['Yes','No'],correctIndex:0},{text:'Square colour in S3?',options:['Blue','Orange','Red','Gold'],correctIndex:1,targetStage:3},{text:'Triangle colour in S3?',options:['Green','Purple','Gold','Blue'],correctIndex:1,targetStage:3},{text:'Diamond colour in S3?',options:['Purple','Green','Blue','Gold'],correctIndex:1,targetStage:3}]},

  37: { level: 37, stageCount: 3, secondsPerStage: 2, stages: [
    { shapes: [{id:'s1',type:'diamond',colour:'#FF9F43',position:{x:20,y:18}},{id:'s2',type:'circle',colour:'#6C5CE7',position:{x:50,y:18}},{id:'s3',type:'star',colour:'#00B894',position:{x:80,y:18}},{id:'s4',type:'square',colour:'#FF6B6B',position:{x:20,y:52}},{id:'s5',type:'triangle',colour:'#D4A012',position:{x:50,y:52}},{id:'s6',type:'diamond',colour:'#0984E3',position:{x:80,y:52}}]},
    { shapes: [{id:'s1',type:'diamond',colour:'#FF9F43',position:{x:80,y:18}},{id:'s2',type:'circle',colour:'#FD79A8',position:{x:50,y:18}},{id:'s3',type:'star',colour:'#00B894',position:{x:20,y:18}},{id:'s4',type:'square',colour:'#FF6B6B',position:{x:50,y:52}},{id:'s5',type:'triangle',colour:'#D4A012',position:{x:80,y:52}},{id:'s6',type:'diamond',colour:'#0984E3',position:{x:20,y:52}}]},
    { shapes: [{id:'s1',type:'diamond',colour:'#00CEC9',position:{x:80,y:18}},{id:'s2',type:'circle',colour:'#FD79A8',position:{x:50,y:52}},{id:'s3',type:'star',colour:'#D4A012',position:{x:20,y:18}},{id:'s4',type:'square',colour:'#FF6B6B',position:{x:50,y:18}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:80,y:52}},{id:'s6',type:'diamond',colour:'#0984E3',position:{x:20,y:52}}]}],
    questions: [{text:'Orange diamond moved to where in S2?',options:['Top-left','Top-right','Bottom-left','Bottom-right'],correctIndex:1},{text:'Circle colour in S1?',options:['Purple','Pink','Blue','Teal'],correctIndex:0,targetStage:1},{text:'Star colour in S3?',options:['Green','Gold','Teal','Red'],correctIndex:1,targetStage:3},{text:'Orange diamond colour in S3?',options:['Orange','Teal','Pink','Gold'],correctIndex:1,targetStage:3},{text:'Circle moved to bottom row in S2→3?',options:['Yes','No'],correctIndex:0}]},

  38: { level: 38, stageCount: 3, secondsPerStage: 2, stages: [
    { shapes: [{id:'s1',type:'star',colour:'#FF6B6B',position:{x:22,y:20}},{id:'s2',type:'triangle',colour:'#0984E3',position:{x:78,y:20}},{id:'s3',type:'circle',colour:'#D4A012',position:{x:22,y:50}},{id:'s4',type:'diamond',colour:'#00B894',position:{x:78,y:50}},{id:'s5',type:'square',colour:'#6C5CE7',position:{x:35,y:80}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:65,y:80}}]},
    { shapes: [{id:'s1',type:'star',colour:'#00CEC9',position:{x:78,y:20}},{id:'s2',type:'triangle',colour:'#0984E3',position:{x:22,y:20}},{id:'s3',type:'circle',colour:'#FF9F43',position:{x:78,y:50}},{id:'s4',type:'diamond',colour:'#00B894',position:{x:22,y:50}},{id:'s5',type:'square',colour:'#6C5CE7',position:{x:35,y:80}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:65,y:80}}]},
    { shapes: [{id:'s1',type:'star',colour:'#00CEC9',position:{x:78,y:20}},{id:'s2',type:'triangle',colour:'#D4A012',position:{x:22,y:20}},{id:'s3',type:'circle',colour:'#FF9F43',position:{x:78,y:50}},{id:'s4',type:'diamond',colour:'#FF6B6B',position:{x:22,y:50}},{id:'s5',type:'square',colour:'#6C5CE7',position:{x:65,y:80}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:35,y:80}}]}],
    questions: [{text:'Red star colour in S2?',options:['Red','Teal','Orange','Pink'],correctIndex:1},{text:'Star and triangle swapped in S1→2?',options:['Yes','No'],correctIndex:0},{text:'Circle colour in S1?',options:['Gold','Orange','Teal','Red'],correctIndex:0,targetStage:1},{text:'Diamond colour in S3?',options:['Green','Red','Gold','Blue'],correctIndex:1,targetStage:3},{text:'Bottom squares swapped in S2→3?',options:['Yes','No'],correctIndex:0}]},

  39: { level: 39, stageCount: 3, secondsPerStage: 2, stages: [
    { shapes: [{id:'s1',type:'circle',colour:'#6C5CE7',position:{x:18,y:20}},{id:'s2',type:'diamond',colour:'#FF6B6B',position:{x:50,y:20}},{id:'s3',type:'square',colour:'#00B894',position:{x:82,y:20}},{id:'s4',type:'star',colour:'#D4A012',position:{x:18,y:55}},{id:'s5',type:'triangle',colour:'#0984E3',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FF9F43',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#FD79A8',position:{x:50,y:20}},{id:'s2',type:'diamond',colour:'#FF6B6B',position:{x:82,y:20}},{id:'s3',type:'square',colour:'#00B894',position:{x:18,y:20}},{id:'s4',type:'star',colour:'#00CEC9',position:{x:18,y:55}},{id:'s5',type:'triangle',colour:'#0984E3',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FF9F43',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#FD79A8',position:{x:50,y:20}},{id:'s2',type:'diamond',colour:'#D4A012',position:{x:82,y:55}},{id:'s3',type:'square',colour:'#00B894',position:{x:18,y:20}},{id:'s4',type:'star',colour:'#00CEC9',position:{x:82,y:20}},{id:'s5',type:'triangle',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FF9F43',position:{x:18,y:55}}]}],
    questions: [{text:'Purple circle colour in S2?',options:['Purple','Pink','Teal','Orange'],correctIndex:1},{text:'Star colour in S1?',options:['Gold','Teal','Red','Blue'],correctIndex:0,targetStage:1},{text:'Diamond colour in S3?',options:['Red','Gold','Pink','Green'],correctIndex:1,targetStage:3},{text:'How many shapes changed position in S2→3?',options:['2','3','4','1'],correctIndex:1},{text:'Triangle colour in S3?',options:['Blue','Purple','Gold','Teal'],correctIndex:1,targetStage:3}]},

  40: { level: 40, stageCount: 3, secondsPerStage: 2, stages: [
    { shapes: [{id:'s1',type:'star',colour:'#D4A012',position:{x:18,y:18}},{id:'s2',type:'circle',colour:'#FF6B6B',position:{x:50,y:18}},{id:'s3',type:'diamond',colour:'#0984E3',position:{x:82,y:18}},{id:'s4',type:'triangle',colour:'#6C5CE7',position:{x:18,y:52}},{id:'s5',type:'square',colour:'#00B894',position:{x:50,y:52}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:82,y:52}}]},
    { shapes: [{id:'s1',type:'star',colour:'#00CEC9',position:{x:82,y:18}},{id:'s2',type:'circle',colour:'#FF6B6B',position:{x:18,y:52}},{id:'s3',type:'diamond',colour:'#D4A012',position:{x:50,y:18}},{id:'s4',type:'triangle',colour:'#FF9F43',position:{x:18,y:18}},{id:'s5',type:'square',colour:'#00B894',position:{x:50,y:52}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:82,y:52}}]},
    { shapes: [{id:'s1',type:'star',colour:'#00CEC9',position:{x:82,y:52}},{id:'s2',type:'circle',colour:'#6C5CE7',position:{x:18,y:52}},{id:'s3',type:'diamond',colour:'#D4A012',position:{x:50,y:52}},{id:'s4',type:'triangle',colour:'#FF9F43',position:{x:50,y:18}},{id:'s5',type:'square',colour:'#FF6B6B',position:{x:18,y:18}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:82,y:18}}]}],
    questions: [{text:'Gold star colour in S2?',options:['Gold','Teal','Red','Pink'],correctIndex:1},{text:'Red circle position in S1?',options:['Top-centre','Top-left','Bottom-left','Top-right'],correctIndex:0,targetStage:1},{text:'Circle colour in S3?',options:['Red','Purple','Teal','Pink'],correctIndex:1,targetStage:3},{text:'How many shapes moved in S2→3?',options:['2','3','4','5'],correctIndex:2},{text:'Triangle colour in S1?',options:['Purple','Orange','Gold','Blue'],correctIndex:0,targetStage:1}]},

  // ═══════════════════════════════════════════════════════════════
  // ENDGAME 20 — LEVELS 41-55
  // The "Mastermind Elite" tier — for players who beat the main 380.
  // Introduces FIVE new cognitive levers not used in L1-40:
  //   1. No targetStage hints — questions don't tell you which stage
  //   2. 4-5 stages (vs L1-40's 2-3 ceiling)
  //   3. 1.5s per stage (vs L1-40's 2s floor)
  //   4. 7-shape layouts (vs L1-40's 6-shape ceiling)
  //   5. Subtle colour shifts — same family, different shade
  // L55 is the FINAL boss — Grand Master Trial — every lever combined.
  // ═══════════════════════════════════════════════════════════════

  // L41: 3 stages × 2s, 7 shapes, 6 questions, NO targetStage hints
  41: { level: 41, stageCount: 3, secondsPerStage: 2, stages: [
    { shapes: [{id:'s1',type:'circle',colour:'#FF6B6B',position:{x:18,y:20}},{id:'s2',type:'square',colour:'#0984E3',position:{x:40,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:62,y:20}},{id:'s4',type:'diamond',colour:'#6C5CE7',position:{x:82,y:20}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:25,y:58}},{id:'s6',type:'circle',colour:'#FF9F43',position:{x:50,y:58}},{id:'s7',type:'star',colour:'#FD79A8',position:{x:75,y:58}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#00CEC9',position:{x:18,y:20}},{id:'s2',type:'square',colour:'#0984E3',position:{x:62,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:40,y:20}},{id:'s4',type:'diamond',colour:'#6C5CE7',position:{x:82,y:20}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:25,y:58}},{id:'s6',type:'circle',colour:'#FF9F43',position:{x:75,y:58}},{id:'s7',type:'star',colour:'#FD79A8',position:{x:50,y:58}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#00CEC9',position:{x:18,y:20}},{id:'s2',type:'square',colour:'#FD79A8',position:{x:62,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:40,y:20}},{id:'s4',type:'diamond',colour:'#FF9F43',position:{x:82,y:20}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:50,y:58}},{id:'s6',type:'circle',colour:'#6C5CE7',position:{x:75,y:58}},{id:'s7',type:'star',colour:'#0984E3',position:{x:25,y:58}}]}],
    questions: [{text:'Red circle changed to what colour in S2?',options:['Pink','Teal','Orange','Gold'],correctIndex:1},{text:'How many shapes were in the top row in S1?',options:['3','4','5','2'],correctIndex:1},{text:'Square and star swapped in S1→2?',options:['Yes','No','Only top row','Only bottom row'],correctIndex:0},{text:'Diamond colour in S3?',options:['Purple','Orange','Pink','Gold'],correctIndex:1},{text:'Bottom-row star colour in S3?',options:['Pink','Blue','Gold','Teal'],correctIndex:1},{text:'Triangle colour stayed the same all 3 stages?',options:['Yes','No','Only S1-S2','Only S2-S3'],correctIndex:0}]},

  // L42: 3 stages × 1.8s, 7 shapes, 6 questions, no hints
  42: { level: 42, stageCount: 3, secondsPerStage: 1.8, stages: [
    { shapes: [{id:'s1',type:'diamond',colour:'#FF6B6B',position:{x:18,y:18}},{id:'s2',type:'star',colour:'#00B894',position:{x:40,y:18}},{id:'s3',type:'circle',colour:'#0984E3',position:{x:62,y:18}},{id:'s4',type:'square',colour:'#D4A012',position:{x:82,y:18}},{id:'s5',type:'triangle',colour:'#FD79A8',position:{x:25,y:55}},{id:'s6',type:'diamond',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s7',type:'star',colour:'#FF9F43',position:{x:75,y:55}}]},
    { shapes: [{id:'s1',type:'diamond',colour:'#FF6B6B',position:{x:82,y:18}},{id:'s2',type:'star',colour:'#FF9F43',position:{x:40,y:18}},{id:'s3',type:'circle',colour:'#0984E3',position:{x:62,y:18}},{id:'s4',type:'square',colour:'#D4A012',position:{x:18,y:18}},{id:'s5',type:'triangle',colour:'#FD79A8',position:{x:25,y:55}},{id:'s6',type:'diamond',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s7',type:'star',colour:'#00B894',position:{x:75,y:55}}]},
    { shapes: [{id:'s1',type:'diamond',colour:'#FD79A8',position:{x:82,y:18}},{id:'s2',type:'star',colour:'#FF9F43',position:{x:25,y:55}},{id:'s3',type:'circle',colour:'#00CEC9',position:{x:62,y:18}},{id:'s4',type:'square',colour:'#D4A012',position:{x:18,y:18}},{id:'s5',type:'triangle',colour:'#0984E3',position:{x:40,y:18}},{id:'s6',type:'diamond',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s7',type:'star',colour:'#00B894',position:{x:75,y:55}}]}],
    questions: [{text:'Red diamond moved to where in S2?',options:['Top-left','Top-right','Bottom-left','Bottom-right'],correctIndex:1},{text:'Top-left star colour in S2?',options:['Green','Orange','Red','Pink'],correctIndex:1},{text:'Circle colour in S3?',options:['Blue','Teal','Purple','Pink'],correctIndex:1},{text:'Diamond at top-right in S3 colour?',options:['Red','Pink','Purple','Gold'],correctIndex:1},{text:'Triangle moved up in S2→3?',options:['Yes','No','Only sideways','Removed'],correctIndex:0},{text:'How many stars total in S3?',options:['1','2','3','4'],correctIndex:1}]},

  // L43: 4 stages × 2s, 6 shapes/stage, 6 questions — first 4-stage
  43: { level: 43, stageCount: 4, secondsPerStage: 2, stages: [
    { shapes: [{id:'s1',type:'star',colour:'#D4A012',position:{x:20,y:20}},{id:'s2',type:'circle',colour:'#FF6B6B',position:{x:50,y:20}},{id:'s3',type:'square',colour:'#0984E3',position:{x:80,y:20}},{id:'s4',type:'triangle',colour:'#6C5CE7',position:{x:20,y:55}},{id:'s5',type:'diamond',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FF9F43',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'star',colour:'#D4A012',position:{x:50,y:20}},{id:'s2',type:'circle',colour:'#FD79A8',position:{x:20,y:20}},{id:'s3',type:'square',colour:'#0984E3',position:{x:80,y:20}},{id:'s4',type:'triangle',colour:'#6C5CE7',position:{x:20,y:55}},{id:'s5',type:'diamond',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FF9F43',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'star',colour:'#00CEC9',position:{x:50,y:20}},{id:'s2',type:'circle',colour:'#FD79A8',position:{x:20,y:20}},{id:'s3',type:'square',colour:'#0984E3',position:{x:80,y:55}},{id:'s4',type:'triangle',colour:'#6C5CE7',position:{x:20,y:55}},{id:'s5',type:'diamond',colour:'#00B894',position:{x:80,y:20}},{id:'s6',type:'circle',colour:'#FF9F43',position:{x:50,y:55}}]},
    { shapes: [{id:'s1',type:'star',colour:'#00CEC9',position:{x:50,y:20}},{id:'s2',type:'circle',colour:'#0984E3',position:{x:20,y:20}},{id:'s3',type:'square',colour:'#FD79A8',position:{x:80,y:55}},{id:'s4',type:'triangle',colour:'#FF9F43',position:{x:20,y:55}},{id:'s5',type:'diamond',colour:'#00B894',position:{x:80,y:20}},{id:'s6',type:'circle',colour:'#6C5CE7',position:{x:50,y:55}}]}],
    questions: [{text:'Star colour in S1?',options:['Gold','Teal','Red','Blue'],correctIndex:0,targetStage:1},{text:'Star and circle swapped in S1→2?',options:['Yes','No','Only top row','Only colours'],correctIndex:0},{text:'Star colour in S3?',options:['Gold','Teal','Pink','Red'],correctIndex:1,targetStage:3},{text:'Triangle colour in S4?',options:['Purple','Orange','Gold','Blue'],correctIndex:1,targetStage:4},{text:'Square colour in S4?',options:['Blue','Pink','Teal','Gold'],correctIndex:1,targetStage:4},{text:'How many shapes moved in S3→4?',options:['1','2','3','4'],correctIndex:2}]},

  // L44: 4 stages × 1.8s, 6 shapes, NO hints, 6 questions
  44: { level: 44, stageCount: 4, secondsPerStage: 1.8, stages: [
    { shapes: [{id:'s1',type:'circle',colour:'#FF6B6B',position:{x:20,y:20}},{id:'s2',type:'diamond',colour:'#0984E3',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:80,y:20}},{id:'s4',type:'triangle',colour:'#6C5CE7',position:{x:20,y:55}},{id:'s5',type:'square',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#FF6B6B',position:{x:20,y:55}},{id:'s2',type:'diamond',colour:'#0984E3',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:80,y:20}},{id:'s4',type:'triangle',colour:'#FF9F43',position:{x:20,y:20}},{id:'s5',type:'square',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#FF6B6B',position:{x:20,y:55}},{id:'s2',type:'diamond',colour:'#00CEC9',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:80,y:55}},{id:'s4',type:'triangle',colour:'#FF9F43',position:{x:20,y:20}},{id:'s5',type:'square',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:80,y:20}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#6C5CE7',position:{x:20,y:55}},{id:'s2',type:'diamond',colour:'#00CEC9',position:{x:80,y:20}},{id:'s3',type:'star',colour:'#FF6B6B',position:{x:80,y:55}},{id:'s4',type:'triangle',colour:'#FF9F43',position:{x:50,y:20}},{id:'s5',type:'square',colour:'#00B894',position:{x:20,y:20}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:50,y:55}}]}],
    questions: [{text:'Triangle colour in S2?',options:['Purple','Orange','Gold','Pink'],correctIndex:1},{text:'Diamond colour in S3?',options:['Blue','Teal','Purple','Pink'],correctIndex:1},{text:'Star colour in S4?',options:['Gold','Red','Teal','Blue'],correctIndex:1},{text:'Red circle moved row in S1→2?',options:['Yes','No','Only sideways','Removed'],correctIndex:0},{text:'How many shapes are at the bottom row in S4?',options:['2','3','4','1'],correctIndex:1},{text:'Pink circle stayed at top-right in all 4 stages?',options:['Yes','No, moved S2','No, moved S3','No, moved S4'],correctIndex:2}]},

  // L45: 4 stages × 1.5s, 6 shapes, NO hints, 6 questions — peak compression
  45: { level: 45, stageCount: 4, secondsPerStage: 1.5, stages: [
    { shapes: [{id:'s1',type:'square',colour:'#0984E3',position:{x:18,y:20}},{id:'s2',type:'star',colour:'#D4A012',position:{x:50,y:20}},{id:'s3',type:'circle',colour:'#FF6B6B',position:{x:82,y:20}},{id:'s4',type:'diamond',colour:'#6C5CE7',position:{x:18,y:55}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'square',colour:'#0984E3',position:{x:82,y:20}},{id:'s2',type:'star',colour:'#D4A012',position:{x:18,y:20}},{id:'s3',type:'circle',colour:'#FF6B6B',position:{x:50,y:20}},{id:'s4',type:'diamond',colour:'#FF9F43',position:{x:18,y:55}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'square',colour:'#00CEC9',position:{x:82,y:20}},{id:'s2',type:'star',colour:'#D4A012',position:{x:18,y:20}},{id:'s3',type:'circle',colour:'#FF6B6B',position:{x:50,y:55}},{id:'s4',type:'diamond',colour:'#FF9F43',position:{x:18,y:55}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:50,y:20}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'square',colour:'#00CEC9',position:{x:82,y:55}},{id:'s2',type:'star',colour:'#FF6B6B',position:{x:18,y:20}},{id:'s3',type:'circle',colour:'#D4A012',position:{x:50,y:55}},{id:'s4',type:'diamond',colour:'#FF9F43',position:{x:50,y:20}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:18,y:55}},{id:'s6',type:'star',colour:'#FD79A8',position:{x:82,y:20}}]}],
    questions: [{text:'Square colour in S2?',options:['Blue','Teal','Pink','Purple'],correctIndex:0},{text:'Diamond colour in S3?',options:['Purple','Orange','Pink','Teal'],correctIndex:1},{text:'How many shapes moved in S3→4?',options:['2','3','4','5'],correctIndex:2},{text:'Top-left star colour in S4?',options:['Gold','Red','Teal','Pink'],correctIndex:1},{text:'Circle changed colour at any point?',options:['Yes','No'],correctIndex:0},{text:'Triangle moved at any point?',options:['Yes','No','Only S2→3','Only S3→4'],correctIndex:0}]},

  // L46: 3 stages × 2s, 6 shapes, SUBTLE colour shifts (Blue↔LightBlue, Purple↔Lavender)
  46: { level: 46, stageCount: 3, secondsPerStage: 2, stages: [
    { shapes: [{id:'s1',type:'circle',colour:'#0984E3',position:{x:20,y:20}},{id:'s2',type:'square',colour:'#6C5CE7',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:80,y:20}},{id:'s4',type:'triangle',colour:'#FF6B6B',position:{x:20,y:55}},{id:'s5',type:'diamond',colour:'#0984E3',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#6C5CE7',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#3D9DEB',position:{x:20,y:20}},{id:'s2',type:'square',colour:'#6C5CE7',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:80,y:20}},{id:'s4',type:'triangle',colour:'#FF6B6B',position:{x:20,y:55}},{id:'s5',type:'diamond',colour:'#0984E3',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#A29BFE',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#3D9DEB',position:{x:20,y:20}},{id:'s2',type:'square',colour:'#A29BFE',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:80,y:20}},{id:'s4',type:'triangle',colour:'#FF6B6B',position:{x:20,y:55}},{id:'s5',type:'diamond',colour:'#3D9DEB',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#A29BFE',position:{x:80,y:55}}]}],
    questions: [{text:'Top-left circle exact colour in S2?',options:['Blue','Light Blue','Teal','Purple'],correctIndex:1,targetStage:2},{text:'Square colour in S3?',options:['Purple','Lavender','Blue','Pink'],correctIndex:1,targetStage:3},{text:'Bottom-right circle colour in S2?',options:['Purple','Lavender','Pink','Blue'],correctIndex:1,targetStage:2},{text:'Did the diamond change shade in S2→3?',options:['Yes','No','Only saturation','Only outline'],correctIndex:0},{text:'How many shapes shifted shade across all 3 stages?',options:['3','4','5','2'],correctIndex:1},{text:'Which shape stayed exactly the same colour?',options:['Triangle','Star','Square','Diamond'],correctIndex:0}]},

  // L47: 4 stages × 2s, 6 shapes, subtle colour shifts compound across stages
  47: { level: 47, stageCount: 4, secondsPerStage: 2, stages: [
    { shapes: [{id:'s1',type:'star',colour:'#6C5CE7',position:{x:20,y:20}},{id:'s2',type:'circle',colour:'#0984E3',position:{x:50,y:20}},{id:'s3',type:'diamond',colour:'#FF6B6B',position:{x:80,y:20}},{id:'s4',type:'square',colour:'#00B894',position:{x:20,y:55}},{id:'s5',type:'triangle',colour:'#D4A012',position:{x:50,y:55}},{id:'s6',type:'star',colour:'#0984E3',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'star',colour:'#A29BFE',position:{x:20,y:20}},{id:'s2',type:'circle',colour:'#0984E3',position:{x:50,y:20}},{id:'s3',type:'diamond',colour:'#FF6B6B',position:{x:80,y:20}},{id:'s4',type:'square',colour:'#00B894',position:{x:20,y:55}},{id:'s5',type:'triangle',colour:'#D4A012',position:{x:50,y:55}},{id:'s6',type:'star',colour:'#3D9DEB',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'star',colour:'#A29BFE',position:{x:20,y:20}},{id:'s2',type:'circle',colour:'#3D9DEB',position:{x:50,y:20}},{id:'s3',type:'diamond',colour:'#FF6B6B',position:{x:80,y:20}},{id:'s4',type:'square',colour:'#00B894',position:{x:20,y:55}},{id:'s5',type:'triangle',colour:'#D4A012',position:{x:50,y:55}},{id:'s6',type:'star',colour:'#3D9DEB',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'star',colour:'#A29BFE',position:{x:20,y:20}},{id:'s2',type:'circle',colour:'#3D9DEB',position:{x:50,y:20}},{id:'s3',type:'diamond',colour:'#FF6B6B',position:{x:80,y:20}},{id:'s4',type:'square',colour:'#00B894',position:{x:20,y:55}},{id:'s5',type:'triangle',colour:'#D4A012',position:{x:50,y:55}},{id:'s6',type:'star',colour:'#6C5CE7',position:{x:80,y:55}}]}],
    questions: [{text:'Top-left star colour in S2?',options:['Purple','Lavender','Pink','Blue'],correctIndex:1,targetStage:2},{text:'Top-circle colour in S3?',options:['Blue','Light Blue','Teal','Navy'],correctIndex:1,targetStage:3},{text:'Bottom-right star colour in S4?',options:['Purple','Light Blue','Blue','Pink'],correctIndex:0,targetStage:4},{text:'Did the diamond shift shade across stages?',options:['Yes','No'],correctIndex:1},{text:'How many shapes ended up at a NEW shade compared to S1?',options:['2','3','4','1'],correctIndex:1},{text:'Star at top-left changed shade in which transition?',options:['S1→2','S2→3','S3→4','None'],correctIndex:0}]},

  // L48: 4 stages × 1.5s, 6 shapes, NO hints, subtle colours
  48: { level: 48, stageCount: 4, secondsPerStage: 1.5, stages: [
    { shapes: [{id:'s1',type:'circle',colour:'#A29BFE',position:{x:18,y:20}},{id:'s2',type:'square',colour:'#3D9DEB',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#FF6B6B',position:{x:82,y:20}},{id:'s4',type:'diamond',colour:'#D4A012',position:{x:18,y:55}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#0984E3',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#6C5CE7',position:{x:18,y:20}},{id:'s2',type:'square',colour:'#3D9DEB',position:{x:82,y:20}},{id:'s3',type:'star',colour:'#FF6B6B',position:{x:50,y:20}},{id:'s4',type:'diamond',colour:'#D4A012',position:{x:18,y:55}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#0984E3',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#6C5CE7',position:{x:50,y:20}},{id:'s2',type:'square',colour:'#0984E3',position:{x:82,y:20}},{id:'s3',type:'star',colour:'#FF6B6B',position:{x:18,y:20}},{id:'s4',type:'diamond',colour:'#D4A012',position:{x:18,y:55}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#3D9DEB',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'circle',colour:'#A29BFE',position:{x:50,y:20}},{id:'s2',type:'square',colour:'#0984E3',position:{x:82,y:20}},{id:'s3',type:'star',colour:'#FF6B6B',position:{x:18,y:20}},{id:'s4',type:'diamond',colour:'#FF9F43',position:{x:18,y:55}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#3D9DEB',position:{x:82,y:55}}]}],
    questions: [{text:'Top-left circle in S1 — exact colour?',options:['Purple','Lavender','Pink','Blue'],correctIndex:1},{text:'Square colour in S3?',options:['Light Blue','Blue','Teal','Purple'],correctIndex:1},{text:'Bottom-right circle in S4 — exact shade?',options:['Blue','Light Blue','Teal','Purple'],correctIndex:1},{text:'Top-left circle alternated between which two shades?',options:['Purple-Lavender','Blue-LightBlue','Red-Pink','Gold-Orange'],correctIndex:0},{text:'How many shapes did NOT change at all?',options:['1','2','3','4'],correctIndex:0},{text:'Diamond colour in S4?',options:['Gold','Orange','Pink','Red'],correctIndex:1}]},

  // L49: 5 stages × 2s, 6 shapes, 7 questions — first 5-stage level
  49: { level: 49, stageCount: 5, secondsPerStage: 2, stages: [
    { shapes: [{id:'s1',type:'star',colour:'#D4A012',position:{x:18,y:20}},{id:'s2',type:'circle',colour:'#FF6B6B',position:{x:50,y:20}},{id:'s3',type:'square',colour:'#0984E3',position:{x:82,y:20}},{id:'s4',type:'triangle',colour:'#6C5CE7',position:{x:18,y:55}},{id:'s5',type:'diamond',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'star',colour:'#D4A012',position:{x:50,y:20}},{id:'s2',type:'circle',colour:'#FF6B6B',position:{x:18,y:20}},{id:'s3',type:'square',colour:'#0984E3',position:{x:82,y:20}},{id:'s4',type:'triangle',colour:'#6C5CE7',position:{x:18,y:55}},{id:'s5',type:'diamond',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'star',colour:'#00CEC9',position:{x:50,y:20}},{id:'s2',type:'circle',colour:'#FF6B6B',position:{x:18,y:20}},{id:'s3',type:'square',colour:'#FF9F43',position:{x:82,y:20}},{id:'s4',type:'triangle',colour:'#6C5CE7',position:{x:18,y:55}},{id:'s5',type:'diamond',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'circle',colour:'#FD79A8',position:{x:82,y:55}}]},
    { shapes: [{id:'s1',type:'star',colour:'#00CEC9',position:{x:50,y:20}},{id:'s2',type:'circle',colour:'#FD79A8',position:{x:18,y:20}},{id:'s3',type:'square',colour:'#FF9F43',position:{x:82,y:55}},{id:'s4',type:'triangle',colour:'#6C5CE7',position:{x:18,y:55}},{id:'s5',type:'diamond',colour:'#00B894',position:{x:82,y:20}},{id:'s6',type:'circle',colour:'#FF6B6B',position:{x:50,y:55}}]},
    { shapes: [{id:'s1',type:'star',colour:'#00CEC9',position:{x:50,y:20}},{id:'s2',type:'circle',colour:'#FD79A8',position:{x:82,y:55}},{id:'s3',type:'square',colour:'#FF9F43',position:{x:18,y:20}},{id:'s4',type:'triangle',colour:'#D4A012',position:{x:18,y:55}},{id:'s5',type:'diamond',colour:'#0984E3',position:{x:82,y:20}},{id:'s6',type:'circle',colour:'#FF6B6B',position:{x:50,y:55}}]}],
    questions: [{text:'Star colour in S1?',options:['Gold','Teal','Red','Blue'],correctIndex:0,targetStage:1},{text:'Star and circle swapped in S1→2?',options:['Yes','No'],correctIndex:0},{text:'Star colour in S3?',options:['Gold','Teal','Pink','Red'],correctIndex:1,targetStage:3},{text:'Square colour in S3?',options:['Blue','Orange','Red','Pink'],correctIndex:1,targetStage:3},{text:'Triangle colour in S5?',options:['Purple','Gold','Blue','Teal'],correctIndex:1,targetStage:5},{text:'Diamond colour in S5?',options:['Green','Blue','Purple','Pink'],correctIndex:1,targetStage:5},{text:'How many shapes ended in different positions in S5 vs S1?',options:['3','4','5','6'],correctIndex:1}]},

  // L50: 5 stages × 1.8s, 6 shapes, NO hints, 7 questions
  50: { level: 50, stageCount: 5, secondsPerStage: 1.8, stages: [
    { shapes: [{id:'s1',type:'diamond',colour:'#0984E3',position:{x:20,y:20}},{id:'s2',type:'circle',colour:'#FF6B6B',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:80,y:20}},{id:'s4',type:'square',colour:'#6C5CE7',position:{x:20,y:55}},{id:'s5',type:'triangle',colour:'#00B894',position:{x:50,y:55}},{id:'s6',type:'diamond',colour:'#FD79A8',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'diamond',colour:'#0984E3',position:{x:80,y:20}},{id:'s2',type:'circle',colour:'#FF6B6B',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:20,y:20}},{id:'s4',type:'square',colour:'#6C5CE7',position:{x:20,y:55}},{id:'s5',type:'triangle',colour:'#FF9F43',position:{x:50,y:55}},{id:'s6',type:'diamond',colour:'#FD79A8',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'diamond',colour:'#0984E3',position:{x:80,y:20}},{id:'s2',type:'circle',colour:'#00CEC9',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#D4A012',position:{x:20,y:20}},{id:'s4',type:'square',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s5',type:'triangle',colour:'#FF9F43',position:{x:20,y:55}},{id:'s6',type:'diamond',colour:'#FD79A8',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'diamond',colour:'#FD79A8',position:{x:80,y:20}},{id:'s2',type:'circle',colour:'#00CEC9',position:{x:50,y:20}},{id:'s3',type:'star',colour:'#FF6B6B',position:{x:20,y:20}},{id:'s4',type:'square',colour:'#6C5CE7',position:{x:50,y:55}},{id:'s5',type:'triangle',colour:'#FF9F43',position:{x:20,y:55}},{id:'s6',type:'diamond',colour:'#0984E3',position:{x:80,y:55}}]},
    { shapes: [{id:'s1',type:'diamond',colour:'#FD79A8',position:{x:80,y:55}},{id:'s2',type:'circle',colour:'#00CEC9',position:{x:80,y:20}},{id:'s3',type:'star',colour:'#FF6B6B',position:{x:20,y:20}},{id:'s4',type:'square',colour:'#FF6B6B',position:{x:50,y:55}},{id:'s5',type:'triangle',colour:'#FF9F43',position:{x:50,y:20}},{id:'s6',type:'diamond',colour:'#0984E3',position:{x:20,y:55}}]}],
    questions: [{text:'Top-left diamond colour in S1?',options:['Blue','Pink','Purple','Teal'],correctIndex:0},{text:'Star moved to where in S2?',options:['Top-left','Top-right','Bottom-left','Bottom-right'],correctIndex:0},{text:'Triangle changed colour in which transition?',options:['S1→2','S2→3','S3→4','S4→5'],correctIndex:0},{text:'Circle colour in S3?',options:['Red','Teal','Pink','Blue'],correctIndex:1},{text:'Square colour in S4?',options:['Purple','Red','Blue','Green'],correctIndex:0},{text:'How many shapes are at the bottom row in S5?',options:['2','3','4','5'],correctIndex:1},{text:'Bottom-right diamond colour in S5?',options:['Pink','Blue','Purple','Red'],correctIndex:1}]},

};

/** Get a Mastermind level by number. Returns null if not found.
 *  For testing the stage system, level 998 = 2-stage dummy,
 *  level 999 = 3-stage dummy. */
export function getMastermindLevel(levelNum: number): MastermindLevel | null {
  if (levelNum === 998) return DUMMY_2_STAGE;
  if (levelNum === 999) return DUMMY_3_STAGE;
  return LEVELS[levelNum] ?? null;
}

/**
 * Convert a Mastermind level into the standard Level format used by
 * the existing [levelId].tsx game screen. This lets W6 levels reuse
 * ALL existing infrastructure: timer, power-ups, X button, question
 * card styling, result screen, gameStore integration.
 *
 * The conversion creates a single Scene whose viewTime is the total
 * stage viewing time. The objects come from Stage 1 (the initial
 * state the player sees first). Questions are adapted from the
 * Mastermind format to the standard Question format.
 *
 * Multi-stage display (cycling through stages during MEMORISE) is
 * handled by [levelId].tsx detecting w6 levels and rendering the
 * stage indicator + stage cycling locally.
 */
export function mastermindToStandardLevel(levelNum: number): import('@/src/types/game').Level | null {
  const mm = getMastermindLevel(levelNum);
  if (!mm) return null;

  // Total viewing time = all stages + transition gaps
  const totalViewTime = mm.stageCount * mm.secondsPerStage + (mm.stageCount - 1) * 0.5;

  // Convert Stage 1 shapes to SceneObjects
  const objects: import('@/src/types/game').SceneObject[] = mm.stages[0]?.shapes.map((s) => ({
    id: s.id,
    type: s.type,
    color: s.colour,
    x: s.position.x,
    y: s.position.y,
    size: 32,
  })) ?? [];

  // Convert questions to standard format
  const questions: import('@/src/types/game').Question[] = mm.questions.map((q, i) => ({
    id: `w6-l${levelNum}-q${i + 1}`,
    text: q.targetStage ? `[Stage ${q.targetStage}] ${q.text}` : q.text,
    options: (q.options.length === 4 ? q.options : [...q.options, '', '', '', ''].slice(0, 4)) as [string, string, string, string],
    correctIndex: q.correctIndex as 0 | 1 | 2 | 3,
    category: 'detail' as const,
    timeLimit: 8,
  }));

  return {
    id: `w6-l${levelNum}`,
    worldId: 6,
    levelNumber: levelNum,
    title: `Mastermind ${levelNum}`,
    scenes: [{
      id: `w6-l${levelNum}-s1`,
      viewTime: totalViewTime,
      objects,
      questions,
    }],
    requiredScore: 60,
    parScore: 100,
  };
}
