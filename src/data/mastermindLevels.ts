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
};

/** Get a Mastermind level by number. Returns null if not found.
 *  For testing the stage system, level 998 = 2-stage dummy,
 *  level 999 = 3-stage dummy. */
export function getMastermindLevel(levelNum: number): MastermindLevel | null {
  if (levelNum === 998) return DUMMY_2_STAGE;
  if (levelNum === 999) return DUMMY_3_STAGE;
  return LEVELS[levelNum] ?? null;
}
