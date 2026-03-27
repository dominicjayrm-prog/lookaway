import type { Scene, SceneObject, Question, QuestionCategory } from '@/src/types/game';

const COLORS = ['#FF6B6B', '#0984E3', '#00B894', '#F9CA24', '#6C5CE7', '#E17055'] as const;
const COLOR_NAMES: Record<string, string> = { '#FF6B6B': 'red', '#0984E3': 'blue', '#00B894': 'green', '#F9CA24': 'yellow', '#6C5CE7': 'purple', '#E17055': 'orange' };
const SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond'] as const;
const SHAPE_NAMES: Record<string, string> = { circle: 'circle', square: 'square', triangle: 'triangle', star: 'star', diamond: 'diamond' };

function createSeededRng(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function dateToSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) { hash = (hash * 31 + dateStr.charCodeAt(i)) | 0; }
  return hash;
}

function pick<T>(arr: readonly T[], rng: () => number): T { return arr[Math.floor(rng() * arr.length)]; }

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

function hasMinDistance(x: number, y: number, existing: { x: number; y: number }[], minDist: number): boolean {
  return existing.every((obj) => { const dx = x - obj.x; const dy = y - obj.y; return Math.sqrt(dx * dx + dy * dy) >= minDist; });
}

function generateObjects(count: number, rng: () => number, sceneIndex: number): SceneObject[] {
  const objects: SceneObject[] = [];
  const usedColors = shuffle([...COLORS], rng).slice(0, Math.min(count, COLORS.length));
  const usedShapes = shuffle([...SHAPES], rng).slice(0, Math.max(2, Math.min(count, SHAPES.length)));
  for (let i = 0; i < count; i++) {
    let x: number; let y: number; let attempts = 0;
    do { x = 10 + rng() * 80; y = 10 + rng() * 80; attempts++; } while (!hasMinDistance(x, y, objects, 15) && attempts < 50);
    objects.push({ id: `daily-s${sceneIndex}-obj${i}`, type: usedShapes[i % usedShapes.length], color: usedColors[i % usedColors.length], x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, size: 25 + Math.floor(rng() * 20), rotation: Math.floor(rng() * 4) * 90, zIndex: i });
  }
  return objects;
}

function generateQuestions(objects: SceneObject[], rng: () => number, sceneIndex: number): Question[] {
  const questions: Question[] = [];
  function makeOptions(correct: string, distractors: string[]): { options: [string, string, string, string]; correctIndex: 0 | 1 | 2 | 3 } {
    const unique = [...new Set(distractors.filter((d) => d !== correct))];
    while (unique.length < 3) unique.push(`${correct}?`);
    const opts = [correct, unique[0], unique[1], unique[2]];
    const indices = [0, 1, 2, 3]; shuffle(indices, rng);
    const shuffled = indices.map((i) => opts[i]) as [string, string, string, string];
    return { options: shuffled, correctIndex: indices.indexOf(0) as 0 | 1 | 2 | 3 };
  }
  { const cc: Record<string, number> = {}; for (const o of objects) cc[o.color] = (cc[o.color] || 0) + 1; const tc = pick(Object.keys(cc), rng); const cn = COLOR_NAMES[tc] || tc; const { options, correctIndex } = makeOptions(String(cc[tc]), [String(cc[tc]+1), String(Math.max(0,cc[tc]-1)), String(cc[tc]+2)]); questions.push({ id: `daily-s${sceneIndex}-q0`, text: `How many ${cn} objects were there?`, options, correctIndex, category: 'count', timeLimit: 8 }); }
  { const st = [...new Set(objects.map((o) => o.type))]; const ts = pick(st, rng); const sot = objects.filter((o) => o.type === ts); const to2 = pick(sot, rng); const ccn = COLOR_NAMES[to2.color] || to2.color; const d = Object.values(COLOR_NAMES).filter((c) => c !== ccn); shuffle(d, rng); const { options, correctIndex } = makeOptions(ccn, d.slice(0, 3)); const sl = SHAPE_NAMES[ts] || ts; questions.push({ id: `daily-s${sceneIndex}-q1`, text: `What colour was ${sot.length === 1 ? 'the' : 'a'} ${sl}?`, options, correctIndex, category: 'color', timeLimit: 8 }); }
  { const getArea = (o: SceneObject) => { if (o.y < 40) return o.x < 50 ? 'top left' : 'top right'; if (o.y > 60) return o.x < 50 ? 'bottom left' : 'bottom right'; return 'centre'; }; const to3 = pick(objects, rng); const area = getArea(to3); const cd = `${COLOR_NAMES[to3.color] || to3.color} ${SHAPE_NAMES[to3.type] || to3.type}`; const d2 = objects.filter((o) => o.id !== to3.id).map((o) => `${COLOR_NAMES[o.color] || o.color} ${SHAPE_NAMES[o.type] || o.type}`).filter((d3) => d3 !== cd); shuffle(d2, rng); while (d2.length < 3) d2.push(`${pick(Object.values(COLOR_NAMES), rng)} ${pick(Object.values(SHAPE_NAMES), rng)}`); const { options, correctIndex } = makeOptions(cd, d2.slice(0, 3)); questions.push({ id: `daily-s${sceneIndex}-q2`, text: `Which object was in the ${area} area?`, options, correctIndex, category: 'position', timeLimit: 8 }); }
  { const t = objects.length; const { options, correctIndex } = makeOptions(String(t), [String(t+1), String(t-1), String(t+2)]); questions.push({ id: `daily-s${sceneIndex}-q3`, text: 'How many objects were there in total?', options, correctIndex, category: 'count', timeLimit: 8 }); }
  { const ps = [...new Set(objects.map((o) => o.type))]; const abs = [...SHAPES].filter((s) => !ps.includes(s)); if (abs.length > 0 && rng() > 0.5) { const as2 = pick(abs, rng); const { options, correctIndex } = makeOptions('No', ['Yes', 'Maybe', 'Two of them']); questions.push({ id: `daily-s${sceneIndex}-q4`, text: `Was there a ${SHAPE_NAMES[as2] || as2} in the scene?`, options, correctIndex, category: 'presence', timeLimit: 8 }); } else { const ts2 = pick(ps, rng); const c2 = objects.filter((o) => o.type === ts2).length; const { options, correctIndex } = makeOptions(String(c2), [String(c2+1), String(Math.max(0,c2-1)), String(c2+2)]); questions.push({ id: `daily-s${sceneIndex}-q4`, text: `How many ${SHAPE_NAMES[ts2] || ts2}s were in the scene?`, options, correctIndex, category: 'detail', timeLimit: 8 }); } }
  return questions;
}

export function generateDailyChallenge(dateStr: string): Scene[] {
  const rng = createSeededRng(dateToSeed(dateStr));
  const scenes: Scene[] = [];
  for (let i = 0; i < 5; i++) {
    const count = 6 + (rng() > 0.5 ? 1 : 0);
    const objects = generateObjects(count, rng, i);
    scenes.push({ id: `daily-${dateStr}-scene${i}`, viewTime: 4, objects, questions: generateQuestions(objects, rng, i) });
  }
  return scenes;
}

export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
