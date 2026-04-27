/**
 * Recall + reveal phases.
 *
 * Recall:
 *   - Blinks reappear in `recallOrder` (shuffled vs. memorise),
 *     no name labels.
 *   - Name chips for the puzzle's names appear in a wrap row
 *     beneath. Player taps a Blink to select it (purple ring +
 *     scale-up + soft pulse), then taps a chip to pair them.
 *   - Tapping a paired Blink unpairs it (the name returns to the
 *     chip row).
 *   - Tapping a different Blink while one is selected: first
 *     un-selects, new one selects.
 *   - Submit appears once all Blinks are paired (greyed out
 *     otherwise).
 *
 * Reveal (after submit):
 *   - Walks recall slots left-to-right (so the eye follows in
 *     reading order). Each step, ~400ms apart, evaluates the pair:
 *       correct: green ring + ✓ overlay + success haptic
 *       wrong:   coral ring + ✕ overlay + the actual correct name
 *                fades in beneath in muted gold (matches
 *                Phone Number's reveal pattern — the "right
 *                answer" is shown so the player learns)
 *   - After the last cell evaluates, holds for ~1200ms then fires
 *     onComplete.
 *
 * Time tracking: from view mount (= end of mingle) to submit. Used
 * for tiebreakers, never displayed prominently.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated as RNAnimated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Blink } from '@/src/components/Blink';
import { AvatarFrame } from '@/src/components/AvatarFrame';
import { getFrameById } from '@/src/data/cosmetics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import {
  scoreNamesAndFacesAttempt,
  namesAndFacesEmojiBlocks,
  type NamesAndFacesConfig,
} from './logic';

interface Props {
  config: NamesAndFacesConfig;
  onComplete: (result: {
    score: number;
    timeSeconds: number;
    correctness: boolean[];
    pairedNameByCharIdx: (string | undefined)[];
    emojiBlocks: string;
  }) => void;
}

const isWeb = Platform.OS === 'web';
const BLINK_SIZE = 80;
const REVEAL_PER_PAIR_MS = 400;
const REVEAL_HOLD_MS = 1200;

type Phase = 'recall' | 'reveal';

export function NamesAndFacesRecallView({ config, onComplete }: Props) {
  const { colors } = useTheme();
  const startedAt = useRef<number>(Date.now());
  const [phase, setPhase] = useState<Phase>('recall');
  /** charIdx → name. charIdx is the original (memorise-order) index
   *  of the character; the value is the name the player paired to
   *  it. Missing entry = unpaired. Keys are stringified char idx
   *  for trivial JSON serialisation. */
  const [pairings, setPairings] = useState<Record<number, string>>({});
  const [selectedCharIdx, setSelectedCharIdx] = useState<number | null>(null);
  const [revealStep, setRevealStep] = useState(0);

  // Pulsing ring animation for the selected Blink. Loops while
  // something is selected; resets to 0 (no pulse) when nothing is.
  const selectionPulse = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (selectedCharIdx === null) {
      selectionPulse.setValue(0);
      return;
    }
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(selectionPulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        RNAnimated.timing(selectionPulse, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [selectedCharIdx, selectionPulse]);

  const allNames = useMemo(() => config.characters.map((c) => c.name), [config]);
  const usedNames = useMemo(() => new Set(Object.values(pairings)), [pairings]);
  const availableChips = useMemo(
    () => allNames.filter((n) => !usedNames.has(n)),
    [allNames, usedNames],
  );
  const pairedCount = Object.keys(pairings).length;
  const allPaired = pairedCount === config.numCharacters;

  const handleBlinkTap = useCallback((charIdx: number) => {
    if (phase !== 'recall') return;
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // Already paired → unpair (return name to chip row).
    if (pairings[charIdx]) {
      setPairings((prev) => {
        const next = { ...prev };
        delete next[charIdx];
        return next;
      });
      setSelectedCharIdx(null);
      return;
    }
    // Tapping the already-selected one un-selects.
    if (selectedCharIdx === charIdx) {
      setSelectedCharIdx(null);
      return;
    }
    // Otherwise select this one (replaces any previous selection).
    setSelectedCharIdx(charIdx);
  }, [phase, pairings, selectedCharIdx]);

  const handleChipTap = useCallback((name: string) => {
    if (phase !== 'recall') return;
    if (selectedCharIdx === null) return;
    if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPairings((prev) => ({ ...prev, [selectedCharIdx]: name }));
    setSelectedCharIdx(null);
  }, [phase, selectedCharIdx]);

  const handleSubmit = useCallback(() => {
    if (!allPaired || phase === 'reveal') return;
    setPhase('reveal');
  }, [allPaired, phase]);

  // Walk the reveal animation through each recall slot in display
  // order (left-to-right reading sequence). Each step evaluates
  // one pair and bumps `revealStep`. After the final step we hold
  // briefly then fire onComplete with the scored result.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const total = config.numCharacters;
    if (revealStep >= total) {
      const pairedArr: (string | undefined)[] = [];
      for (let i = 0; i < total; i++) pairedArr[i] = pairings[i];
      const scored = scoreNamesAndFacesAttempt(config, pairedArr);
      const finalize = setTimeout(() => {
        onComplete({
          score: scored.score,
          timeSeconds: +((Date.now() - startedAt.current) / 1000).toFixed(2),
          correctness: scored.correctness,
          pairedNameByCharIdx: pairedArr,
          emojiBlocks: namesAndFacesEmojiBlocks(scored),
        });
      }, REVEAL_HOLD_MS);
      return () => clearTimeout(finalize);
    }
    const id = setTimeout(() => {
      // Haptic keyed to whether THIS step's pair was correct.
      const charIdx = config.recallOrder[revealStep];
      const expected = config.characters[charIdx].name;
      const paired = pairings[charIdx];
      const correct = !!paired && paired === expected;
      if (!isWeb) {
        Haptics.notificationAsync(
          correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }
      setRevealStep((n) => n + 1);
    }, REVEAL_PER_PAIR_MS);
    return () => clearTimeout(id);
  }, [phase, revealStep, config, pairings, onComplete]);

  // Per-cell overlay during reveal phase — green ✓ for correct,
  // coral ✕ for wrong. Plus a "correct name" caption beneath
  // wrong answers in muted gold. Returns null during recall.
  const cellOverlay = useCallback((slotIdx: number) => {
    if (phase !== 'reveal') return null;
    if (slotIdx >= revealStep) return null;
    const charIdx = config.recallOrder[slotIdx];
    const expected = config.characters[charIdx].name;
    const paired = pairings[charIdx];
    const correct = !!paired && paired === expected;
    return (
      <View pointerEvents="none" style={s.revealOverlay}>
        <View
          style={[
            s.revealRing,
            {
              borderColor: correct ? colors.correct : colors.wrong,
              backgroundColor: correct ? colors.correct + '22' : colors.wrong + '22',
            },
          ]}
        />
        <Text style={[s.revealBadge, { color: correct ? colors.correct : colors.wrong }]}>
          {correct ? '✓' : '✕'}
        </Text>
        {!correct && (
          <Text style={[s.revealCorrectName, { color: colors.gold }]} numberOfLines={1}>
            {expected}
          </Text>
        )}
      </View>
    );
  }, [phase, revealStep, config, pairings, colors]);

  const cols = config.numCharacters >= 5 ? 3 : 2;
  const rows: number[][] = [];
  for (let r = 0; r * cols < config.numCharacters; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols && r * cols + c < config.numCharacters; c++) {
      row.push(r * cols + c);
    }
    rows.push(row);
  }

  return (
    <View style={s.root}>
      <Text style={[s.instruction, { color: colors.textMid }]}>
        {phase === 'recall'
          ? t('daily_challenge.names_and_faces.recall_instruction')
          : t('daily_challenge.names_and_faces.reveal_instruction')}
      </Text>

      {/* Blink grid in recallOrder */}
      <View style={s.gridWrap}>
        {rows.map((row, ri) => (
          <View key={ri} style={s.gridRow}>
            {row.map((slotIdx) => {
              const charIdx = config.recallOrder[slotIdx];
              const character = config.characters[charIdx];
              const frame = getFrameById(character.frame.id) ?? null;
              const isSelected = selectedCharIdx === charIdx;
              const pairedName = pairings[charIdx];
              const ringStyle = isSelected
                ? {
                    opacity: selectionPulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }),
                    borderColor: colors.accent,
                  }
                : pairedName
                  ? { opacity: 1, borderColor: colors.accent }
                  : null;
              return (
                <Pressable
                  key={slotIdx}
                  onPress={() => handleBlinkTap(charIdx)}
                  disabled={phase === 'reveal'}
                  style={({ pressed }) => [
                    s.cell,
                    pressed && phase === 'recall' && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                    isSelected && { transform: [{ scale: 1.05 }] },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('daily_challenge.names_and_faces.select_blink_aria', {
                    name: pairedName ?? character.name,
                    state: pairedName
                      ? t('daily_challenge.names_and_faces.select_blink_state_paired', { name: pairedName })
                      : isSelected
                        ? t('daily_challenge.names_and_faces.select_blink_state_selected')
                        : t('daily_challenge.names_and_faces.select_blink_state_unselected'),
                  })}
                >
                  <View style={s.cellInner}>
                    <AvatarFrame frame={frame} size={BLINK_SIZE}>
                      <Blink expression={character.expression} size={BLINK_SIZE} />
                    </AvatarFrame>
                    {ringStyle && phase === 'recall' && (
                      <RNAnimated.View
                        pointerEvents="none"
                        style={[
                          s.selectionRing,
                          { borderColor: colors.accent },
                          ringStyle,
                        ]}
                      />
                    )}
                    {cellOverlay(slotIdx)}
                  </View>
                  {/* Paired name label slots in under the Blink so
                      the player can read back what they've matched
                      at a glance. */}
                  <Text
                    style={[
                      s.pairLabel,
                      { color: pairedName ? colors.text : colors.textLight },
                    ]}
                    numberOfLines={1}
                  >
                    {pairedName ?? '—'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {phase === 'recall' && (
        <View style={s.chipRow}>
          {availableChips.map((name) => {
            const isPairable = selectedCharIdx !== null;
            return (
              <Pressable
                key={name}
                onPress={() => handleChipTap(name)}
                disabled={!isPairable}
                style={({ pressed }) => [
                  s.chip,
                  {
                    backgroundColor: isPairable ? colors.card : colors.surface,
                    borderColor: isPairable ? colors.accent : colors.border,
                  },
                  pressed && isPairable && { opacity: 0.85, transform: [{ scale: 0.96 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('daily_challenge.names_and_faces.name_chip_aria', { name })}
              >
                <Text
                  style={[
                    s.chipText,
                    { color: isPairable ? colors.text : colors.textMid },
                  ]}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {phase === 'recall' && (
        <View style={s.bottomBar}>
          <Text style={[s.pairCounter, { color: colors.textMid }]}>
            {t('daily_challenge.names_and_faces.paired_count', { paired: pairedCount, total: config.numCharacters })}
          </Text>
          <Pressable
            onPress={handleSubmit}
            disabled={!allPaired}
            style={({ pressed }) => [
              s.submitBtn,
              { backgroundColor: allPaired ? colors.accent : colors.surface },
              pressed && allPaired && { opacity: 0.92, transform: [{ scale: 0.97 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('daily_challenge.names_and_faces.submit_aria')}
          >
            <Text style={[s.submitText, { color: allPaired ? '#FFFFFF' : colors.textLight }]}>
              {t('daily_challenge.names_and_faces.submit')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 16, paddingHorizontal: 16, paddingTop: 8 },
  instruction: { fontSize: 14, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', textAlign: 'center' },
  gridWrap: { gap: 18, alignItems: 'center', marginTop: 6 },
  gridRow: { flexDirection: 'row', gap: 18 },
  cell: { width: 100, alignItems: 'center', gap: 6 },
  cellInner: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  selectionRing: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 999, borderWidth: 3,
  },
  pairLabel: { fontSize: 12, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12, paddingHorizontal: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 999, borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  bottomBar: { width: '100%', maxWidth: 320, alignItems: 'center', gap: 8, marginTop: 'auto', marginBottom: 8 },
  pairCounter: { fontSize: 12, fontWeight: '700' },
  submitBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C5CE7', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    elevation: 3,
  },
  submitText: { fontSize: 16, fontWeight: '800' },
  // Reveal overlays — sit on top of the Blink + frame, full bleed.
  revealOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  revealRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999, borderWidth: 3,
  },
  revealBadge: { fontSize: 36, fontWeight: '900' },
  revealCorrectName: {
    position: 'absolute', bottom: -22,
    fontSize: 12, fontWeight: '800', letterSpacing: 0.3,
  },
});
