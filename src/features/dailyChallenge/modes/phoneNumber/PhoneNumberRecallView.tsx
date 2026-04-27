/**
 * Recall + reveal phases.
 *
 * The player taps digits on the keypad. Each tap fills the next
 * empty slot. Backspace removes the last filled slot. Once every
 * slot is filled the recall auto-submits (no submit button per the
 * spec — feels smoother), then a per-slot reveal animates each
 * digit's correctness in sequence before reporting the final score.
 *
 * Time is tracked from the moment this view mounts (i.e. the end
 * of the memorise phase) to the moment the player fills the final
 * slot. Used for tiebreakers, never displayed prominently.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import { sounds } from '@/src/lib/sounds';
import { PhoneNumberKeypad } from './PhoneNumberKeypad';
import { scorePhoneNumberAttempt, phoneNumberEmojiBlocks, type PhoneNumberConfig } from './logic';

interface Props {
  config: PhoneNumberConfig;
  onComplete: (result: {
    score: number;
    timeSeconds: number;
    correctness: boolean[];
    emojiBlocks: string;
  }) => void;
}

const isWeb = Platform.OS === 'web';
const REVEAL_PER_DIGIT_MS = 220;
const REVEAL_HOLD_MS = 1200;

export function PhoneNumberRecallView({ config, onComplete }: Props) {
  const { colors } = useTheme();
  const [recall, setRecall] = useState<number[]>([]);
  const [phase, setPhase] = useState<'recall' | 'reveal'>('recall');
  const [revealedUpTo, setRevealedUpTo] = useState(0);
  const startedAt = useRef<number>(Date.now());
  const total = config.digits.length;

  const scored = useMemo(() => {
    if (phase !== 'reveal') return null;
    return scorePhoneNumberAttempt(config, recall);
  }, [phase, config, recall]);

  // Auto-advance into reveal once every slot is filled.
  useEffect(() => {
    if (recall.length !== total || phase !== 'recall') return;
    setPhase('reveal');
  }, [recall.length, total, phase]);

  // Step the per-slot reveal one tick at a time so the player sees
  // each digit checked individually. Haptic + audio cues per slot.
  useEffect(() => {
    if (phase !== 'reveal' || !scored) return;
    if (revealedUpTo >= total) {
      const done = setTimeout(() => {
        const elapsed = (Date.now() - startedAt.current) / 1000;
        onComplete({
          score: scored.score,
          timeSeconds: +elapsed.toFixed(2),
          correctness: scored.correctness,
          emojiBlocks: phoneNumberEmojiBlocks(scored.correctness),
        });
      }, REVEAL_HOLD_MS);
      return () => clearTimeout(done);
    }
    const id = setTimeout(() => {
      const isCorrect = scored.correctness[revealedUpTo];
      if (!isWeb) {
        Haptics.notificationAsync(
          isCorrect ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }
      sounds.play(isCorrect ? 'correct' : 'wrong');
      setRevealedUpTo((n) => n + 1);
    }, REVEAL_PER_DIGIT_MS);
    return () => clearTimeout(id);
  }, [phase, scored, revealedUpTo, total, onComplete]);

  const handleDigit = useCallback((d: number) => {
    setRecall((prev) => (prev.length >= total ? prev : [...prev, d]));
  }, [total]);

  const handleBackspace = useCallback(() => {
    setRecall((prev) => prev.slice(0, -1));
  }, []);

  return (
    <View style={s.root}>
      <Text style={[s.instruction, { color: colors.textMid }]}>
        {phase === 'recall' ? t('daily_challenge.phone_number.recall_instruction') : t('daily_challenge.phone_number.reveal_instruction')}
      </Text>
      <View style={s.slots}>
        {config.digits.map((d, i) => {
          const filled = i < recall.length;
          const revealed = phase === 'reveal' && i < revealedUpTo;
          const correct = revealed && scored?.correctness[i];
          let bg = colors.card;
          let border = colors.border;
          let textColor = colors.text;
          if (revealed) {
            bg = correct ? colors.correctSoft : colors.wrongSoft;
            border = correct ? colors.correct : colors.wrong;
          } else if (filled) {
            border = colors.accent;
          }
          return (
            <View key={i} style={[s.slot, { backgroundColor: bg, borderColor: border }]}>
              <Text style={[s.slotDigit, { color: textColor }]}>
                {filled ? recall[i] : ''}
              </Text>
              {revealed && !correct && (
                <Text style={[s.slotCorrect, { color: colors.wrong }]}>{d}</Text>
              )}
            </View>
          );
        })}
      </View>
      {phase === 'recall' && (
        <PhoneNumberKeypad
          onDigit={handleDigit}
          onBackspace={handleBackspace}
          disabled={recall.length >= total}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, paddingHorizontal: 16 },
  instruction: { fontSize: 14, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  slot: {
    width: 36, height: 52,
    borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  slotDigit: {
    fontSize: 24, fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: isWeb ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  slotCorrect: {
    position: 'absolute', bottom: -16,
    fontSize: 10, fontWeight: '800', letterSpacing: 0.4,
  },
});
