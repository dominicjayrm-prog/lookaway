/**
 * The 3-round memory test that runs during onboarding.
 *
 * Difficulty ramps each round to give the user a real sense of their
 * memory ceiling: round 1 is winnable by anyone, round 3 is hard
 * enough that even attentive players make mistakes. The result feeds
 * the percentile / brain-type theatre on the results screen.
 *
 * Each round = one scene + one question. Kept inline (not in
 * Supabase) because the test runs PRE-AUTH — the user has no
 * Supabase identity yet and the rounds must be deterministic across
 * every device.
 */
import { t } from '@/src/i18n';
import type { Scene, SceneObject, Question } from '@/src/types/game';

export interface OnboardingRound {
  index: 0 | 1 | 2;
  /** Friendly round number for UI ("Round 1 of 3"). */
  number: 1 | 2 | 3;
  /** Seconds the scene is visible before it disappears. */
  viewTime: number;
  scene: Scene;
  question: Question;
}

// ─── Round 1 — Easy ──────────────────────────────────────────────
// 3 shapes, 4s view time. Question is a colour recall — the easiest
// category. Almost everyone gets this one to set up the "I'm doing
// well" feeling before round 2 ramps up.
const round1Objects: SceneObject[] = [
  { id: 'r1-a', type: 'circle',   color: 'blue',   x: 25, y: 30, size: 56 },
  { id: 'r1-b', type: 'triangle', color: 'red',    x: 70, y: 28, size: 60 },
  { id: 'r1-c', type: 'square',   color: 'green',  x: 50, y: 70, size: 56 },
];

// Question text + options are resolved via getters so a language
// switch flips the entire round on the next render without rebuilding
// the data structure. Keeps the inline English literals as the source
// of truth (and the en fallback) while letting es.json override.
function makeQuestion(
  id: string,
  textKey: string,
  optionKeys: readonly string[],
  fallbackText: string,
  fallbackOptions: readonly string[],
  correctIndex: number,
  category: Question['category'],
  timeLimit: number,
): Question {
  const q = { id, correctIndex, category, timeLimit } as Question & { _t: string; _o: readonly string[] };
  Object.defineProperty(q, 'text', {
    get() {
      const v = t(textKey);
      return v === textKey ? fallbackText : v;
    },
    enumerable: true,
  });
  Object.defineProperty(q, 'options', {
    get() {
      return optionKeys.map((key, i) => {
        const v = t(key);
        return v === key ? fallbackOptions[i] : v;
      });
    },
    enumerable: true,
  });
  return q;
}

const round1Question: Question = makeQuestion(
  'r1-q1',
  'onboarding.test.round_1_question',
  [
    'onboarding.test.round_1_option_1',
    'onboarding.test.round_1_option_2',
    'onboarding.test.round_1_option_3',
    'onboarding.test.round_1_option_4',
  ],
  'What colour was the triangle?',
  ['Blue', 'Red', 'Green', 'Yellow'],
  1,
  'color',
  12,
);

// ─── Round 2 — Medium ────────────────────────────────────────────
// 4 shapes, 3.5s view. Position-based question — harder because the
// user has to remember WHERE something was, not just what it was.
const round2Objects: SceneObject[] = [
  { id: 'r2-a', type: 'star',    color: 'yellow', x: 22, y: 25, size: 54 },
  { id: 'r2-b', type: 'circle',  color: 'purple', x: 75, y: 25, size: 50 },
  { id: 'r2-c', type: 'square',  color: 'teal',   x: 22, y: 72, size: 50 },
  { id: 'r2-d', type: 'heart',   color: 'pink',   x: 75, y: 72, size: 54 },
];

const round2Question: Question = makeQuestion(
  'r2-q1',
  'onboarding.test.round_2_question',
  [
    'onboarding.test.round_2_option_1',
    'onboarding.test.round_2_option_2',
    'onboarding.test.round_2_option_3',
    'onboarding.test.round_2_option_4',
  ],
  'Which shape was in the top-left corner?',
  ['Heart', 'Star', 'Circle', 'Square'],
  1,
  'position',
  12,
);

// ─── Round 3 — Hard ──────────────────────────────────────────────
// 5 shapes, 3s view. Counting + colour — combined detail question
// that forces the user to track two attributes at once. Most players
// miss this; that's the point. Sets up the "you have weaknesses we
// can train" angle on the results / blurred-profile screens.
const round3Objects: SceneObject[] = [
  { id: 'r3-a', type: 'circle',   color: 'red',    x: 18, y: 28, size: 48 },
  { id: 'r3-b', type: 'circle',   color: 'red',    x: 50, y: 22, size: 48 },
  { id: 'r3-c', type: 'circle',   color: 'blue',   x: 80, y: 32, size: 48 },
  { id: 'r3-d', type: 'square',   color: 'green',  x: 30, y: 72, size: 50 },
  { id: 'r3-e', type: 'triangle', color: 'orange', x: 72, y: 72, size: 52 },
];

const round3Question: Question = makeQuestion(
  'r3-q1',
  'onboarding.test.round_3_question',
  [
    'onboarding.test.round_3_option_1',
    'onboarding.test.round_3_option_2',
    'onboarding.test.round_3_option_3',
    'onboarding.test.round_3_option_4',
  ],
  'How many red circles were there?',
  ['1', '2', '3', '4'],
  1,
  'count',
  12,
);

// ─── Bundled rounds ──────────────────────────────────────────────
function makeScene(id: string, viewTime: number, objects: SceneObject[], question: Question): Scene {
  return { id, viewTime, objects, questions: [question] };
}

export const ONBOARDING_ROUNDS: readonly OnboardingRound[] = [
  {
    index: 0,
    number: 1,
    viewTime: 4,
    scene: makeScene('onb-r1', 4, round1Objects, round1Question),
    question: round1Question,
  },
  {
    index: 1,
    number: 2,
    viewTime: 3.5,
    scene: makeScene('onb-r2', 3.5, round2Objects, round2Question),
    question: round2Question,
  },
  {
    index: 2,
    number: 3,
    viewTime: 3,
    scene: makeScene('onb-r3', 3, round3Objects, round3Question),
    question: round3Question,
  },
] as const;
