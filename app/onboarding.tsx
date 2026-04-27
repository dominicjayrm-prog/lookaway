/**
 * BLANKED onboarding — 3-round memory test → results → paywall →
 * (optional) discount paywall → login.
 *
 * Replaces the previous 6-screen swipe deck. The new flow gets the
 * user playing within ~10 seconds: minimal welcome screen, then the
 * test starts. Three classic-mode mini rounds with rising difficulty,
 * a fake "analysing your memory" loader, then a results screen with
 * their score / percentile / brain type. The detailed brain profile
 * sits behind a frosted-glass overlay with an "Unlock Full Profile"
 * CTA — that's the conversion hook.
 *
 * Persistence: the AsyncStorage key `blanked_onboarded` is set on
 * exit (regardless of subscribe outcome) so the test only runs once
 * per device install. Existing users with the key already set skip
 * straight to login.
 */
import React, { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform,
  Animated as RNAnimated, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { SceneRenderer } from '@/src/components/SceneRenderer';
import { OptionButton } from '@/src/components/OptionButton';
import { useTheme } from '@/src/providers/ThemeProvider';
import { track, EVENTS } from '@/src/lib/analytics';
import { ONBOARDING_ROUNDS } from '@/src/data/onboardingTestScenes';
import {
  buildOnboardingScoreOutput,
  type RoundResult,
  type BrainType,
} from '@/src/utils/onboardingScore';
import { t } from '@/src/i18n';

const ACCENT = '#6C5CE7';
const ONBOARDED_KEY = 'blanked_onboarded';
// Read by app/(tabs)/index.tsx on first home render after signup. When
// true, the home tab pops the SubscriptionPaywall (and on dismiss, the
// DiscountPaywall) before clearing the flag. This shifts the paywall
// out of the pre-auth flow so purchases attach to a real account.
const POST_SIGNUP_PAYWALL_KEY = 'blanked_show_paywall_after_signup';

// Paywall is shown AFTER signup, not during onboarding. Anonymous
// purchases technically work via RevenueCat (anon device id later
// merged into the auth user via `Purchases.logIn`), but the timing
// is fragile: if a user pays and closes the app before signing up,
// the entitlement lives on a device id with no recovery path. The
// safer pattern (used by Headspace / Calm / Duolingo Plus) is auth
// first, paywall after. The onboarding test still drives conversion
// via the blurred-profile hook, but the actual purchase happens on
// home after the user has an account to attach it to.
type Phase = 'welcome' | 'round' | 'analysing' | 'results' | 'profile';

interface OnboardingState {
  phase: Phase;
  roundIndex: 0 | 1 | 2;
  results: RoundResult[];
}

type Action =
  | { type: 'start' }
  | { type: 'recordRound'; result: RoundResult }
  | { type: 'analysisDone' }
  | { type: 'showProfile' };

function reducer(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case 'start':
      return { ...state, phase: 'round', roundIndex: 0, results: [] };
    case 'recordRound': {
      const nextResults = [...state.results, action.result];
      const isLast = state.roundIndex === 2;
      if (isLast) return { ...state, phase: 'analysing', results: nextResults };
      return {
        ...state,
        results: nextResults,
        roundIndex: (state.roundIndex + 1) as 0 | 1 | 2,
      };
    }
    case 'analysisDone':
      return { ...state, phase: 'results' };
    case 'showProfile':
      return { ...state, phase: 'profile' };
    default:
      return state;
  }
}

function getStorage() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage').default;
}

// ─── MAIN ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [state, dispatch] = useReducer(reducer, {
    phase: 'welcome',
    roundIndex: 0,
    results: [],
  });

  // Tapping "Unlock Full Profile" sets a flag that the home tab picks
  // up after signup, so the SubscriptionPaywall fires once the user has
  // a real account. This path is also used as the regular exit, since
  // the test must be completed before reaching the rest of the app.
  const exitToSignup = useCallback(async (queuePaywall: boolean) => {
    try {
      await getStorage().setItem(ONBOARDED_KEY, 'true');
      if (queuePaywall) {
        await getStorage().setItem(POST_SIGNUP_PAYWALL_KEY, 'true');
      }
    } catch {}
    // Web fallback so app/index.tsx's redirect picks up the flag
    // without a full reload, matching the previous onboarding's
    // behaviour for the existing onboarded key.
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ONBOARDED_KEY, 'true');
        if (queuePaywall) localStorage.setItem(POST_SIGNUP_PAYWALL_KEY, 'true');
      }
    } catch {}
    track(EVENTS.ONBOARDING_COMPLETED, { queuedPaywall: queuePaywall });
    router.replace({ pathname: '/(auth)/login', params: { mode: 'signup' } });
  }, [router]);

  const output = state.phase === 'results' || state.phase === 'profile'
    ? buildOnboardingScoreOutput(state.results)
    : null;

  return (
    <View style={[s.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {state.phase === 'welcome' && (
        <Welcome onStart={() => dispatch({ type: 'start' })} />
      )}
      {state.phase === 'round' && (
        <TestRound
          key={`round-${state.roundIndex}`}
          roundIndex={state.roundIndex}
          onComplete={(result) => dispatch({ type: 'recordRound', result })}
        />
      )}
      {state.phase === 'analysing' && (
        <Analysing onDone={() => dispatch({ type: 'analysisDone' })} />
      )}
      {state.phase === 'results' && output && (
        <Results
          output={output}
          rounds={state.results}
          onContinue={() => dispatch({ type: 'showProfile' })}
        />
      )}
      {state.phase === 'profile' && output && (
        <BlurredProfile
          brainType={output.brainType}
          onUnlock={() => exitToSignup(true)}
        />
      )}
    </View>
  );
}

// ─── WELCOME ────────────────────────────────────────────────────────
function Welcome({ onStart }: { onStart: () => void }) {
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
    </RNAnimated.View>
  );
}

// ─── TEST ROUND ─────────────────────────────────────────────────────
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
  // question (4-option pick). Round count + difficulty hint are
  // displayed across all three so the user always knows where they
  // are in the test.
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
    // Brief reveal so the user sees right/wrong before we move on,
    // then advance. 700ms matches the classic-mode feedback timing.
    setTimeout(() => onComplete({ correct, reactionMs }), 800);
  }, [selected, round.question.correctIndex, onComplete]);

  const stateForOption = (idx: number): 'default' | 'selected' | 'correct' | 'wrong' | 'dimmed' => {
    if (selected === null) return 'default';
    if (idx === round.question.correctIndex) return 'correct';
    if (idx === selected) return 'wrong';
    return 'dimmed';
  };

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
        </View>
      )}
    </View>
  );
}

// ─── ANALYSING ──────────────────────────────────────────────────────
// Fake 2.7-second loader with a fill bar + three checkmarks animating
// in. Pure conversion theatre — the score has already been computed,
// but the moment of "the app is judging me" sets up the results screen.
const ANALYSE_STEPS = [
  'onboarding.test.analysing.step_1',
  'onboarding.test.analysing.step_2',
  'onboarding.test.analysing.step_3',
] as const;

// Eye-movement cycle for the analysing Blink. Drives `lookOffset`
// through a sequence so the character feels alive (scanning, thinking)
// rather than frozen. Slow enough to read as a deliberate "I'm
// processing" expression, not a twitch.
const LOOK_PATH: { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: -0.6, y: 0.3 },
  { x: 0.6, y: 0.3 },
  { x: 0, y: -0.4 },
  { x: -0.5, y: -0.2 },
  { x: 0.5, y: -0.2 },
  { x: 0, y: 0 },
];

function Analysing({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const fill = useRef(new RNAnimated.Value(0)).current;
  const [stepDone, setStepDone] = useState(0);
  const [lookIdx, setLookIdx] = useState(0);

  useEffect(() => {
    RNAnimated.timing(fill, {
      toValue: 1,
      duration: 2700,
      useNativeDriver: false,
    }).start();
    const t1 = setTimeout(() => setStepDone(1), 700);
    const t2 = setTimeout(() => setStepDone(2), 1500);
    const t3 = setTimeout(() => setStepDone(3), 2300);
    const done = setTimeout(onDone, 2800);
    // Cycle the eye position every 380ms while the loader runs.
    // Stops on cleanup (unmount + done callback).
    const lookId = setInterval(() => {
      setLookIdx((i) => (i + 1) % LOOK_PATH.length);
    }, 380);
    return () => {
      [t1, t2, t3, done].forEach(clearTimeout);
      clearInterval(lookId);
    };
  }, [fill, onDone]);

  const widthInterp = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={s.centered}>
      <AnimatedBlink expression="memorise" size={92} entrance="fade" lookOffset={LOOK_PATH[lookIdx]} />
      <Text style={[s.analyseTitle, { color: colors.text }]}>{t('onboarding.test.analysing.title')}</Text>

      <View style={[s.fillTrack, { backgroundColor: colors.border }]}>
        <RNAnimated.View style={[s.fillBar, { width: widthInterp, backgroundColor: ACCENT }]} />
      </View>

      <View style={s.analyseSteps}>
        {ANALYSE_STEPS.map((key, i) => {
          const done = i < stepDone;
          return (
            <View key={key} style={s.analyseRow}>
              <Ionicons
                name={done ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={done ? '#00B894' : colors.textLight}
              />
              <Text style={[s.analyseRowText, { color: done ? colors.text : colors.textMid }]}>{t(key)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── RESULTS ────────────────────────────────────────────────────────
function Results({
  output,
  rounds,
  onContinue,
}: {
  output: ReturnType<typeof buildOnboardingScoreOutput>;
  rounds: RoundResult[];
  onContinue: () => void;
}) {
  const { colors } = useTheme();
  const scoreFade = useRef(new RNAnimated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    RNAnimated.timing(scoreFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
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

        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [
            s.primaryBtn,
            { backgroundColor: ACCENT, marginTop: 28 },
            pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={s.primaryBtnText}>{t('onboarding.test.results.cta')}</Text>
        </Pressable>
      </RNAnimated.View>
    </ScrollView>
  );
}

// ─── BLURRED PROFILE ────────────────────────────────────────────────
// Four sections (strengths / weaknesses / training plan / age compare)
// rendered with low opacity so they read like real content but are
// unreadable. A frosted overlay sits on top with the lock icon and CTA.
// We don't use expo-blur (not in deps) — opacity + scrambled-feel
// content is more than enough to convey "locked".
const PROFILE_SECTIONS = [
  {
    titleKey: 'onboarding.test.profile.strengths_title',
    bodyKey: 'onboarding.test.profile.strengths_body',
    icon: 'flash',
    color: '#00B894',
  },
  {
    titleKey: 'onboarding.test.profile.weaknesses_title',
    bodyKey: 'onboarding.test.profile.weaknesses_body',
    icon: 'alert-circle',
    color: '#FF6B6B',
  },
  {
    titleKey: 'onboarding.test.profile.training_title',
    bodyKey: 'onboarding.test.profile.training_body',
    icon: 'fitness',
    color: '#0984E3',
  },
  {
    titleKey: 'onboarding.test.profile.age_title',
    bodyKey: 'onboarding.test.profile.age_body',
    icon: 'people',
    color: '#D4A012',
  },
] as const;

function BlurredProfile({
  brainType,
  onUnlock,
}: {
  brainType: BrainType;
  onUnlock: () => void;
}) {
  const { colors } = useTheme();
  const fade = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [fade]);

  return (
    <RNAnimated.View style={[s.profileRoot, { opacity: fade }]}>
      <ScrollView contentContainerStyle={s.profileScroll} showsVerticalScrollIndicator={false}>
        <Text style={[s.profileTitle, { color: colors.text }]}>{t('onboarding.test.profile.title')}</Text>
        <Text style={[s.profileSub, { color: colors.textMid }]}>
          {t('onboarding.test.profile.sub', { brainType: t(brainType.nameKey) })}
        </Text>

        {/* The four sections — rendered, but visually obscured. */}
        <View style={s.profileSections}>
          {PROFILE_SECTIONS.map((section) => (
            <View key={section.titleKey} style={[s.profileCard, { borderColor: colors.border }]}>
              <View style={s.profileCardHeader}>
                <Ionicons name={section.icon as any} size={18} color={section.color} />
                <Text style={[s.profileCardTitle, { color: colors.text }]}>{t(section.titleKey)}</Text>
              </View>
              <Text style={[s.profileCardBody, { color: colors.textMid }]}>{t(section.bodyKey)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Frosted overlay — semi-transparent matte that sits over the
          sections. Combined with the low opacity on the content
          itself, the user sees structure but can't read the details. */}
      <View style={s.profileOverlay} pointerEvents="box-none">
        <View style={s.profileOverlayInner}>
          <View style={s.lockCircle}>
            <Ionicons name="lock-closed" size={28} color="#FFF" />
          </View>
          <Text style={[s.unlockTitle, { color: colors.text }]}>{t('onboarding.test.profile.unlock_title')}</Text>
          <Text style={[s.unlockSub, { color: colors.textMid }]}>{t('onboarding.test.profile.unlock_sub')}</Text>
          <Pressable
            onPress={onUnlock}
            style={({ pressed }) => [
              s.primaryBtn,
              { backgroundColor: ACCENT, marginTop: 20 },
              pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] },
            ]}
          >
            <LinearGradient
              colors={['#6C5CE7', '#A29BFE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={s.primaryBtnText}>{t('onboarding.test.profile.unlock_cta')}</Text>
          </Pressable>
        </View>
      </View>
    </RNAnimated.View>
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
    width: '100%', maxWidth: 320, paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: ACCENT, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 14, elevation: 5,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

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

  // Analysing
  analyseTitle: { fontSize: 22, fontWeight: '800', marginTop: 18, marginBottom: 10, textAlign: 'center' },
  fillTrack: { width: '100%', maxWidth: 280, height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  fillBar: { height: '100%', borderRadius: 3 },
  analyseSteps: { gap: 10, marginTop: 22, alignSelf: 'stretch', paddingHorizontal: 32 },
  analyseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  analyseRowText: { fontSize: 14, fontWeight: '600' },

  // Results
  resultsScroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },
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

  // Profile
  profileRoot: { flex: 1, position: 'relative' },
  profileScroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 200, opacity: 0.35 },
  profileTitle: { fontSize: 22, fontWeight: '800' },
  profileSub: { fontSize: 14, marginTop: 4, marginBottom: 16 },
  profileSections: { gap: 12 },
  profileCard: { borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 8 },
  profileCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileCardTitle: { fontSize: 14, fontWeight: '700' },
  profileCardBody: { fontSize: 13, lineHeight: 19 },

  profileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'web' ? 'rgba(247,246,243,0.78)' : 'rgba(247,246,243,0.86)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  profileOverlayInner: { alignItems: 'center', maxWidth: 360, gap: 6 },
  lockCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 8,
    marginBottom: 8,
  },
  unlockTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  unlockSub: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 320, marginTop: 4 },
});
