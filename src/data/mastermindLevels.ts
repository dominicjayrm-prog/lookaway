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

/** All Mastermind levels indexed by level number (1-40).
 *  Chunk 3 will populate this with 40 real hand-crafted levels. */
const LEVELS: Record<number, MastermindLevel> = {};

/** Get a Mastermind level by number. Returns null if not found.
 *  For testing the stage system, level 998 = 2-stage dummy,
 *  level 999 = 3-stage dummy. */
export function getMastermindLevel(levelNum: number): MastermindLevel | null {
  if (levelNum === 998) return DUMMY_2_STAGE;
  if (levelNum === 999) return DUMMY_3_STAGE;
  return LEVELS[levelNum] ?? null;
}
