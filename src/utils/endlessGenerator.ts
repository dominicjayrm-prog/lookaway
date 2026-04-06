/**
 * Endless Mode — Procedural scene + question generator.
 * Difficulty scales with level number. One wrong answer ends the run.
 */
import type { Scene, SceneObject, Question, ShapeType, QuestionCategory } from '@/src/types/game';

// ── Constants ─────────────────────────────────────────────────────────
const SHAPE_TYPES: ShapeType[] = ['circle', 'square', 'triangle', 'star', 'diamond', 'hexagon', 'heart'];
const COLORS: { name: string; hex: string }[] = [
  { name: 'Red', hex: '#FF6B6B' },
  { name: 'Blue', hex: '#0984E3' },
  { name: 'Green', hex: '#00B894' },
  { name: 'Yellow', hex: '#F9CA24' },
  { name: 'Purple', hex: '#6C5CE7' },
  { name: 'Orange', hex: '#E17055' },
  { name: 'Pink', hex: '#FD79A8' },
  { name: 'Teal', hex: '#00CEC9' },
];
const SHAPE_NAMES: Record<ShapeType, string> = {
  circle: 'Circle', square: 'Square', triangle: 'Triangle', star: 'Star',
  diamond: 'Diamond', hexagon: 'Hexagon', heart: 'Heart', number: 'Number', letter: 'Letter',
};
const POSITIONS = [
  { label: 'top-left', xRange: [10, 35], yRange: [10, 35] },
  { label: 'top-right', xRange: [65, 90], yRange: [10, 35] },
  { label: 'bottom-left', xRange: [10, 35], yRange: [65, 90] },
  { label: 'bottom-right', xRange: [65, 90], yRange: [65, 90] },
  { label: 'centre', xRange: [35, 65], yRange: [35, 65] },
  { label: 'top-centre', xRange: [35, 65], yRange: [10, 35] },
  { label: 'bottom-centre', xRange: [35, 65], yRange: [65, 90] },
  { label: 'centre-left', xRange: [10, 35], yRange: [35, 65] },
  { label: 'centre-right', xRange: [65, 90], yRange: [35, 65] },
];

// ── Difficulty params ─────────────────────────────────────────────────
interface DifficultyParams {
  objectCount: number;
  viewTime: number;
  questionCount: number;
  questionTimeLimit: number;
  colorCount: number;
  shapeCount: number;
}

function getDifficulty(level: number): DifficultyParams {
  // Gradual scaling — gets harder every 5 levels
  const tier = Math.floor((level - 1) / 5);
  return {
    objectCount: Math.min(4 + tier, 15),
    viewTime: Math.max(5 - tier * 0.3, 2),
    questionCount: Math.min(3 + Math.floor(tier / 2), 7),
    questionTimeLimit: Math.max(8 - tier * 0.3, 4),
    colorCount: Math.min(3 + Math.floor(tier / 2), COLORS.length),
    shapeCount: Math.min(3 + Math.floor(tier / 3), SHAPE_TYPES.length),
  };
}

// ── Random helpers ────────────────────────────────────────────────────
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Scene generation ──────────────────────────────────────────────────
function generateObjects(params: DifficultyParams): SceneObject[] {
  const shapes = shuffle(SHAPE_TYPES).slice(0, params.shapeCount);
  const colors = shuffle(COLORS).slice(0, params.colorCount);
  const objects: SceneObject[] = [];
  const placed: { x: number; y: number }[] = [];

  for (let i = 0; i < params.objectCount; i++) {
    // Pick position that doesn't overlap (min 15% distance)
    let x = 0, y = 0, attempts = 0;
    do {
      x = rand(12, 88);
      y = rand(12, 88);
      attempts++;
    } while (attempts < 50 && placed.some(p => Math.hypot(p.x - x, p.y - y) < 15));

    placed.push({ x, y });
    const shape = pick(shapes);
    const color = pick(colors);

    objects.push({
      id: `eo${i}`,
      type: shape,
      color: color.hex,
      x,
      y,
      size: rand(25, 45),
      rotation: rand(0, 3) * 90,
    });
  }

  return objects;
}

// ── Question generation ───────────────────────────────────────────────
function getColorName(hex: string): string {
  return COLORS.find(c => c.hex === hex)?.name ?? 'Unknown';
}

function getPositionLabel(x: number, y: number): string {
  for (const pos of POSITIONS) {
    if (x >= pos.xRange[0] && x <= pos.xRange[1] && y >= pos.yRange[0] && y <= pos.yRange[1]) {
      return pos.label;
    }
  }
  if (y < 40) return x < 50 ? 'top-left area' : 'top-right area';
  if (y > 60) return x < 50 ? 'bottom-left area' : 'bottom-right area';
  return 'centre area';
}

function makeOptions(correct: string, pool: string[]): { options: [string, string, string, string]; correctIndex: 0 | 1 | 2 | 3 } {
  const wrongs = pool.filter(p => p !== correct);
  const selected = shuffle(wrongs).slice(0, 3);
  const all = shuffle([correct, ...selected]) as [string, string, string, string];
  const correctIndex = all.indexOf(correct) as 0 | 1 | 2 | 3;
  return { options: all, correctIndex };
}

type QuestionGenerator = (objects: SceneObject[]) => Question | null;

function countQuestion(objects: SceneObject[], id: string): Question | null {
  // "How many shapes were there?"
  const total = objects.length;
  const { options, correctIndex } = makeOptions(
    String(total),
    [String(total - 1), String(total + 1), String(total + 2), String(total - 2), String(Math.max(1, total - 3))].filter(v => v !== String(total) && parseInt(v) > 0)
  );
  return { id, text: 'How many shapes were there in total?', options, correctIndex, category: 'count', timeLimit: 8 };
}

function colorCountQuestion(objects: SceneObject[], id: string): Question | null {
  // "How many [color] shapes were there?"
  const colorCounts: Record<string, number> = {};
  objects.forEach(o => { const n = getColorName(o.color); colorCounts[n] = (colorCounts[n] ?? 0) + 1; });
  const entries = Object.entries(colorCounts);
  if (entries.length === 0) return null;
  const [colorName, count] = pick(entries);
  const { options, correctIndex } = makeOptions(
    String(count),
    ['0', '1', '2', '3', '4', '5'].filter(v => v !== String(count))
  );
  return { id, text: `How many ${colorName.toLowerCase()} shapes were there?`, options, correctIndex, category: 'count', timeLimit: 8 };
}

function colorQuestion(objects: SceneObject[], id: string): Question | null {
  // "What colour was the [shape]?"
  const obj = pick(objects);
  const shapeName = SHAPE_NAMES[obj.type]?.toLowerCase() ?? 'shape';
  const correctColor = getColorName(obj.color);
  const allColors = COLORS.map(c => c.name);
  const { options, correctIndex } = makeOptions(correctColor, allColors);
  return { id, text: `What colour was the ${shapeName}?`, options, correctIndex, category: 'color', timeLimit: 8 };
}

function positionQuestion(objects: SceneObject[], id: string): Question | null {
  const obj = pick(objects);
  const shapeName = SHAPE_NAMES[obj.type]?.toLowerCase() ?? 'shape';
  const colorName = getColorName(obj.color).toLowerCase();
  const correctPos = getPositionLabel(obj.x, obj.y);
  const allPositions = POSITIONS.map(p => p.label).filter(p => p !== correctPos);
  const wrongs = shuffle(allPositions).slice(0, 3);
  const all = shuffle([correctPos, ...wrongs]) as [string, string, string, string];
  const correctIndex = all.indexOf(correctPos) as 0 | 1 | 2 | 3;
  // Capitalize first letter
  const formatted = all.map(s => s.charAt(0).toUpperCase() + s.slice(1)) as [string, string, string, string];
  return { id, text: `Where was the ${colorName} ${shapeName}?`, options: formatted, correctIndex, category: 'position', timeLimit: 8 };
}

function presenceQuestion(objects: SceneObject[], id: string): Question | null {
  // 50/50 — ask about shape that IS or ISN'T there
  const presentTypes = new Set(objects.map(o => o.type));
  const absentTypes = SHAPE_TYPES.filter(t => !presentTypes.has(t));
  const askAbsent = absentTypes.length > 0 && Math.random() > 0.4;

  if (askAbsent) {
    const shape = pick(absentTypes);
    const shapeName = SHAPE_NAMES[shape]?.toLowerCase() ?? 'shape';
    const { options, correctIndex } = makeOptions('No', ['Yes', 'Two of them', 'Three of them']);
    return { id, text: `Was there a ${shapeName} in the scene?`, options, correctIndex, category: 'presence', timeLimit: 8 };
  } else {
    const obj = pick(objects);
    const shapeName = SHAPE_NAMES[obj.type]?.toLowerCase() ?? 'shape';
    const colorName = getColorName(obj.color).toLowerCase();
    const { options, correctIndex } = makeOptions('Yes', ['No', 'Two of them', 'It was a different colour']);
    return { id, text: `Was there a ${colorName} ${shapeName}?`, options, correctIndex, category: 'presence', timeLimit: 8 };
  }
}

function comparisonQuestion(objects: SceneObject[], id: string): Question | null {
  // "Were there more [shape A] or [shape B]?"
  const typeCounts: Record<string, number> = {};
  objects.forEach(o => { typeCounts[o.type] = (typeCounts[o.type] ?? 0) + 1; });
  const types = Object.keys(typeCounts);
  if (types.length < 2) return null;
  const [typeA, typeB] = shuffle(types).slice(0, 2);
  const countA = typeCounts[typeA];
  const countB = typeCounts[typeB];
  const nameA = SHAPE_NAMES[typeA as ShapeType]?.toLowerCase() + 's' ?? 'shapes';
  const nameB = SHAPE_NAMES[typeB as ShapeType]?.toLowerCase() + 's' ?? 'shapes';

  let correct: string;
  if (countA > countB) correct = `More ${nameA}`;
  else if (countB > countA) correct = `More ${nameB}`;
  else correct = 'Same number';

  const { options, correctIndex } = makeOptions(correct, [`More ${nameA}`, `More ${nameB}`, 'Same number', `No ${nameB}`]);
  return { id, text: `Were there more ${nameA} or ${nameB}?`, options, correctIndex, category: 'comparison', timeLimit: 8 };
}

const QUESTION_GENERATORS: QuestionGenerator[] = [
  (objs) => countQuestion(objs, ''),
  (objs) => colorCountQuestion(objs, ''),
  (objs) => colorQuestion(objs, ''),
  (objs) => positionQuestion(objs, ''),
  (objs) => presenceQuestion(objs, ''),
  (objs) => comparisonQuestion(objs, ''),
];

function generateQuestions(objects: SceneObject[], count: number, timeLimit: number): Question[] {
  const questions: Question[] = [];
  const usedCategories = new Set<QuestionCategory>();
  const generators = shuffle([...QUESTION_GENERATORS]);

  // First pass — one per category
  for (const gen of generators) {
    if (questions.length >= count) break;
    const q = gen(objects);
    if (q && !usedCategories.has(q.category)) {
      q.id = `eq${questions.length}`;
      q.timeLimit = timeLimit;
      questions.push(q);
      usedCategories.add(q.category);
    }
  }

  // Second pass — fill remaining slots
  while (questions.length < count) {
    const gen = pick(QUESTION_GENERATORS);
    const q = gen(objects);
    if (q) {
      q.id = `eq${questions.length}`;
      q.timeLimit = timeLimit;
      questions.push(q);
    }
  }

  return questions;
}

// ── Public API ────────────────────────────────────────────────────────

/** Generate a complete scene for a given endless level number */
export function generateEndlessScene(levelNumber: number): Scene {
  const params = getDifficulty(levelNumber);
  const objects = generateObjects(params);
  const questions = generateQuestions(objects, params.questionCount, params.questionTimeLimit);

  return {
    id: `endless-${levelNumber}`,
    viewTime: Math.round(params.viewTime * 10) / 10,
    objects,
    questions,
  };
}

/** Get difficulty description for a level */
export function getDifficultyLabel(levelNumber: number): string {
  if (levelNumber <= 5) return 'Easy';
  if (levelNumber <= 10) return 'Medium';
  if (levelNumber <= 20) return 'Hard';
  if (levelNumber <= 35) return 'Expert';
  return 'Insane';
}

/** Get difficulty colour */
export function getDifficultyColor(levelNumber: number): string {
  if (levelNumber <= 5) return '#00B894';
  if (levelNumber <= 10) return '#0984E3';
  if (levelNumber <= 20) return '#F9CA24';
  if (levelNumber <= 35) return '#E17055';
  return '#FF6B6B';
}

export { getDifficulty };
