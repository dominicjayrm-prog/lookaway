/**
 * Recall + reveal phases.
 *
 * Recall:
 *   - Grid reappears with the changes applied (modified cells).
 *   - Player taps cells they think changed.
 *   - Tapping again toggles selection off.
 *   - When the tap count equals the expected number of changes, a
 *     Submit button appears below the grid (NOT auto-submit per
 *     the spec — the player gets a beat to reconsider).
 *   - Player can also Submit early; unanswered cells count as misses.
 *
 * Reveal (after submit):
 *   - Each tapped cell is evaluated one-by-one:
 *       correct (was a change): purple ring pulse + success haptic
 *       incorrect (wasn't a change): soft red shake + error haptic
 *   - After all tapped cells, missed changes highlight in muted gold
 *     so the player sees what they missed (no penalty beyond the
 *     lost point).
 *   - When the reveal sequence finishes, parent's onComplete fires
 *     with score + correctness data.
 *
 * Time tracking: from view mount (= end of memorise phase) to
 * submission. Used for tiebreakers, not displayed prominently.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated as RNAnimated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import { Grid } from './WhatChangedMemoriseView';
import { scoreWhatChangedAttempt, whatChangedEmojiBlocks, type WhatChangedConfig } from './logic';

interface Props {
  config: WhatChangedConfig;
  onComplete: (result: {
    score: number;
    timeSeconds: number;
    correctIndexes: number[];
    incorrectIndexes: number[];
    missedIndexes: number[];
    emojiBlocks: string;
  }) => void;
}

const isWeb = Platform.OS === 'web';
const REVEAL_PER_CELL_MS = 320;
const REVEAL_HOLD_MS = 1200;

type Phase = 'recall' | 'reveal';

export function WhatChangedRecallView({ config, onComplete }: Props) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>('recall');
  const [tapped, setTapped] = useState<number[]>([]);
  const [revealStep, setRevealStep] = useState(0);
  const startedAt = useRef<number>(Date.now());

  const tappedSet = useMemo(() => new Set(tapped), [tapped]);
  const scored = useMemo(() => {
    if (phase !== 'reveal') return null;
    return scoreWhatChangedAttempt(config, tapped);
  }, [phase, config, tapped]);

  const handleCellPress = useCallback((idx: number) => {
    setTapped((prev) => {
      if (prev.includes(idx)) {
        // Toggle off
        return prev.filter((i) => i !== idx);
      }
      return [...prev, idx];
    });
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const handleSubmit = useCallback(() => {
    if (phase === 'reveal') return;
    setPhase('reveal');
  }, [phase]);

  // Per-cell reveal walk. Steps through tapped cells first, then
  // jumps to "show missed" + completes.
  useEffect(() => {
    if (phase !== 'reveal' || !scored) return;
    const totalSteps = tapped.length + 1; // +1 final hold for missed cells
    if (revealStep >= totalSteps) {
      const finalize = setTimeout(() => {
        onComplete({
          score: scored.score,
          timeSeconds: +((Date.now() - startedAt.current) / 1000).toFixed(2),
          correctIndexes: tapped.filter((i) => config.changedIndexes.includes(i)),
          incorrectIndexes: scored.incorrectTaps,
          missedIndexes: scored.missedChanges,
          emojiBlocks: whatChangedEmojiBlocks(scored),
        });
      }, REVEAL_HOLD_MS);
      return () => clearTimeout(finalize);
    }
    const id = setTimeout(() => {
      // Haptic pulse keyed to the cell being revealed at this step.
      if (revealStep < tapped.length) {
        const cellIdx = tapped[revealStep];
        const isCorrect = config.changedIndexes.includes(cellIdx);
        if (!isWeb) {
          Haptics.notificationAsync(
            isCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
          ).catch(() => {});
        }
      }
      setRevealStep((n) => n + 1);
    }, REVEAL_PER_CELL_MS);
    return () => clearTimeout(id);
  }, [phase, scored, revealStep, tapped, config.changedIndexes, onComplete]);

  // Per-cell visual overlay used during the reveal phase. Three
  // states (correct / incorrect / missed) plus a blank during recall.
  // Each state uses a distinct shape AND animation, not just colour,
  // for colour-blind safety per spec 3.6.
  const cellOverlay = useCallback((cellIdx: number): React.ReactNode => {
    if (phase !== 'reveal') return null;
    const isTapped = tappedSet.has(cellIdx);
    const isChanged = config.changedIndexes.includes(cellIdx);
    // Don't surface verdicts past the current reveal step — keeps
    // the per-cell sequential feel.
    const tappedRevealOrder = tapped.indexOf(cellIdx);
    const tappedRevealedYet = isTapped && tappedRevealOrder >= 0 && tappedRevealOrder < revealStep;
    const missedRevealedYet = !isTapped && isChanged && revealStep >= tapped.length;
    if (tappedRevealedYet) {
      return (
        <View
          pointerEvents="none"
          style={[
            cellStyles.overlay,
            {
              borderColor: isChanged ? colors.accent : colors.wrong,
              borderWidth: 3,
              backgroundColor: isChanged ? colors.accent + '20' : colors.wrong + '20',
            },
          ]}
        >
          <Text style={[cellStyles.badge, { color: isChanged ? colors.accent : colors.wrong }]}>
            {isChanged ? '✓' : '✕'}
          </Text>
        </View>
      );
    }
    if (missedRevealedYet) {
      return (
        <View
          pointerEvents="none"
          style={[
            cellStyles.overlay,
            {
              borderColor: colors.gold,
              borderWidth: 2,
              borderStyle: 'dashed',
            },
          ]}
        >
          <Text style={[cellStyles.badge, { color: colors.gold }]}>!</Text>
        </View>
      );
    }
    return null;
  }, [phase, tappedSet, tapped, revealStep, config.changedIndexes, colors]);

  const canSubmit = phase === 'recall' && tapped.length > 0;

  return (
    <View style={s.root}>
      <Text style={[s.instruction, { color: colors.textMid }]}>
        {phase === 'recall'
          ? t('daily_challenge.what_changed.recall_instruction', { count: config.numChanges })
          : t('daily_challenge.what_changed.reveal_instruction')}
      </Text>
      <Grid
        config={config}
        cells={config.modified}
        tappedSet={tappedSet}
        onCellPress={phase === 'recall' ? handleCellPress : undefined}
        cellOverlay={cellOverlay}
      />
      {phase === 'recall' && (
        <View style={s.tapCounter}>
          <Text style={[s.tapCounterText, { color: colors.textMid }]}>
            {t('daily_challenge.what_changed.tapped_count', { tapped: tapped.length, total: config.numChanges })}
          </Text>
        </View>
      )}
      {phase === 'recall' && (
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            s.submitBtn,
            { backgroundColor: canSubmit ? colors.accent : colors.surface },
            pressed && canSubmit && { opacity: 0.92, transform: [{ scale: 0.97 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('daily_challenge.what_changed.submit_aria')}
        >
          <Text style={[s.submitText, { color: canSubmit ? '#FFFFFF' : colors.textLight }]}>
            {t('daily_challenge.what_changed.submit')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 16 },
  instruction: { fontSize: 14, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', textAlign: 'center' },
  tapCounter: { marginTop: -4 },
  tapCounterText: { fontSize: 13, fontWeight: '700' },
  submitBtn: {
    width: '100%', maxWidth: 320,
    paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C5CE7', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    elevation: 3,
  },
  submitText: { fontSize: 16, fontWeight: '800' },
});

const cellStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: { fontSize: 28, fontWeight: '900' },
});
