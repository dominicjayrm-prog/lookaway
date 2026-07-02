/**
 * BLANKED onboarding — play-first.
 *
 * Three warm-up rounds of the real mechanic (memorise → look away →
 * answer), a celebratory results screen, then straight into the app
 * on a silently-created guest session. No account wall, no paywall,
 * no locked content — the first monetisation moment now lives behind
 * real gameplay value (see src/lib/paywallGate.ts).
 *
 * This replaces the exam-framed memory test that ended in a blurred
 * "brain profile" + forced signup + auto-paywall. Production data
 * showed 58% of users completed that whole funnel and then quit
 * within 30 minutes without playing a single level — the sell came
 * before the fun. The rounds are now winnable (generous view times,
 * no engineered failure), every answer gets warm feedback, and the
 * exit is one tap into the game.
 *
 * Persistence: the AsyncStorage key `blanked_onboarded` is set on
 * exit so the warm-up only runs once per device install. app/index.tsx
 * reads the same key (AsyncStorage on native, localStorage on web).
 */
import React, { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform,
  Animated as RNAnimated, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { SceneRenderer } from '@/src/components/SceneRenderer';
import { OptionButton } from '@/src/components/OptionButton';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { track, EVENTS } from '@/src/lib/analytics';
import { logTutorialDone } from '@/src/lib/metaEvents';
import { ONBOARDING_ROUNDS } from '@/src/data/onboardingTestScenes';
import {
  buildOnboardingScoreOutput,
  type RoundResult,
} from '@/src/utils/onboardingScore';
import { t } from '@/src/i18n';

const ACCENT = '#6C5CE7';
const ONBOARDED_KEY = 'blanked_onboarded';

type Phase = 'welcome' | 'round' | 'results';

interface OnboardingState {
  phase: Phase;
  roundIndex: 0 | 1 | 2;
  results: RoundResult[];
}

type Action =
  | { type: 'start' }
  | { type: 'recordRound'; result: RoundResult };

function reducer(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case 'start':
      return { ...state, phase: 'round', roundIndex: 0, results: [] };
    case 'recordRound': {
      const nextResults = [...state.results, action.result];
      const isLast = state.roundIndex === 2;
      if (isLast) return { ...state, phase: 'results', results: nextResults };
      return {
        ...state,
        results: nextResults,
        roundIndex: (state.roundIndex + 1) as 0 | 1 | 2,
      };
    }
    default:
      return state;
  }
}

function getStorage() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage').default;
}

async function markOnboarded() {
  try {
    await getStorage().setItem(ONBOARDED_KEY, 'true');
  } catch {}
  // Web fallback so app/index.tsx's redirect picks up the flag
  // without a full reload.
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ONBOARDED_KEY, 'true');
    }
  } catch {}
}

// ─── MAIN ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { signInAsGuest } = useAuth();
  const [state, dispatch] = useReducer(reducer, {
    phase: 'welcome',
    roundIndex: 0,
    results: [],
  });
  const [startingGuest, setStartingGuest] = useState(false);

  /** Primary exit: silently create a guest session and land on home.
   *  The user never sees an account form. If the anonymous sign-in
   *  fails (offline, rate limit), fall back to the login screen —
   *  it has its own "Continue as guest" retry path. */
  const startPlaying = useCallback(async () => {
    if (startingGuest) return;
    setStartingGuest(true);
    await markOnboarded();
    track(EVENTS.ONBOARDING_COMPLETED, { exit: 'guest' });
    logTutorialDone();
    const result = await signInAsGuest();
    if (result.error) {
      // Recoverable: the login screen offers guest + account paths.
      setStartingGuest(false);
      router.replace({ pathname: '/(auth)/login', params: { mode: 'signup' } });
      return;
    }
    router.replace('/');
  }, [startingGuest, signInAsGuest, router]);

  /** Secondary exit for returning players: straight to sign-in, no
   *  guest session created (their real account has their progress). */
  const goToSignIn = useCallback(async () => {
    await markOnboarded();
    track(EVENTS.ONBOARDING_COMPLETED, { exit: 'existing_account' });
    router.replace({ pathname: '/(auth)/login', params: { mode: 'login' } });
  }, [router]);

  const output = state.phase === 'results'
    ? buildOnboardingScoreOutput(state.results)
    : null;

  return (
    <View style={[s.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {state.phase === 'welcome' && (
        <Welcome onStart={() => dispatch({ type: 'start' })} onSignIn={goToSignIn} />
      )}
      {state.phase === 'round' && (
        <TestRound
          key={`round-${state.roundIndex}`}
          roundIndex={state.roundIndex}
          onComplete={(result) => dispatch({ type: 'recordRound', result })}
        />
      )}
      {state.phase === 'results' && output && (
        <Results
          output={output}
          rounds={state.results}
          starting={startingGuest}
          onStart={startPlaying}
          onSignIn={goToSignIn}
        />
      )}
    </View>
  );
}

// ─── WELCOME ────────────────────────────────────────────────────────
function Welcome({ onStart, onSignIn }: { onStart: () => void; onSignIn: () => void }) {
  const { colors } = useTheme();
  const fade = useRef(new RNAnimated.Value(0)).current;
  const lift = useRef(new RNAnimated.Value(20)).current;
  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      RNAnimated.spring(lift, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [fade, lift]);

  return (
    <RNAnimated.View
      style={[s.centered, { opacity: fade, transform: [{ translateY: lift }] }]}
    >
      <View style={s.logoFrame}>
        <AnimatedBlink expression="celebrate" size={120} entrance="spring" />
      </View>
      <Text style={[s.welcomeTitle, { color: colors.text }]}>{t('onboarding.test.welcome_title')}</Text>
      <Text style={[s.welcomeSub, { color: colors.textMid }]}>{t('onboarding.test.welcome_subtitle')}</Text>
      <View style={s.welcomeMeta}>
        <Ionicons name="time-outline" size={16} color={colors.textMid} />
        <Text style={[s.welcomeMetaText, { color: colors.textMid }]}>{t('onboarding.test.welcome_meta')}</Text>
      </View>
      <Pressable
        onPress={onStart}
        style={({ pressed }) => [
          s.primaryBtn,
          { backgroundColor: ACCENT },
          pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
        ]}
      >
        <Text style={s.primaryBtnText}>{t('onboarding.test.welcome_cta')}</Text>
      </Pressable>
      {/* Returning players skip the warm-up entirely — their account
          already has real progress, no need to prove anything. */}
      <Pressable onPress={onSignIn} style={({ pressed }) => [s.signInLink, pressed && { opacity: 0.6 }]}>
        <Text style={[s.signInLinkText, { color: colors.textMid }]}>{t('onboarding.test.have_account')}</Text>
      </Pressable>
    </RNAnimated.View>
  );
}

// ─── WARM-UP ROUND ──────────────────────────────────────────────────
function TestRound({
  roundIndex,
  onComplete,
}: {
  roundIndex: 0 | 1 | 2;
  onComplete: (result: RoundResult) => void;
}) {
  const { colors } = useTheme();
  const round = ONBOARDING_ROUNDS[roundIndex];
  // Three phases: memorise (scene visible) → blank ("Look away!") →
  // question (4-option pick). Round count is displayed across all
  // three so the user always knows where they are in the warm-up.
  const [phase, setPhase] = useState<'memorise' | 'blank' | 'question'>('memorise');
  const [selected, setSelected] = useState<number | null>(null);
  const questionShownAt = useRef<number>(0);
  const [secondsLeft, setSecondsLeft] = useState(round.viewTime);

  // Auto-advance memorise → blank → question.
  useEffect(() => {
    if (phase !== 'memorise') return;
    setSecondsLeft(round.viewTime);
    const tickId = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, +(s - 0.1).toFixed(1)));
    }, 100);
    const blankId = setTimeout(() => {
      setPhase('blank');
    }, round.viewTime * 1000);
    return () => { clearInterval(tickId); clearTimeout(blankId); };
  }, [phase, round.viewTime]);

  useEffect(() => {
    if (phase !== 'blank') return;
    const id = setTimeout(() => {
      setPhase('question');
      questionShownAt.current = Date.now();
    }, 600);
    return () => clearTimeout(id);
  }, [phase]);

  const handleAnswer = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const reactionMs = Date.now() - questionShownAt.current;
    const correct = idx === round.question.correctIndex;
    // Warm feedback on every answer — a success haptic on correct, a
    // gentle (non-error) tap on wrong. The old flow gave a silent
    // right/wrong flash; for a first-touch audience the physical
    // "well done" matters.
    if (Platform.OS !== 'web') {
      if (correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    }
    // Reveal window: long enough to actually read which answer was
    // right (the old 800ms was too quick for the 35-65 demo).
    setTimeout(() => onComplete({ correct, reactionMs }), 1400);
  }, [selected, round.question.correctIndex, onComplete]);

  const stateForOption = (idx: number): 'default' | 'selected' | 'correct' | 'wrong' | 'dimmed' => {
    if (selected === null) return 'default';
    if (idx === round.question.correctIndex) return 'correct';
    if (idx === selected) return 'wrong';
    return 'dimmed';
  };

  const answeredCorrect = selected !== null && selected === round.question.correctIndex;
  const progressLabel = t('onboarding.test.round_progress', { current: round.number, total: 3 });

  return (
    <View style={s.roundRoot}>
      <View style={s.roundHeader}>
        <Text style={[s.roundProgress, { color: colors.textMid }]}>{progressLabel}</Text>
        <View style={s.roundDots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                s.roundDot,
                { backgroundColor: i <= roundIndex ? ACCENT : colors.border },
              ]}
            />
          ))}
        </View>
      </View>

      {phase === 'memorise' && (
        <View style={s.sceneWrap}>
          <Text style={[s.bigInstruction, { color: colors.text }]}>{t('onboarding.test.memorise')}</Text>
          {/* SceneRenderer's Card uses `width: 100%` + `aspectRatio: 1`,
              so it needs a parent that constrains its width. The flex
              column with alignItems-center upstream lets children pick
              their own width, which collapsed the Card to 0px. Giving
              this wrapper an explicit width (capped on tablets) makes
              the canvas show up reliably across phone + tablet sizes. */}
          <View style={s.sceneCanvasWrap}>
            <SceneRenderer objects={round.scene.objects} visible viewTime={round.viewTime} />
          </View>
          <View style={[s.timerPill, { backgroundColor: ACCENT + '22' }]}>
            <Text style={[s.timerText, { color: ACCENT }]}>{secondsLeft.toFixed(1)}s</Text>
          </View>
        </View>
      )}

      {phase === 'blank' && (
        <View style={s.blankWrap}>
          <AnimatedBlink expression="blank" size={100} entrance="fade" />
          <Text style={[s.bigInstruction, { color: colors.text, marginTop: 18 }]}>{t('onboarding.test.look_away')}</Text>
        </View>
      )}

      {phase === 'question' && (
        <View style={s.questionWrap}>
          <Text style={[s.questionText, { color: colors.text }]}>{round.question.text}</Text>
          <View style={s.optionsCol}>
            {round.question.options.map((opt, i) => (
              <OptionButton
                key={i}
                label={opt}
                index={i}
                state={stateForOption(i)}
                onPress={() => handleAnswer(i)}
                disabled={selected !== null}
              />
            ))}
          </View>
          {/* Post-answer encouragement — always warm, never scolding. */}
          {selected !== null && (
            <Text style={[s.feedbackText, { color: answeredCorrect ? '#00B894' : colors.textMid }]}>
              {answeredCorrect
                ? t('onboarding.test.feedback_correct')
                : t('onboarding.test.feedback_wrong')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── RESULTS ────────────────────────────────────────────────────────
function Results({
  output,
  rounds,
  starting,
  onStart,
  onSignIn,
}: {
  output: ReturnType<typeof buildOnboardingScoreOutput>;
  rounds: RoundResult[];
  starting: boolean;
  onStart: () => void;
  onSignIn: () => void;
}) {
  const { colors } = useTheme();
  const scoreFade = useRef(new RNAnimated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    RNAnimated.timing(scoreFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    // Celebration haptic on the reveal — this screen is a win moment,
    // whatever the score.
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    // Count up the headline number for some weight on the reveal.
    const start = Date.now();
    const duration = 1100;
    const tick = () => {
      const pct = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - pct, 3);
      setDisplayScore(Math.round(output.score * eased));
      if (pct < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [scoreFade, output.score]);

  return (
    <ScrollView contentContainerStyle={s.resultsScroll} showsVerticalScrollIndicator={false}>
      <RNAnimated.View style={{ opacity: scoreFade, alignItems: 'center' }}>
        <View style={s.resultsBlink}>
          <AnimatedBlink expression="celebrate" size={72} entrance="bounce" />
        </View>
        <Text style={[s.resultsLabel, { color: colors.textMid }]}>{t('onboarding.test.results.score_label')}</Text>
        <Text style={[s.resultsScore, { color: colors.text }]}>{displayScore}<Text style={[s.resultsScoreOf, { color: colors.textMid }]}>/100</Text></Text>
        <View style={[s.resultsPercentilePill, { backgroundColor: ACCENT + '14' }]}>
          <Ionicons name={output.percentileTopPct === null ? 'rocket-outline' : 'trending-up'} size={14} color={ACCENT} />
          <Text style={[s.resultsPercentileText, { color: ACCENT }]}>
            {output.percentileTopPct === null
              ? t('onboarding.test.results.starting_point')
              : t('onboarding.test.results.percentile', { topPct: output.percentileTopPct })}
          </Text>
        </View>

        <View style={[s.brainTypeCard, { borderColor: colors.border }]}>
          <Text style={[s.brainTypeLabel, { color: colors.textMid }]}>{t('onboarding.test.results.brain_type_label')}</Text>
          <Text style={[s.brainTypeName, { color: colors.text }]}>{t(output.brainType.nameKey)}</Text>
          <Text style={[s.brainTypeTagline, { color: colors.textMid }]}>{t(output.brainType.taglineKey)}</Text>
        </View>

        <View style={s.roundBreakdown}>
          <Text style={[s.roundBreakdownTitle, { color: colors.text }]}>{t('onboarding.test.results.round_breakdown')}</Text>
          {rounds.map((r, i) => (
            <View key={i} style={[s.breakdownRow, { borderColor: colors.border }]}>
              <Text style={[s.breakdownRowText, { color: colors.text }]}>
                {t('onboarding.test.results.round_label', { number: i + 1 })}
              </Text>
              <View style={s.breakdownRowRight}>
                <Text style={[s.breakdownReact, { color: colors.textMid }]}>{(r.reactionMs / 1000).toFixed(1)}s</Text>
                <Ionicons
                  name={r.correct ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={r.correct ? '#00B894' : '#FF6B6B'}
                />
              </View>
            </View>
          ))}
        </View>

        <Text style={[s.resultsNext, { color: colors.textMid }]}>{t('onboarding.test.results.next_up')}</Text>

        <Pressable
          onPress={onStart}
          disabled={starting}
          style={({ pressed }) => [
            s.primaryBtn,
            { backgroundColor: ACCENT, marginTop: 10 },
            (pressed || starting) && { opacity: 0.88, transform: [{ scale: 0.97 }] },
          ]}
        >
          {starting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={s.primaryBtnText}>{t('onboarding.test.results.cta')}</Text>
          )}
        </Pressable>

        <Pressable onPress={onSignIn} disabled={starting} style={({ pressed }) => [s.signInLink, pressed && { opacity: 0.6 }]}>
          <Text style={[s.signInLinkText, { color: colors.textMid }]}>{t('onboarding.test.have_account')}</Text>
        </Pressable>
      </RNAnimated.View>
    </ScrollView>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },

  logoFrame: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  welcomeTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  welcomeSub: { fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  welcomeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 8 },
  welcomeMetaText: { fontSize: 12, fontWeight: '600' },

  primaryBtn: {
    // Add horizontal padding so text doesn't touch the rounded edges
    // of the pill — longer locale strings sat flush with the button's
    // right curve on iOS and read as clipped.
    width: '100%', maxWidth: 320, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 54,
    shadowColor: ACCENT, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 14, elevation: 5,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', textAlign: 'center' },

  signInLink: { paddingVertical: 12, paddingHorizontal: 16 },
  signInLinkText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // Round
  roundRoot: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  roundHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  roundProgress: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  roundDots: { flexDirection: 'row', gap: 6 },
  roundDot: { width: 7, height: 7, borderRadius: 4 },

  sceneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 12 },
  sceneCanvasWrap: { width: '100%', maxWidth: 360 },
  bigInstruction: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  timerPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  timerText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },

  blankWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  questionWrap: { flex: 1, paddingTop: 24, gap: 18 },
  questionText: { fontSize: 22, fontWeight: '700', textAlign: 'center', paddingHorizontal: 12 },
  optionsCol: { gap: 12, paddingHorizontal: 4, marginTop: 6 },
  feedbackText: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 2 },

  // Results
  resultsScroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },
  resultsBlink: { marginBottom: 6 },
  resultsLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  resultsScore: { fontSize: 80, fontWeight: '900', marginTop: 4 },
  resultsScoreOf: { fontSize: 22, fontWeight: '700' },
  resultsPercentilePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: 4 },
  resultsPercentileText: { fontSize: 13, fontWeight: '700' },

  brainTypeCard: {
    width: '100%', maxWidth: 360, marginTop: 22,
    borderWidth: 1.5, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 18,
    alignItems: 'center', gap: 4,
  },
  brainTypeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  brainTypeName: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  brainTypeTagline: { fontSize: 13, textAlign: 'center', marginTop: 2, lineHeight: 19, maxWidth: 300 },

  roundBreakdown: { width: '100%', maxWidth: 360, marginTop: 26 },
  roundBreakdownTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  breakdownRowText: { fontSize: 14, fontWeight: '600' },
  breakdownRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdownReact: { fontSize: 12, fontWeight: '600' },

  resultsNext: { fontSize: 14, textAlign: 'center', marginTop: 26, lineHeight: 20, maxWidth: 300 },
});
