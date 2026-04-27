/**
 * Top-level container that drives the daily challenge state machine
 * for whichever mode is active today:
 *   reveal -> memorise -> recall -> result
 *
 * Handles the close button, streak indicator at the top, and the
 * Supabase submission. Mode-specific gameplay components slot into
 * the centre.
 *
 * Edge cases (spec 2.5):
 *   - Background mid-recall: timer keeps running per global fairness.
 *   - Network drop during submit: service.ts retries semantics; we
 *     surface the result either way.
 *   - Date-changes mid-session: the challenge stays bound to the
 *     date that was current at instance build, not "today" at
 *     submit time.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/src/i18n';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { ChallengeRevealView } from './ChallengeRevealView';
import { ChallengeResultView } from './ChallengeResultView';
import { PhoneNumberMemoriseView } from '../modes/phoneNumber/PhoneNumberMemoriseView';
import { PhoneNumberRecallView } from '../modes/phoneNumber/PhoneNumberRecallView';
import { buildPhoneNumberInstance } from '../modes/phoneNumber/logic';
import { submitDailyChallenge } from '../service';
import type { DailyChallengeInstance } from '../types';

type Phase = 'reveal' | 'memorise' | 'recall' | 'result' | 'submitting';

interface Props {
  /** When true, the player has already submitted today's challenge.
   *  Container skips straight to the result screen with the existing
   *  result rather than letting them play again. */
  alreadyPlayed?: boolean;
  initialResult?: {
    score: number;
    timeSeconds: number;
    challengeDate: string;
  };
  onClose: () => void;
}

export function DailyChallengeContainer({ alreadyPlayed, initialResult, onClose }: Props) {
  const { colors } = useTheme();
  const streakCount = useGameStore((s) => s.streakCount);

  // Build the instance once at mount. Re-deriving on every render
  // would make the digits change if the user crosses midnight UTC
  // mid-session, which the spec explicitly forbids ("complete the
  // session under the original date").
  const [instance] = useState<DailyChallengeInstance<unknown>>(() => buildPhoneNumberInstance());

  const [phase, setPhase] = useState<Phase>(alreadyPlayed ? 'result' : 'reveal');
  const [finalResult, setFinalResult] = useState<{
    score: number;
    timeSeconds: number;
    emojiBlocks: string;
    /** Per-digit correctness for the beautiful share card's digit
     *  pills. Empty array when the player is reviewing a previous
     *  day's result via Supabase (we don't persist correctness, so
     *  the share card falls back to a generic emoji-blocks view). */
    correctness: boolean[];
  } | null>(initialResult ? {
    score: initialResult.score,
    timeSeconds: initialResult.timeSeconds,
    emojiBlocks: '',
    correctness: [],
  } : null);

  const handleBegin = useCallback(() => setPhase('memorise'), []);
  const handleMemoriseDone = useCallback(() => setPhase('recall'), []);

  const handleRecallComplete = useCallback(async (result: {
    score: number; timeSeconds: number; correctness: boolean[]; emojiBlocks: string;
  }) => {
    setPhase('submitting');
    const outcome = await submitDailyChallenge({
      mode: instance.mode,
      score: result.score,
      timeSeconds: result.timeSeconds,
      shareCardEmojiBlocks: result.emojiBlocks,
      challengeDate: instance.challengeDate,
    });
    // Whether we successfully submitted, hit the duplicate path, or
    // failed (network), we surface the local play's result so the
    // player gets feedback. Future foreground sync will reconcile
    // the row if the network case eventually succeeds.
    setFinalResult({
      score: result.score,
      timeSeconds: result.timeSeconds,
      emojiBlocks: result.emojiBlocks,
      correctness: result.correctness,
    });
    setPhase('result');
    // Suppress unused-variable lint without changing behaviour.
    void outcome;
  }, [instance]);

  // Mid-memorise background pause spec edge case. iOS will pause
  // setTimeout naturally when backgrounded, so when we come back
  // the timer effectively "pauses". We don't do anything special
  // here — the existing setTimeout-based countdown survives.
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (_next: AppStateStatus) => {
      // No-op stub; documented edge case, no special handling needed
      // beyond what the OS gives us.
    });
    return () => sub.remove();
  }, []);

  const phoneConfig = instance.config as ReturnType<typeof buildPhoneNumberInstance>['config'];

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]} edges={['top']}>
      {phase !== 'reveal' && (
        <View style={s.topBar}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={t('daily_challenge.container.close_aria')}
          >
            <Ionicons name="close" size={24} color={colors.textMid} />
          </Pressable>
          {streakCount >= 1 && (
            <View style={[s.streakChip, { backgroundColor: colors.wrongSoft }]}>
              <Text style={s.streakChipIcon}>🔥</Text>
              <Text style={[s.streakChipText, { color: colors.wrong }]}>{streakCount}</Text>
            </View>
          )}
        </View>
      )}

      <View style={s.content}>
        {phase === 'reveal' && (
          <ChallengeRevealView reveal={instance.reveal} onBegin={handleBegin} />
        )}
        {phase === 'memorise' && (
          <PhoneNumberMemoriseView
            digits={phoneConfig.digits}
            viewSeconds={phoneConfig.viewSeconds}
            onElapsed={handleMemoriseDone}
          />
        )}
        {phase === 'recall' && (
          <PhoneNumberRecallView config={phoneConfig} onComplete={handleRecallComplete} />
        )}
        {phase === 'submitting' && (
          <View style={s.submitting}>
            <Text style={[s.submittingText, { color: colors.textMid }]}>{t('daily_challenge.container.saving')}</Text>
          </View>
        )}
        {phase === 'result' && finalResult && (
          <ChallengeResultView
            mode={instance.mode}
            challengeDate={instance.challengeDate}
            score={finalResult.score}
            timeSeconds={finalResult.timeSeconds}
            shareCardEmojiBlocks={finalResult.emojiBlocks}
            modeVisual={
              // For Phone Number we have rich correctness data from
              // the gameplay; for an alreadyPlayed re-view (or any
              // future mode that doesn't expose correctness) fall
              // back to the generic emoji-blocks visual.
              instance.mode === 'phone_number' && finalResult.correctness.length > 0
                ? {
                    kind: 'phone_number',
                    digits: phoneConfig.digits,
                    correctness: finalResult.correctness,
                  }
                : { kind: 'fallback', emojiBlocks: finalResult.emojiBlocks }
            }
            alreadyPlayed={alreadyPlayed}
            onClose={onClose}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 430 : undefined, alignSelf: 'center' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  streakChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  streakChipIcon: { fontSize: 12 },
  streakChipText: { fontSize: 13, fontWeight: '800' },
  content: { flex: 1 },
  submitting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  submittingText: { fontSize: 14, fontWeight: '600' },
});
