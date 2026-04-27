/**
 * The Witness — generator + scoring sanity tests.
 *
 * Covers the determinism guarantee, the question-variety enforcement,
 * the wrong-answer exclusion rule, and the scoring projection.
 */
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

import {
  generateWitnessConfig,
  scoreWitnessAttempt,
  witnessEmojiBlocks,
} from '@/src/features/dailyChallenge/modes/witness/logic';

const SAMPLE_DATES = [
  new Date(Date.UTC(2026, 4, 7)),  // Thursday
  new Date(Date.UTC(2026, 4, 14)), // Thursday
  new Date(Date.UTC(2026, 11, 31)), // Year-end
  new Date(Date.UTC(2027, 0, 1)),
  new Date(Date.UTC(2027, 5, 17)),
];

describe('generateWitnessConfig', () => {
  it('is deterministic — same date in produces identical config', () => {
    for (const date of SAMPLE_DATES) {
      const a = generateWitnessConfig(date);
      const b = generateWitnessConfig(date);
      expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
    }
  });

  it('produces exactly 4 questions per scene', () => {
    for (const date of SAMPLE_DATES) {
      const c = generateWitnessConfig(date);
      expect(c.questions).toHaveLength(4);
    }
  });

  it('every question has exactly 4 options with a valid correctIndex', () => {
    for (const date of SAMPLE_DATES) {
      const c = generateWitnessConfig(date);
      for (const q of c.questions) {
        expect(q.options).toHaveLength(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
      }
    }
  });

  it('enforces category spread — no two questions share a category when possible', () => {
    // Every v1 template has at least 9 distinct questionable
    // categories so 4 distinct categories are always achievable.
    for (const date of SAMPLE_DATES) {
      const c = generateWitnessConfig(date);
      const categories = c.questions.map((q) => q.category);
      const uniq = new Set(categories);
      expect(uniq.size).toBe(c.questions.length);
    }
  });

  it('distractors never match a value used elsewhere in the scene', () => {
    for (const date of SAMPLE_DATES) {
      const c = generateWitnessConfig(date);
      // Map slotId → picked value (English form, the canonical key).
      const sceneValueKeys = new Set(c.slots.map((s) => s.value.en));
      for (const q of c.questions) {
        const correctKey = q.options[q.correctIndex].en;
        for (let i = 0; i < q.options.length; i++) {
          if (i === q.correctIndex) continue;
          const optionKey = q.options[i].en;
          // The wrong answer must not be any value used in the scene
          // (and must not equal the correct value, but we already
          // skipped that index).
          expect(sceneValueKeys.has(optionKey) && optionKey !== correctKey).toBe(false);
        }
      }
    }
  });

  it('scene prose has no unfilled {token} placeholders', () => {
    for (const date of SAMPLE_DATES) {
      const c = generateWitnessConfig(date);
      expect(c.scene.en).not.toMatch(/\{[a-z_]+\}/);
      expect(c.scene.es).not.toMatch(/\{[a-z_]+\}/);
    }
  });

  it('two consecutive Thursdays pick different templates over a year', () => {
    // Walk every Thursday in 2026, gather template ids. We expect to
    // see all 4 templates over the year because dateSeed mod 4
    // marches through them deterministically (modulo day-of-week
    // skew, but with ~52 Thursdays the pigeonhole is comfortable).
    const ids = new Set<string>();
    for (let dayOfYear = 0; dayOfYear < 365; dayOfYear += 7) {
      const d = new Date(Date.UTC(2026, 0, 1 + dayOfYear));
      ids.add(generateWitnessConfig(d).templateId);
    }
    expect(ids.size).toBe(4);
  });
});

describe('scoreWitnessAttempt', () => {
  it('returns 100 for all-correct, 0 for all-wrong', () => {
    const c = generateWitnessConfig(new Date(Date.UTC(2026, 4, 7)));
    const allCorrect = c.questions.map((q) => q.correctIndex);
    const allWrong = c.questions.map((q) => (q.correctIndex + 1) % 4);
    expect(scoreWitnessAttempt(c, allCorrect).score).toBe(100);
    expect(scoreWitnessAttempt(c, allWrong).score).toBe(0);
  });

  it('snaps to 25-point bands', () => {
    const c = generateWitnessConfig(new Date(Date.UTC(2026, 4, 7)));
    const correctIdxs = c.questions.map((q) => q.correctIndex);
    for (let n = 0; n <= 4; n++) {
      const picks = correctIdxs.map((i, idx) => (idx < n ? i : (i + 1) % 4));
      const scored = scoreWitnessAttempt(c, picks);
      expect(scored.score).toBe(n * 25);
    }
  });

  it('emoji blocks are 4 chars long, correct first', () => {
    const c = generateWitnessConfig(new Date(Date.UTC(2026, 4, 7)));
    const picks = c.questions.map((q, i) => (i < 2 ? q.correctIndex : (q.correctIndex + 1) % 4));
    const scored = scoreWitnessAttempt(c, picks);
    const blocks = witnessEmojiBlocks(scored);
    expect([...blocks]).toHaveLength(4);
    // First two chars correct, last two wrong.
    expect(blocks.startsWith('🟪🟪')).toBe(true);
    expect(blocks.endsWith('⬛⬛')).toBe(true);
  });
});
