/**
 * Builds the four multiple-choice questions for a Witness puzzle
 * from a filled template's slot list.
 *
 * Algorithm:
 *   1. Walk every questionable slot in the template, collecting
 *      candidate questions.
 *   2. Bucket candidates by their slot's category.
 *   3. Round-robin pick from buckets in seeded order until 4 are
 *      chosen (enforces category spread, so we never ask 4 colour
 *      questions on the same scene).
 *   4. For each picked question, build a 4-option list:
 *        correct value + 3 distractors from the slot's category,
 *        seed-shuffled. Distractors exclude every value used
 *        anywhere in the scene to kill the "is this the apron or
 *        the wall" trick-question class.
 *
 * Determinism: the function takes an RNG and never reaches outside
 * it for entropy. Same RNG state in = same questions out, every
 * time.
 */
import type { SeededRng } from '../../seededRandom';
import type { BilingualEntry } from './variableBanks';
import { getBank, type SceneTemplate, type SlotCategory, type SlotDef, type TemplateId } from './templates';

/** A picked-and-filled slot ready to be rendered into prose. The
 *  generator returns one of these per template slot. */
export interface FilledSlot {
  id: string;
  category: SlotCategory;
  /** The picked entry for this slot. The `.en` key is used as the
   *  canonical identity for dedup checks (distractor exclusion +
   *  question-pool dedup); display uses the active-locale key. */
  value: BilingualEntry;
  questionable: boolean;
  question?: { en: string; es: string };
}

/** A built question, ready to be rendered + scored. */
export interface WitnessQuestion {
  /** The slot this question is asking about. Useful for analytics
   *  and to look up the correct value when scoring. */
  slotId: string;
  /** Localised question text. */
  text: { en: string; es: string };
  /** 4 options, in display order. The locale-specific render reads
   *  `option.en` or `option.es`. */
  options: readonly BilingualEntry[];
  /** Index in `options` of the correct answer. 0-3. */
  correctIndex: number;
  /** Category the slot belongs to. Used for analytics + variety
   *  enforcement only; not displayed. */
  category: SlotCategory;
}

const QUESTIONS_PER_SCENE = 4;
const OPTIONS_PER_QUESTION = 4;

/** Pick `count` distinct questions from `slots` such that no two
 *  share the same category if possible. If the questionable-slots
 *  pool has fewer distinct categories than `count`, the last one or
 *  two questions reuse a category (rare in practice — every v1
 *  template has at least 9 distinct categories among questionable
 *  slots). */
function pickQuestionableSlots(
  slots: readonly FilledSlot[],
  rng: SeededRng,
  count: number,
): FilledSlot[] {
  const candidates = slots.filter((s) => s.questionable && s.question);
  // Bucket by category. Seeded shuffle within each bucket so two
  // slots in the same category have a deterministic but non-trivial
  // pick order.
  const byCategory = new Map<SlotCategory, FilledSlot[]>();
  for (const slot of candidates) {
    if (!byCategory.has(slot.category)) byCategory.set(slot.category, []);
    byCategory.get(slot.category)!.push(slot);
  }
  for (const [, bucket] of byCategory) {
    // shuffle each bucket in place via re-assignment so the
    // round-robin walk picks a deterministic-but-shuffled order.
    const shuffled = rng.shuffle(bucket);
    bucket.length = 0;
    for (const item of shuffled) bucket.push(item);
  }
  const categories = rng.shuffle(Array.from(byCategory.keys()));
  const picked: FilledSlot[] = [];
  // Round-robin pass: take one from each category until we have
  // `count`, then if we still don't have enough start over and take
  // a second from each (only happens when fewer distinct categories
  // exist than the target count).
  let rrPass = 0;
  while (picked.length < count) {
    let progressed = false;
    for (const cat of categories) {
      const bucket = byCategory.get(cat)!;
      if (bucket.length > rrPass) {
        picked.push(bucket[rrPass]);
        progressed = true;
        if (picked.length === count) break;
      }
    }
    if (!progressed) break; // exhausted every bucket
    rrPass++;
  }
  return picked;
}

/** Build the 4 options for a question: the correct value plus 3
 *  distractors from the same category, excluding any value used
 *  anywhere else in the scene. Distractors are picked via a seeded
 *  shuffle of the eligible pool, then the full 4-option array is
 *  seed-shuffled so the correct slot isn't always at the same
 *  index. Returns the shuffled options + the correct index inside
 *  them. */
function buildOptions(
  slot: FilledSlot,
  templateId: TemplateId,
  sceneUsedKeys: Set<string>,
  rng: SeededRng,
): { options: BilingualEntry[]; correctIndex: number } {
  const bank = getBank(slot.category, templateId);
  // Eligible distractor pool: bank minus the correct value minus
  // every other value used in the scene. Identity is keyed off
  // the .en string, which is unique per bank entry.
  const correctKey = slot.value.en;
  const eligible = bank.filter((entry) => entry.en !== correctKey && !sceneUsedKeys.has(entry.en));
  // Defensive: if the bank is too small for 3 distractors after
  // exclusions, top up from the bank ignoring the scene-used filter
  // (correct answer still excluded). Only kicks in if a future
  // bank shrinks below the required size — every v1 bank has >= 5
  // entries so 3 distractors always materialise cleanly.
  const distractorPool = eligible.length >= OPTIONS_PER_QUESTION - 1
    ? rng.shuffle(eligible)
    : rng.shuffle(bank.filter((entry) => entry.en !== correctKey));
  const distractors = distractorPool.slice(0, OPTIONS_PER_QUESTION - 1);
  const options = rng.shuffle([slot.value, ...distractors]);
  const correctIndex = options.findIndex((o) => o.en === correctKey);
  return { options, correctIndex };
}

/** Top-level: take a template + filled slots + RNG, return 4
 *  questions in display order. */
export function generateWitnessQuestions(
  template: SceneTemplate,
  filledSlots: readonly FilledSlot[],
  rng: SeededRng,
): WitnessQuestion[] {
  const sceneUsedKeys = new Set<string>(filledSlots.map((s) => s.value.en));
  const picked = pickQuestionableSlots(filledSlots, rng, QUESTIONS_PER_SCENE);
  const questions: WitnessQuestion[] = [];
  for (const slot of picked) {
    if (!slot.question) continue;
    const { options, correctIndex } = buildOptions(slot, template.id, sceneUsedKeys, rng);
    questions.push({
      slotId: slot.id,
      text: slot.question,
      options,
      correctIndex,
      category: slot.category,
    });
  }
  // The order in which questions are picked is already meaningful
  // (varied categories), but we shuffle the final question display
  // order so the same scene template doesn't always lead with the
  // same category on Thursdays.
  return rng.shuffle(questions);
}

/** Walks the template's slot list, picks a value per slot from its
 *  category bank, returns the filled slots. Slots that share a
 *  category never collide on the same value (e.g. two colour slots
 *  in the same template always pick distinct colours). */
export function fillTemplateSlots(
  template: SceneTemplate,
  rng: SeededRng,
): FilledSlot[] {
  // Track values picked per category so two slots of the same
  // category never collide. Keyed on `.en` for canonical identity.
  const usedKeysByCategory = new Map<SlotCategory, Set<string>>();
  const filled: FilledSlot[] = [];
  for (const slot of template.slots) {
    const bank = getBank(slot.category, template.id);
    const used = usedKeysByCategory.get(slot.category) ?? new Set<string>();
    const eligible = bank.filter((entry) => !used.has(entry.en));
    // Defensive: if a category bank is smaller than the number of
    // slots that share it (shouldn't happen with v1 banks), fall
    // back to the full bank. Visual collision is preferable to a
    // crash.
    const pool = eligible.length > 0 ? eligible : bank;
    const value = rng.pick(pool);
    used.add(value.en);
    usedKeysByCategory.set(slot.category, used);
    filled.push({
      id: slot.id,
      category: slot.category,
      value,
      questionable: slot.questionable,
      question: slot.question,
    });
  }
  return filled;
}

/** Render the template prose for a given locale by interpolating
 *  each slot's picked value, then capitalising sentence-starts as a
 *  defensive pass.
 *
 *  Slot values are stored lower-case (so they can drop in mid-
 *  sentence cleanly), but a template may legitimately put a slot at
 *  the start of a sentence ("{prominent_object} sits behind the
 *  counter."), and authoring slip-ups can also leave a slot at
 *  position-zero. The post-processor capitalises the very first
 *  letter of the prose plus the first letter after every sentence-
 *  ending punctuation mark, including Spanish-specific ¡¿. Returns
 *  the rendered + sentence-cased prose. */
export function renderProse(
  template: SceneTemplate,
  filledSlots: readonly FilledSlot[],
  locale: 'en' | 'es',
): string {
  const proseTemplate = template.prose[locale];
  const interpolated = filledSlots.reduce((acc, slot) => {
    const token = `{${slot.id}}`;
    // Replace every occurrence; some slots are referenced multiple
    // times in future template variants. `replaceAll` is safer than
    // a naive .replace() which only swaps the first hit.
    return acc.split(token).join(slot.value[locale]);
  }, proseTemplate);
  // Capitalise the start of every sentence + the very first
  // character. The match group covers the lead-in (start-of-string
  // or one of `. ! ? ¡ ¿` followed by whitespace) plus the next
  // letter; `toLocaleUpperCase` so accented Spanish letters lift
  // correctly (á → Á).
  return interpolated.replace(
    /(^|[.!?¡¿]\s+)([\p{Ll}])/gu,
    (_m, lead: string, ch: string) => lead + ch.toLocaleUpperCase(locale === 'es' ? 'es' : 'en'),
  );
}
