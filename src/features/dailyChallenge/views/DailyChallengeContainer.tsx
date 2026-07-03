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
import React, { useCallback, useEffect, useState } from 'react';
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
import { buildPhoneNumberInstance, type PhoneNumberConfig } from '../modes/phoneNumber/logic';
import { WhatChangedMemoriseView } from '../modes/whatChanged/WhatChangedMemoriseView';
import { WhatChangedRecallView } from '../modes/whatChanged/WhatChangedRecallView';
import { WhatChangedTutorialView } from '../modes/whatChanged/WhatChangedTutorialView';
import { buildWhatChangedInstance, type WhatChangedConfig } from '../modes/whatChanged/logic';
import { NamesAndFacesMemoriseView } from '../modes/namesAndFaces/NamesAndFacesMemoriseView';
import { NamesAndFacesMingle } from '../modes/namesAndFaces/NamesAndFacesMingle';
import { NamesAndFacesRecallView } from '../modes/namesAndFaces/NamesAndFacesRecallView';
import { NamesAndFacesTutorialView } from '../modes/namesAndFaces/NamesAndFacesTutorialView';
import { buildNamesAndFacesInstance, type NamesAndFacesConfig } from '../modes/namesAndFaces/logic';
import { WitnessReadView } from '../modes/witness/WitnessReadView';
import { WitnessQuestionsView } from '../modes/witness/WitnessQuestionsView';
import { WitnessTutorialView } from '../modes/witness/WitnessTutorialView';
import { buildWitnessInstance, type WitnessConfig } from '../modes/witness/logic';
import { MentalMathsGameView } from '../modes/mentalMaths/MentalMathsGameView';
import { MentalMathsTutorialView } from '../modes/mentalMaths/MentalMathsTutorialView';
import { buildMentalMathsInstance, type MentalMathsConfig, type RoundOutcome } from '../modes/mentalMaths/logic';
import { getModeForDate } from '../modeRotation';
import { submitDailyChallenge } from '../service';
import type { DailyChallengeInstance, DailyChallengeModeId } from '../types';

// 'mingle' is the names_and_faces-specific transition phase
// between memorise and recall — Blinks animate from their
// memorise positions to their recall positions. Other modes
// don't use it.
type Phase = 'reveal' | 'tutorial' | 'memorise' | 'mingle' | 'recall' | 'result' | 'submitting';

// Per-mode tutorial flags. The probe + the persistence path share
// this map so adding a mode's tutorial means one entry here, not
// touching three call sites.
const TUTORIAL_KEY_BY_MODE: Partial<Record<DailyChallengeModeId, string>> = {
  what_changed: 'blanked_dc_what_changed_tutorial_seen',
  names_and_faces: 'blanked_dc_names_and_faces_tutorial_seen',
  the_witness: 'blanked_dc_the_witness_tutorial_seen',
  mental_maths: 'blanked_dc_mental_maths_tutorial_seen',
};

/** Builds the instance for whichever mode plays today. Switches on
 *  the rotation table — adding modes in the future means adding a
 *  case here + a build* function. The DailyChallengeInstance type
 *  is generic so each branch returns the right config shape, but at
 *  the call site we widen to `unknown` because the container
 *  re-narrows when picking views to render. */
function buildInstanceForToday(): DailyChallengeInstance<unknown> {
  const mode = getModeForDate();
  if (mode === 'what_changed') return buildWhatChangedInstance() as DailyChallengeInstance<unknown>;
  if (mode === 'names_and_faces') return buildNamesAndFacesInstance() as DailyChallengeInstance<unknown>;
  if (mode === 'the_witness') return buildWitnessInstance() as DailyChallengeInstance<unknown>;
  if (mode === 'mental_maths') return buildMentalMathsInstance() as DailyChallengeInstance<unknown>;
  return buildPhoneNumberInstance() as DailyChallengeInstance<unknown>;
}

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
  // would make the puzzle change if the user crosses midnight UTC
  // mid-session, which the spec explicitly forbids ("complete the
  // session under the original date"). The factory dispatches by
  // today's mode in the rotation table.
  const [instance] = useState<DailyChallengeInstance<unknown>>(() => buildInstanceForToday());

  // First-render gate: if today's mode is What Changed AND the
  // player has never seen the tutorial, we slot the tutorial
  // between the reveal and memorise phases. Tracked via a one-shot
  // AsyncStorage flag so it never repeats. We probe synchronously
  // via a useEffect because AsyncStorage is async; the resulting
  // state flips before the player taps Begin so the transition is
  // seamless.
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);
  useEffect(() => {
    // Each mode has its own tutorial flag — the player should see
    // each new mode's tutorial once even if they've already seen
    // others.
    const key = TUTORIAL_KEY_BY_MODE[instance.mode];
    if (!key) return;
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const seen = await AsyncStorage.getItem(key);
        if (!cancelled) setShouldShowTutorial(seen !== 'true');
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [instance.mode]);

  const [phase, setPhase] = useState<Phase>(alreadyPlayed ? 'result' : 'reveal');
  // Discriminated by mode so the result screen + share card can
  // pick the right visual representation. Phone Number ships
  // per-digit correctness; What Changed ships per-cell index sets.
  type FinalResult =
    | {
        kind: 'phone_number';
        score: number;
        timeSeconds: number;
        emojiBlocks: string;
        correctness: boolean[];
      }
    | {
        kind: 'what_changed';
        score: number;
        timeSeconds: number;
        emojiBlocks: string;
        correctIndexes: number[];
        incorrectIndexes: number[];
        missedIndexes: number[];
      }
    | {
        kind: 'names_and_faces';
        score: number;
        timeSeconds: number;
        emojiBlocks: string;
        correctness: boolean[];
        pairedNameByCharIdx: (string | undefined)[];
      }
    | {
        kind: 'the_witness';
        score: number;
        timeSeconds: number;
        emojiBlocks: string;
        correctness: boolean[];
      }
    | {
        kind: 'mental_maths';
        score: number;
        timeSeconds: number;
        emojiBlocks: string;
        outcomes: RoundOutcome[];
      }
    | {
        kind: 'fallback';
        score: number;
        timeSeconds: number;
        emojiBlocks: string;
      };
  const [finalResult, setFinalResult] = useState<FinalResult | null>(initialResult ? {
    kind: 'fallback',
    score: initialResult.score,
    timeSeconds: initialResult.timeSeconds,
    emojiBlocks: '',
  } : null);

  const handleBegin = useCallback(() => {
    const hasTutorial = TUTORIAL_KEY_BY_MODE[instance.mode] !== undefined;
    if (hasTutorial && shouldShowTutorial) {
      setPhase('tutorial');
    } else {
      setPhase('memorise');
    }
  }, [instance.mode, shouldShowTutorial]);
  const handleTutorialDismiss = useCallback(() => {
    // Persist the seen flag for whichever mode's tutorial we just
    // showed. If the write fails the tutorial would re-show on the
    // next play of this mode, which is annoying but not broken.
    const key = TUTORIAL_KEY_BY_MODE[instance.mode];
    if (key) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        AsyncStorage.setItem(key, 'true').catch(() => {});
      } catch {}
    }
    setPhase('memorise');
  }, [instance.mode]);
  // Names & Faces interleaves a 'mingle' phase between memorise and
  // recall so the Blinks physically rearrange while names are
  // hidden. Other modes go memorise -> recall directly.
  const handleMemoriseDone = useCallback(() => {
    if (instance.mode === 'names_and_faces') {
      setPhase('mingle');
    } else {
      setPhase('recall');
    }
  }, [instance.mode]);
  const handleMingleDone = useCallback(() => setPhase('recall'), []);

  const handlePhoneNumberComplete = useCallback(async (result: {
    score: number; timeSeconds: number; correctness: boolean[]; emojiBlocks: string;
  }) => {
    setPhase('submitting');
    await submitDailyChallenge({
      mode: instance.mode,
      score: result.score,
      timeSeconds: result.timeSeconds,
      shareCardEmojiBlocks: result.emojiBlocks,
      challengeDate: instance.challengeDate,
    });
    setFinalResult({
      kind: 'phone_number',
      score: result.score,
      timeSeconds: result.timeSeconds,
      emojiBlocks: result.emojiBlocks,
      correctness: result.correctness,
    });
    setPhase('result');
  }, [instance]);

  const handleWhatChangedComplete = useCallback(async (result: {
    score: number; timeSeconds: number;
    correctIndexes: number[]; incorrectIndexes: number[]; missedIndexes: number[];
    emojiBlocks: string;
  }) => {
    setPhase('submitting');
    await submitDailyChallenge({
      mode: instance.mode,
      score: result.score,
      timeSeconds: result.timeSeconds,
      shareCardEmojiBlocks: result.emojiBlocks,
      challengeDate: instance.challengeDate,
    });
    setFinalResult({
      kind: 'what_changed',
      score: result.score,
      timeSeconds: result.timeSeconds,
      emojiBlocks: result.emojiBlocks,
      correctIndexes: result.correctIndexes,
      incorrectIndexes: result.incorrectIndexes,
      missedIndexes: result.missedIndexes,
    });
    setPhase('result');
  }, [instance]);

  const handleNamesAndFacesComplete = useCallback(async (result: {
    score: number; timeSeconds: number;
    correctness: boolean[]; pairedNameByCharIdx: (string | undefined)[];
    emojiBlocks: string;
  }) => {
    setPhase('submitting');
    await submitDailyChallenge({
      mode: instance.mode,
      score: result.score,
      timeSeconds: result.timeSeconds,
      shareCardEmojiBlocks: result.emojiBlocks,
      challengeDate: instance.challengeDate,
    });
    setFinalResult({
      kind: 'names_and_faces',
      score: result.score,
      timeSeconds: result.timeSeconds,
      emojiBlocks: result.emojiBlocks,
      correctness: result.correctness,
      pairedNameByCharIdx: result.pairedNameByCharIdx,
    });
    setPhase('result');
  }, [instance]);

  const handleWitnessComplete = useCallback(async (result: {
    score: number; timeSeconds: number;
    correctness: boolean[];
    emojiBlocks: string;
  }) => {
    setPhase('submitting');
    await submitDailyChallenge({
      mode: instance.mode,
      score: result.score,
      timeSeconds: result.timeSeconds,
      shareCardEmojiBlocks: result.emojiBlocks,
      challengeDate: instance.challengeDate,
    });
    setFinalResult({
      kind: 'the_witness',
      score: result.score,
      timeSeconds: result.timeSeconds,
      emojiBlocks: result.emojiBlocks,
      correctness: result.correctness,
    });
    setPhase('result');
  }, [instance]);

  const handleMentalMathsComplete = useCallback(async (result: {
    score: number; timeSeconds: number;
    outcomes: RoundOutcome[];
    emojiBlocks: string;
  }) => {
    setPhase('submitting');
    await submitDailyChallenge({
      mode: instance.mode,
      score: result.score,
      timeSeconds: result.timeSeconds,
      shareCardEmojiBlocks: result.emojiBlocks,
      challengeDate: instance.challengeDate,
    });
    setFinalResult({
      kind: 'mental_maths',
      score: result.score,
      timeSeconds: result.timeSeconds,
      emojiBlocks: result.emojiBlocks,
      outcomes: result.outcomes,
    });
    setPhase('result');
  }, [instance]);

  // Bridges the read view's onContinue to the recall phase. The
  // Witness has no separate "look away" phase between read and
  // questions — we go straight to the questions view, which itself
  // tracks elapsed time from its own mount. The read view's
  // elapsedSeconds is dropped intentionally; tiebreakers run off
  // the questions phase, not the read phase.
  const handleWitnessReadDone = useCallback((_elapsedSeconds: number) => {
    setPhase('recall');
  }, []);

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

  // Mode-specific config narrowing. The instance is widened to
  // unknown at the type level so the same container handles every
  // mode; we re-narrow per-render using `instance.mode` as a
  // discriminator.
  const phoneConfig = instance.mode === 'phone_number' ? (instance.config as PhoneNumberConfig) : null;
  const whatChangedConfig = instance.mode === 'what_changed' ? (instance.config as WhatChangedConfig) : null;
  const namesAndFacesConfig = instance.mode === 'names_and_faces' ? (instance.config as NamesAndFacesConfig) : null;
  const witnessConfig = instance.mode === 'the_witness' ? (instance.config as WitnessConfig) : null;
  const mentalMathsConfig = instance.mode === 'mental_maths' ? (instance.config as MentalMathsConfig) : null;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]} edges={['top']}>
      {phase !== 'reveal' && phase !== 'tutorial' && (
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
        {phase === 'tutorial' && whatChangedConfig && (
          <WhatChangedTutorialView onDismiss={handleTutorialDismiss} />
        )}
        {phase === 'tutorial' && namesAndFacesConfig && (
          <NamesAndFacesTutorialView onDismiss={handleTutorialDismiss} />
        )}
        {phase === 'tutorial' && witnessConfig && (
          <WitnessTutorialView onDismiss={handleTutorialDismiss} />
        )}
        {phase === 'tutorial' && mentalMathsConfig && (
          <MentalMathsTutorialView onDismiss={handleTutorialDismiss} />
        )}
        {phase === 'memorise' && phoneConfig && (
          <PhoneNumberMemoriseView
            digits={phoneConfig.digits}
            viewSeconds={phoneConfig.viewSeconds}
            onElapsed={handleMemoriseDone}
          />
        )}
        {phase === 'memorise' && whatChangedConfig && (
          <WhatChangedMemoriseView config={whatChangedConfig} onElapsed={handleMemoriseDone} />
        )}
        {phase === 'memorise' && namesAndFacesConfig && (
          <NamesAndFacesMemoriseView config={namesAndFacesConfig} onElapsed={handleMemoriseDone} />
        )}
        {phase === 'memorise' && witnessConfig && (
          <WitnessReadView config={witnessConfig} onContinue={handleWitnessReadDone} />
        )}
        {phase === 'memorise' && mentalMathsConfig && (
          <MentalMathsGameView config={mentalMathsConfig} onComplete={handleMentalMathsComplete} />
        )}
        {phase === 'mingle' && namesAndFacesConfig && (
          <NamesAndFacesMingle config={namesAndFacesConfig} onComplete={handleMingleDone} />
        )}
        {phase === 'recall' && phoneConfig && (
          <PhoneNumberRecallView config={phoneConfig} onComplete={handlePhoneNumberComplete} />
        )}
        {phase === 'recall' && whatChangedConfig && (
          <WhatChangedRecallView config={whatChangedConfig} onComplete={handleWhatChangedComplete} />
        )}
        {phase === 'recall' && namesAndFacesConfig && (
          <NamesAndFacesRecallView config={namesAndFacesConfig} onComplete={handleNamesAndFacesComplete} />
        )}
        {phase === 'recall' && witnessConfig && (
          <WitnessQuestionsView config={witnessConfig} onComplete={handleWitnessComplete} />
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
            modeVisual={(() => {
              // Pick the share-card visual that matches the mode +
              // available data. alreadyPlayed re-views fall back to
              // the generic emoji-blocks visual since we don't
              // persist per-cell correctness post-submission.
              if (finalResult.kind === 'phone_number' && phoneConfig) {
                return {
                  kind: 'phone_number',
                  digits: phoneConfig.digits,
                  correctness: finalResult.correctness,
                };
              }
              if (finalResult.kind === 'what_changed' && whatChangedConfig) {
                return {
                  kind: 'what_changed',
                  config: whatChangedConfig,
                  correctIndexes: finalResult.correctIndexes,
                  incorrectIndexes: finalResult.incorrectIndexes,
                  missedIndexes: finalResult.missedIndexes,
                };
              }
              if (finalResult.kind === 'names_and_faces' && namesAndFacesConfig) {
                return {
                  kind: 'names_and_faces',
                  config: namesAndFacesConfig,
                  correctness: finalResult.correctness,
                  pairedNameByCharIdx: finalResult.pairedNameByCharIdx,
                };
              }
              if (finalResult.kind === 'the_witness' && witnessConfig) {
                return {
                  kind: 'the_witness',
                  config: witnessConfig,
                  correctness: finalResult.correctness,
                };
              }
              if (finalResult.kind === 'mental_maths') {
                return {
                  kind: 'mental_maths',
                  outcomes: finalResult.outcomes,
                };
              }
              return { kind: 'fallback', emojiBlocks: finalResult.emojiBlocks };
            })()}
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
