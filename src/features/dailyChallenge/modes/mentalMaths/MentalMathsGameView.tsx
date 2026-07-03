/**
 * Mental Tally — the whole three-round game in one self-managing
 * view. Unlike the other daily modes, memorise and recall interleave
 * three times (sequence → entry → feedback, per round), so instead
 * of splitting across the container's memorise/recall phases this
 * view owns the full loop and reports once at the end. The container
 * mounts it for its 'memorise' phase and skips 'recall' entirely
 * (same spirit as The Witness owning its own read→questions flow).
 *
 * Internal phases per round:
 *   'sequence' — numbers flash one at a time on the big card. Each
 *                appearance gets a pop-in scale + a soft tick haptic;
 *                progress dots under the card show sequence position.
 *   'entry'    — keypad + total slots. Explicit submit (totals vary
 *                in digit count, so no auto-submit).
 *   'feedback' — the truth: entered vs target, tier-coloured, with
 *                the full sum spelled out so the player LEARNS
 *                ("4 + 9 − 3 = 10"). Auto-advances.
 *
 * Timing for the tiebreaker clock runs from first mount to final
 * submission, matching how the other modes measure.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import { sounds } from '@/src/lib/sounds';
import { PhoneNumberKeypad } from '../phoneNumber/PhoneNumberKeypad';
import {
  scoreRound,
  totalScore,
  mentalMathsEmojiBlocks,
  type MentalMathsConfig,
  type RoundOutcome,
} from './logic';

interface Props {
  config: MentalMathsConfig;
  onComplete: (result: {
    score: number;
    timeSeconds: number;
    outcomes: RoundOutcome[];
    emojiBlocks: string;
  }) => void;
}

const isWeb = Platform.OS === 'web';
const GAP_BETWEEN_NUMBERS_MS = 350;
const FEEDBACK_HOLD_MS = 2100;
const MAX_ENTRY_DIGITS = 3;

type RoundPhase = 'sequence' | 'entry' | 'feedback';

/** Render a value the way the player saw it: negatives with a real
 *  minus sign, space-padded so "− 4" reads as an operation. */
function displayValue(v: number): string {
  return v < 0 ? `− ${Math.abs(v)}` : `${v}`;
}

export function MentalMathsGameView({ config, onComplete }: Props) {
  const { colors } = useTheme();
  const [roundIdx, setRoundIdx] = useState<0 | 1 | 2>(0);
  const [phase, setPhase] = useState<RoundPhase>('sequence');
  // Index of the number currently on screen during 'sequence';
  // -1 = brief blank beat before the first number pops in.
  const [seqIdx, setSeqIdx] = useState(-1);
  const [entry, setEntry] = useState<number[]>([]);
  const [outcomes, setOutcomes] = useState<RoundOutcome[]>([]);
  const startedAt = useRef(Date.now());
  const pop = useRef(new RNAnimated.Value(0)).current;

  const round = config.rounds[roundIdx];

  // ── Sequence driver ──
  useEffect(() => {
    if (phase !== 'sequence') return;
    if (seqIdx >= round.values.length) {
      // Sequence finished — small beat, then entry.
      const id = setTimeout(() => setPhase('entry'), 420);
      return () => clearTimeout(id);
    }
    if (seqIdx >= 0) {
      // Pop the current number in.
      pop.setValue(0.6);
      RNAnimated.spring(pop, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
      if (!isWeb) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      sounds.play('tap');
    }
    const id = setTimeout(
      () => setSeqIdx((i) => i + 1),
      seqIdx === -1 ? 500 : round.msPerNumber + GAP_BETWEEN_NUMBERS_MS,
    );
    return () => clearTimeout(id);
  }, [phase, seqIdx, round, pop]);

  // ── Entry handlers ──
  const handleDigit = useCallback((d: number) => {
    setEntry((prev) => (prev.length >= MAX_ENTRY_DIGITS ? prev : [...prev, d]));
  }, []);
  const handleBackspace = useCallback(() => {
    setEntry((prev) => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (entry.length === 0) return;
    const entered = parseInt(entry.join(''), 10);
    const outcome = scoreRound(round.target, entered, roundIdx);
    setOutcomes((prev) => [...prev, outcome]);
    if (!isWeb) {
      Haptics.notificationAsync(
        outcome.tier === 'exact'
          ? Haptics.NotificationFeedbackType.Success
          : outcome.tier === 'miss'
            ? Haptics.NotificationFeedbackType.Error
            : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    }
    sounds.play(outcome.tier === 'exact' ? 'correct' : outcome.tier === 'miss' ? 'wrong' : 'tap');
    setPhase('feedback');
  }, [entry, round.target, roundIdx]);

  // ── Feedback → next round / finish ──
  useEffect(() => {
    if (phase !== 'feedback') return;
    const id = setTimeout(() => {
      if (roundIdx < 2) {
        setRoundIdx((r) => (r + 1) as 0 | 1 | 2);
        setSeqIdx(-1);
        setEntry([]);
        setPhase('sequence');
      } else {
        const elapsed = (Date.now() - startedAt.current) / 1000;
        onComplete({
          score: totalScore(outcomes),
          timeSeconds: +elapsed.toFixed(2),
          outcomes,
          emojiBlocks: mentalMathsEmojiBlocks(outcomes),
        });
      }
    }, FEEDBACK_HOLD_MS);
    return () => clearTimeout(id);
  }, [phase, roundIdx, outcomes, onComplete]);

  const lastOutcome = outcomes[outcomes.length - 1];
  const tierColor = (tier: RoundOutcome['tier']) =>
    tier === 'exact' ? colors.correct : tier === 'miss' ? colors.wrong : colors.gold;

  const currentValue = phase === 'sequence' && seqIdx >= 0 && seqIdx < round.values.length
    ? round.values[seqIdx]
    : null;

  return (
    <View style={s.root}>
      {/* Round header — always visible so the player knows where
          they are in the three-round arc. */}
      <View style={s.roundHeader}>
        <Text style={[s.roundLabel, { color: colors.textMid }]}>
          {t('daily_challenge.mental_maths.round_label', { current: roundIdx + 1, total: 3 })}
        </Text>
        <View style={s.roundDots}>
          {[0, 1, 2].map((i) => {
            const done = outcomes[i];
            return (
              <View
                key={i}
                style={[
                  s.roundDot,
                  {
                    backgroundColor: done
                      ? tierColor(done.tier)
                      : i === roundIdx
                        ? colors.accent
                        : colors.border,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {phase === 'sequence' && (
        <View style={s.stage}>
          <Text style={[s.instruction, { color: colors.textMid }]}>
            {t('daily_challenge.mental_maths.sequence_instruction')}
          </Text>
          <View style={[s.numberCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {currentValue !== null ? (
              <RNAnimated.Text
                // Key remount per index so the pop animation replays
                // even when consecutive values render similarly.
                key={seqIdx}
                style={[
                  s.bigNumber,
                  { color: currentValue < 0 ? colors.wrong : colors.text, transform: [{ scale: pop }] },
                ]}
              >
                {displayValue(currentValue)}
              </RNAnimated.Text>
            ) : (
              <Text style={[s.bigNumberGhost, { color: colors.textLight }]}>
                {seqIdx === -1 ? t('daily_challenge.mental_maths.get_ready') : ''}
              </Text>
            )}
          </View>
          <View style={s.seqDots}>
            {round.values.map((_, i) => (
              <View
                key={i}
                style={[
                  s.seqDot,
                  { backgroundColor: i <= seqIdx ? colors.accent : colors.border },
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {phase === 'entry' && (
        <View style={s.stage}>
          <Text style={[s.instruction, { color: colors.textMid }]}>
            {t('daily_challenge.mental_maths.entry_instruction')}
          </Text>
          <View style={s.entryRow}>
            {Array.from({ length: MAX_ENTRY_DIGITS }, (_, i) => {
              const filled = i < entry.length;
              return (
                <View
                  key={i}
                  style={[
                    s.entrySlot,
                    {
                      backgroundColor: colors.card,
                      borderColor: filled ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={[s.entryDigit, { color: colors.text }]}>{filled ? entry[i] : ''}</Text>
                </View>
              );
            })}
          </View>
          <PhoneNumberKeypad
            onDigit={handleDigit}
            onBackspace={handleBackspace}
            disabled={entry.length >= MAX_ENTRY_DIGITS}
          />
          <Pressable
            onPress={handleSubmit}
            disabled={entry.length === 0}
            style={({ pressed }) => [
              s.submitBtn,
              { backgroundColor: colors.accent },
              entry.length === 0 && { opacity: 0.35 },
              pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('daily_challenge.mental_maths.submit_aria')}
          >
            <Text style={s.submitText}>{t('daily_challenge.mental_maths.submit')}</Text>
          </Pressable>
        </View>
      )}

      {phase === 'feedback' && lastOutcome && (
        <View style={s.stage}>
          <Text style={[s.feedbackTier, { color: tierColor(lastOutcome.tier) }]}>
            {t(`daily_challenge.mental_maths.feedback_${lastOutcome.tier}`)}
          </Text>
          <View style={[s.numberCard, { backgroundColor: colors.card, borderColor: tierColor(lastOutcome.tier) }]}>
            <Text style={[s.feedbackTotal, { color: colors.text }]}>{lastOutcome.target}</Text>
            {/* Spell the sum out so the player learns rather than
                just being judged: "4 + 9 − 3 = 10". */}
            <Text style={[s.feedbackSum, { color: colors.textMid }]}>
              {round.values
                .map((v, i) => (i === 0 ? `${v}` : v < 0 ? `− ${Math.abs(v)}` : `+ ${v}`))
                .join(' ')}
              {' = '}
              {lastOutcome.target}
            </Text>
          </View>
          {lastOutcome.tier !== 'exact' && (
            <Text style={[s.feedbackYours, { color: colors.textMid }]}>
              {t('daily_challenge.mental_maths.your_answer', { answer: lastOutcome.entered })}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
  roundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  roundLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  roundDots: { flexDirection: 'row', gap: 6 },
  roundDot: { width: 8, height: 8, borderRadius: 4 },

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  instruction: { fontSize: 14, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },

  numberCard: {
    width: '100%', maxWidth: 300, minHeight: 170,
    borderRadius: 24, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 22, gap: 8,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18,
    elevation: 3,
  },
  bigNumber: {
    fontSize: 76, fontWeight: '900',
    fontVariant: ['tabular-nums'],
    fontFamily: isWeb ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  bigNumberGhost: { fontSize: 18, fontWeight: '700' },
  seqDots: { flexDirection: 'row', gap: 8 },
  seqDot: { width: 10, height: 10, borderRadius: 5 },

  entryRow: { flexDirection: 'row', gap: 8 },
  entrySlot: {
    width: 52, height: 64,
    borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  entryDigit: {
    fontSize: 32, fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: isWeb ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  submitBtn: {
    width: '100%', maxWidth: 280,
    paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C5CE7', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
    elevation: 4,
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  feedbackTier: { fontSize: 26, fontWeight: '900', letterSpacing: -0.3 },
  feedbackTotal: {
    fontSize: 56, fontWeight: '900',
    fontVariant: ['tabular-nums'],
    fontFamily: isWeb ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  feedbackSum: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  feedbackYours: { fontSize: 14, fontWeight: '600' },
});
