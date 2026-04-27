/**
 * The Witness — pure logic.
 *
 * Player reads a short atmospheric scene (~95-110 words EN, ~95-110
 * ES) at their own pace, then answers 4 multiple-choice questions
 * about what they remember. No timer on questions; the read view
 * shows a soft 35-second progress bar but does not cut off.
 *
 * Generation is deterministic from the date seed XOR'd with a
 * per-mode salt so this mode's RNG sequence is decorrelated from
 * the other modes' sequences on the same date.
 *
 * The mode plays Thursdays only in the Phase 5 rotation, so each of
 * the 4 launch templates repeats roughly once a month — a tradeoff
 * accepted to prioritise prose quality over template count at
 * launch.
 */
import { getCurrentLocale } from '@/src/i18n';
import { createSeededRng, dateToSeed, todayUtcIso, type SeededRng } from '../../seededRandom';
import { getModeDisplayName, getModeRevealSubtitle } from '../../modeRotation';
import type { DailyChallengeInstance } from '../../types';
import { TEMPLATES, type SceneTemplate } from './templates';
import {
  fillTemplateSlots,
  generateWitnessQuestions,
  renderProse,
  type FilledSlot,
  type WitnessQuestion,
} from './questionGenerator';

export type Locale = 'en' | 'es';

export interface WitnessConfig {
  /** Recommended reading time in seconds. Soft, not enforced. v1
   *  uses 35 across all templates so the read pace stays
   *  consistent. */
  recommendedReadSeconds: number;
  /** Stable id of the picked template (for analytics). */
  templateId: SceneTemplate['id'];
  /** Localised scene title (rendered as the eyebrow above the
   *  prose). */
  title: { en: string; es: string };
  /** Localised scene prose with all slot values interpolated.
   *  Player sees this verbatim during the read phase. */
  scene: { en: string; es: string };
  /** Filled slots in template order. The questions array references
   *  these by slotId; held alongside for analytics + share card
   *  snippet rendering. */
  slots: readonly FilledSlot[];
  /** The 4 questions in display order. */
  questions: readonly WitnessQuestion[];
}

const DEFAULT_READ_SECONDS = 35;

export function generateWitnessConfig(date: Date = new Date()): WitnessConfig {
  const seed = dateToSeed(date);
  // Per-mode salt to decorrelate from phone_number, what_changed,
  // and names_and_faces RNG sequences on the same date. The
  // constant is just a memorable hex tag with no semantic meaning
  // ("WITNESS"-ish 4 bytes).
  const rng: SeededRng = createSeededRng(seed ^ 0x57_17_7E_55);

  const templateIdx = rng.intInclusive(0, TEMPLATES.length - 1);
  const template = TEMPLATES[templateIdx];

  const slots = fillTemplateSlots(template, rng);
  const questions = generateWitnessQuestions(template, slots, rng);
  const sceneEn = renderProse(template, slots, 'en');
  const sceneEs = renderProse(template, slots, 'es');

  return {
    recommendedReadSeconds: DEFAULT_READ_SECONDS,
    templateId: template.id,
    title: template.title,
    scene: { en: sceneEn, es: sceneEs },
    slots,
    questions,
  };
}

export function buildWitnessInstance(date: Date = new Date()): DailyChallengeInstance<WitnessConfig> {
  return {
    mode: 'the_witness',
    challengeDate: todayUtcIso(date),
    config: generateWitnessConfig(date),
    reveal: {
      title: getModeDisplayName('the_witness'),
      subtitle: getModeRevealSubtitle('the_witness'),
      // 'detective' Blink reads as "you're the witness, observe
      // carefully", matching the mode's investigative framing.
      blinkExpression: 'detective',
    },
  };
}

// ─── Scoring ────────────────────────────────────────────────────

export interface WitnessScored {
  score: number;
  /** Per-question correctness in display order. true = correct. */
  correctness: boolean[];
  correctCount: number;
  totalCount: number;
}

/** `selectedIndexByQuestion[i]` is the option index the player
 *  picked for question i. undefined = unanswered (counts wrong;
 *  shouldn't happen because the questions view gates submit on
 *  all answered). */
export function scoreWitnessAttempt(
  config: WitnessConfig,
  selectedIndexByQuestion: readonly (number | undefined)[],
): WitnessScored {
  const total = config.questions.length;
  const correctness: boolean[] = [];
  let correctCount = 0;
  for (let i = 0; i < total; i++) {
    const selected = selectedIndexByQuestion[i];
    const correct = typeof selected === 'number' && selected === config.questions[i].correctIndex;
    correctness.push(correct);
    if (correct) correctCount++;
  }
  // 4 questions → score steps of 25 (0/25/50/75/100). Guard against
  // a future template count change; division by max(1) avoids NaN.
  const score = Math.round((correctCount / Math.max(1, total)) * 100);
  return {
    score: Math.max(0, Math.min(100, score)),
    correctness,
    correctCount,
    totalCount: total,
  };
}

/** Share card emoji blocks: 🟪 correct + ⬛ wrong, one per question.
 *  Correct first (consistent with the other three modes). */
export function witnessEmojiBlocks(scored: WitnessScored): string {
  return '🟪'.repeat(scored.correctCount) + '⬛'.repeat(scored.totalCount - scored.correctCount);
}

/** Re-export the shared locale getter under the local name views in
 *  this module already import. Same behaviour, single source of
 *  truth in `@/src/i18n`. */
export const activeWitnessLocale: () => Locale = getCurrentLocale;
