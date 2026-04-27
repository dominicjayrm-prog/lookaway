/**
 * Questions + reveal phases for The Witness.
 *
 * Questions phase:
 *   - One QuestionCard at a time, sequential.
 *   - Player taps an option, brief 350ms hold for visual feedback,
 *     then auto-advances to the next question.
 *   - No timer — the mode is contemplative; the brief explicitly
 *     forbids per-question countdowns.
 *
 * Reveal phase (after question 4 answered):
 *   - Walks the 4 questions left-to-right (well, top-to-bottom in
 *     time), each shown with its correct answer highlighted and
 *     the player's pick coloured correct/wrong.
 *   - ~1500ms per question, 1200ms hold at the end, then fires
 *     onComplete with the scored result.
 *   - Mirrors NamesAndFaces' reveal pacing so the daily challenge
 *     feels coherent across modes.
 *
 * Time tracking: from view mount (= continue tap on the read
 * screen) to first reveal step. Used for tiebreakers; not displayed
 * prominently.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { QuestionCard } from '@/src/components/QuestionCard';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import {
  scoreWitnessAttempt,
  witnessEmojiBlocks,
  activeWitnessLocale,
  type WitnessConfig,
} from './logic';

interface Props {
  config: WitnessConfig;
  onComplete: (result: {
    score: number;
    timeSeconds: number;
    correctness: boolean[];
    emojiBlocks: string;
  }) => void;
}

const isWeb = Platform.OS === 'web';
const ADVANCE_AFTER_TAP_MS = 350;
const REVEAL_PER_QUESTION_MS = 1500;
const REVEAL_HOLD_MS = 1200;

type Phase = 'questions' | 'reveal';

export function WitnessQuestionsView({ config, onComplete }: Props) {
  const { colors } = useTheme();
  const startedAt = useRef<number>(Date.now());
  const locale = activeWitnessLocale();

  const total = config.questions.length;
  const [phase, setPhase] = useState<Phase>('questions');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selections, setSelections] = useState<(number | undefined)[]>(() => Array(total).fill(undefined));
  const [revealStep, setRevealStep] = useState(0);

  const handleSelect = useCallback((optionIdx: number) => {
    if (phase !== 'questions') return;
    if (selections[currentIdx] !== undefined) return; // already answered, ignore
    if (!isWeb) {
      const correct = optionIdx === config.questions[currentIdx].correctIndex;
      Haptics.impactAsync(
        correct ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => {});
    }
    setSelections((prev) => {
      const next = [...prev];
      next[currentIdx] = optionIdx;
      return next;
    });
  }, [phase, selections, currentIdx, config.questions]);

  // Auto-advance after a brief feedback hold. Splitting this from
  // handleSelect into an effect keeps the state update + the
  // advance decoupled — easier to reason about, and the player
  // sees the selection register before the next question slides in.
  useEffect(() => {
    if (phase !== 'questions') return;
    if (selections[currentIdx] === undefined) return;
    const id = setTimeout(() => {
      if (currentIdx < total - 1) {
        setCurrentIdx((n) => n + 1);
      } else {
        // Final question answered → kick off reveal walkthrough.
        setPhase('reveal');
      }
    }, ADVANCE_AFTER_TAP_MS);
    return () => clearTimeout(id);
  }, [phase, selections, currentIdx, total]);

  // Reveal walkthrough: bumps revealStep through each question, then
  // holds and fires onComplete with the scored result.
  useEffect(() => {
    if (phase !== 'reveal') return;
    if (revealStep >= total) {
      const scored = scoreWitnessAttempt(config, selections);
      const finalize = setTimeout(() => {
        onComplete({
          score: scored.score,
          timeSeconds: +((Date.now() - startedAt.current) / 1000).toFixed(2),
          correctness: scored.correctness,
          emojiBlocks: witnessEmojiBlocks(scored),
        });
      }, REVEAL_HOLD_MS);
      return () => clearTimeout(finalize);
    }
    const id = setTimeout(() => {
      const correct = selections[revealStep] === config.questions[revealStep].correctIndex;
      if (!isWeb) {
        Haptics.notificationAsync(
          correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }
      setRevealStep((n) => n + 1);
    }, REVEAL_PER_QUESTION_MS);
    return () => clearTimeout(id);
  }, [phase, revealStep, total, config, selections, onComplete]);

  // Which question is currently on screen. During the questions
  // phase this is `currentIdx`; during reveal it walks via
  // `revealStep` so the player sees each one revealed in order.
  const onScreenIdx = phase === 'reveal' ? Math.min(revealStep, total - 1) : currentIdx;
  const onScreenQuestion = config.questions[onScreenIdx];
  const onScreenSelected = selections[onScreenIdx] ?? null;
  const onScreenRevealed = phase === 'reveal' ? onScreenQuestion.correctIndex : null;

  const optionStrings = useMemo(
    () => onScreenQuestion.options.map((o) => o[locale]),
    [onScreenQuestion, locale],
  );
  const questionText = useMemo(
    () => onScreenQuestion.text[locale],
    [onScreenQuestion, locale],
  );

  return (
    <View style={s.root}>
      <Text style={[s.caption, { color: colors.textMid }]}>
        {phase === 'questions'
          ? t('daily_challenge.the_witness.questions_progress', {
              current: currentIdx + 1,
              total,
            })
          : t('daily_challenge.the_witness.reveal_caption')}
      </Text>

      <QuestionCard
        questionText={questionText}
        options={optionStrings}
        selectedIndex={onScreenSelected}
        revealedCorrectIndex={onScreenRevealed}
        onSelect={handleSelect}
        questionNumber={onScreenIdx + 1}
        totalQuestions={total}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, paddingTop: 12, gap: 14 },
  caption: {
    fontSize: 13, fontWeight: '700', letterSpacing: 0.4,
    textTransform: 'uppercase', textAlign: 'center',
  },
});
