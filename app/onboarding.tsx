import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, Line, G, ClipPath, Polygon } from 'react-native-svg';

// ─── BLINKING EYE ───────────────────────────────────────
function BlinkingEye({ blinkPhase, colors }: { blinkPhase: number; colors: any }) {
  const lidY = blinkPhase * 35;
  const ps = 1 - blinkPhase * 0.3;
  return (
    <Svg width={160} height={100} viewBox="0 0 160 100">
      <Defs>
        <LinearGradient id="eyeG" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={colors.accent} />
          <Stop offset="100%" stopColor={colors.accentLight} />
        </LinearGradient>
        <ClipPath id="eyeClip">
          <Path d={`M10,50 Q80,${10 + lidY} 150,50 Q80,${90 - lidY} 10,50 Z`} />
        </ClipPath>
      </Defs>
      <Path d="M10,50 Q80,10 150,50 Q80,90 10,50 Z" fill={colors.card} stroke="url(#eyeG)" strokeWidth={2.5} />
      <G clipPath="url(#eyeClip)">
        <Path d="M10,50 Q80,10 150,50 Q80,90 10,50 Z" fill={colors.card} />
        <Circle cx={80} cy={50} r={22 * ps} fill="url(#eyeG)" />
        <Circle cx={80} cy={50} r={10 * ps} fill={colors.bg} />
        <Circle cx={88} cy={42} r={5 * ps} fill="white" opacity={0.8} />
        <Circle cx={74} cy={55} r={2.5 * ps} fill="white" opacity={0.5} />
      </G>
      <Path d={`M10,50 Q80,${10 + lidY} 150,50`} fill="none" stroke="url(#eyeG)" strokeWidth={3} strokeLinecap="round" />
      <Path d={`M25,${55 - lidY * 0.1} Q80,${85 - lidY} 135,${55 - lidY * 0.1}`} fill="none" stroke="url(#eyeG)" strokeWidth={1.5} opacity={0.4} strokeLinecap="round" />
    </Svg>
  );
}

// ─── MINI LOGO ──────────────────────────────────────────
function MiniLogo({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs><LinearGradient id="obG" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#6C5CE7" /><Stop offset="100%" stopColor="#A29BFE" /></LinearGradient></Defs>
      <Rect width={64} height={64} rx={16} fill="url(#obG)" />
      <G transform="translate(14,20)"><Path d="M2 12Q18 0 34 12Q18 24 2 12Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth={1.5} /><Circle cx={18} cy={12} r={6} fill="white" /><Circle cx={18} cy={12} r={3} fill="#6C5CE7" /><Line x1={18} y1={1} x2={18} y2={-2} stroke="white" strokeWidth={1.5} strokeLinecap="round" /><Line x1={8} y1={4} x2={5} y2={1} stroke="white" strokeWidth={1.5} strokeLinecap="round" /><Line x1={28} y1={4} x2={31} y2={1} stroke="white" strokeWidth={1.5} strokeLinecap="round" /></G>
    </Svg>
  );
}

// ─── DOTS ───────────────────────────────────────────────
function PageDots({ current, total, colors }: { current: number; total: number; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ width: i === current ? 28 : 8, height: 8, borderRadius: 4, backgroundColor: i === current ? colors.accent : colors.border }} />
      ))}
    </View>
  );
}

// ─── MINI SCENE ─────────────────────────────────────────
function MiniScene({ visible, faded, colors }: { visible: boolean; faded: boolean; colors: any }) {
  if (!visible) return <View style={{ width: 240, height: 200 }} />;
  return (
    <View style={{ width: 240, height: 200, borderRadius: 20, backgroundColor: colors.card, position: 'relative', overflow: 'hidden', opacity: visible ? 1 : 0 }}>
      {faded && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlayBg, zIndex: 2, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: colors.card, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}>Gone! What did you see?</Text>
          </View>
        </View>
      )}
      <View style={{ position: 'absolute', left: '18%', top: '15%', width: 36, height: 36, borderRadius: 18, backgroundColor: colors.wrong }} />
      <View style={{ position: 'absolute', right: '18%', top: '22%', width: 30, height: 30, borderRadius: 5, backgroundColor: '#0984E3' }} />
      <View style={{ position: 'absolute', left: '42%', bottom: '18%' }}>
        <Svg width={32} height={32} viewBox="0 0 100 100"><Polygon points="50,8 92,88 8,88" fill={colors.correct} /></Svg>
      </View>
      <View style={{ position: 'absolute', right: '14%', bottom: '28%', width: 26, height: 26, borderRadius: 13, backgroundColor: colors.gold }} />
      <View style={{ position: 'absolute', left: '12%', bottom: '38%' }}>
        <Svg width={22} height={22} viewBox="0 0 100 100"><Polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={colors.accent} /></Svg>
      </View>
    </View>
  );
}

// ─── TIMER BAR ──────────────────────────────────────────
function TimerBar({ progress, visible, colors }: { progress: number; visible: boolean; colors: any }) {
  if (!visible) return null;
  const barColor = progress > 40 ? colors.accent : progress > 15 ? colors.gold : colors.wrong;
  return (
    <View style={{ width: 240, height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
      <View style={{ width: `${progress}%`, height: '100%', borderRadius: 3, backgroundColor: barColor }} />
    </View>
  );
}

// ─── QUESTION CARD ──────────────────────────────────────
function QuestionCard({ visible, answered, colors }: { visible: boolean; answered: boolean; colors: any }) {
  if (!visible) return null;
  const opts = ['1', '2', '3', '4'];
  return (
    <View style={{ width: 280, borderRadius: 18, backgroundColor: colors.card, padding: 18 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 14 }}>How many red shapes were there?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {opts.map((opt, i) => {
          const isCorrect = answered && i === 0;
          return (
            <View key={i} style={{ width: '47%', paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: isCorrect ? colors.correctSoft : colors.surface, borderWidth: 2, borderColor: isCorrect ? colors.correct : 'transparent' }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: isCorrect ? colors.correct : colors.textMid }}>{opt}{isCorrect ? ' \u2713' : ''}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── SCORE CARD ─────────────────────────────────────────
function ScoreCard({ visible, starsVisible, colors }: { visible: boolean; starsVisible: boolean; colors: any }) {
  if (!visible) return null;
  const rows = [[1,1,1,1,1], [1,1,0,1,1], [1,1,1,1,1]];
  return (
    <View style={{ width: 260, borderRadius: 20, backgroundColor: colors.card, padding: 20, alignItems: 'center' }}>
      <Text style={{ fontSize: 42, fontWeight: '800', color: colors.accent, lineHeight: 46 }}>92%</Text>
      <Text style={{ fontSize: 13, color: colors.textMid, marginTop: 4, marginBottom: 14 }}>Memory score</Text>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 5, marginBottom: 8, justifyContent: 'center' }}>
          {row.map((v, ci) => (
            <View key={ci} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: v ? colors.correct : colors.wrong }} />
          ))}
        </View>
      ))}
      {starsVisible && (
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
          {[0,1,2].map(i => (
            <Svg key={i} width={26} height={26} viewBox="0 0 100 100">
              <Polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={colors.gold} />
            </Svg>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── MAIN ONBOARDING ────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [page, setPage] = useState(0);
  const [blinkPhase, setBlinkPhase] = useState(0);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [sceneFaded, setSceneFaded] = useState(false);
  const [timerProgress, setTimerProgress] = useState(100);
  const [questionVisible, setQuestionVisible] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [s4Anim, setS4Anim] = useState(0);

  // Blink animation
  useEffect(() => {
    if (page !== 0) return;
    let frame: number;
    let timeout: ReturnType<typeof setTimeout>;
    const doBlink = () => {
      let start: number | null = null;
      const closePhase = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 180, 1);
        setBlinkPhase(p);
        if (p < 1) { frame = requestAnimationFrame(closePhase); }
        else {
          setTimeout(() => {
            start = null;
            const openPhase = (ts2: number) => {
              if (!start) start = ts2;
              const p2 = Math.min((ts2 - start) / 200, 1);
              setBlinkPhase(1 - p2);
              if (p2 < 1) { frame = requestAnimationFrame(openPhase); }
              else { timeout = setTimeout(doBlink, 2500 + Math.random() * 1500); }
            };
            frame = requestAnimationFrame(openPhase);
          }, 80);
        }
      };
      frame = requestAnimationFrame(closePhase);
    };
    timeout = setTimeout(doBlink, 1500);
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); };
  }, [page]);

  // Scene + timer animation
  useEffect(() => {
    if (page !== 1) return;
    setSceneVisible(false); setSceneFaded(false); setTimerProgress(100);
    const t1 = setTimeout(() => setSceneVisible(true), 300);
    const t2 = setTimeout(() => setTimerProgress(0), 500);
    const t3 = setTimeout(() => { setSceneFaded(true); setTimerProgress(100); }, 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [page]);

  // Question + answer animation
  useEffect(() => {
    if (page !== 2) return;
    setQuestionVisible(false); setAnswered(false);
    const t1 = setTimeout(() => setQuestionVisible(true), 400);
    const t2 = setTimeout(() => setAnswered(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [page]);

  // Screen 4 staggered reveals
  useEffect(() => {
    if (page !== 3) return;
    setS4Anim(0);
    const t1 = setTimeout(() => setS4Anim(1), 300);
    const t2 = setTimeout(() => setS4Anim(2), 700);
    const t3 = setTimeout(() => setS4Anim(3), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [page]);

  const finish = useCallback(() => {
    try { localStorage.setItem('lookaway_onboarded', 'true'); } catch {}
    router.replace('/(tabs)');
  }, [router]);

  const next = () => setPage(p => Math.min(p + 1, 3));
  const prev = () => setPage(p => Math.max(p - 1, 0));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Skip */}
      {page < 3 && (
        <TouchableOpacity onPress={() => setPage(3)} style={styles.skipButton} activeOpacity={0.7}>
          <Text style={[styles.skipText, { color: colors.textLight }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Content */}
      <View style={styles.contentArea}>
        {page === 0 && (
          <View style={styles.pageCenter}>
            <MiniLogo size={52} />
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.wordmark, { color: colors.text }]}>Look<Text style={{ color: colors.accent }}>Away</Text></Text>
            </View>
            <View style={{ marginVertical: 12 }}>
              <BlinkingEye blinkPhase={blinkPhase} colors={colors} />
            </View>
            <Text style={[styles.heading, { color: colors.text }]}>{'How much can\nyou remember?'}</Text>
            <Text style={[styles.subtext, { color: colors.textMid }]}>A scene flashes before your eyes. Shapes, colours, positions. Then it vanishes. Can you recall what you saw?</Text>
          </View>
        )}

        {page === 1 && (
          <View style={styles.pageCenter}>
            <View style={[styles.stepBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentMid }]}>
              <Text style={[styles.stepBadgeText, { color: colors.accent }]}>STEP 1</Text>
            </View>
            <Text style={[styles.heading, { color: colors.text }]}>Memorise the scene</Text>
            <Text style={[styles.subtext, { color: colors.textMid }]}>You have a few seconds. Study every shape, colour and position carefully.</Text>
            <View style={{ marginVertical: 16 }}>
              <MiniScene visible={sceneVisible} faded={sceneFaded} colors={colors} />
            </View>
            <TimerBar progress={timerProgress} visible={sceneVisible} colors={colors} />
            <Text style={{ fontSize: 13, color: colors.textLight, fontWeight: '500', marginTop: 12 }}>{sceneFaded ? 'Now answer from memory...' : 'Study every detail...'}</Text>
          </View>
        )}

        {page === 2 && (
          <View style={styles.pageCenter}>
            <View style={[styles.stepBadge, { backgroundColor: colors.correctSoft, borderColor: colors.correct + '30' }]}>
              <Text style={[styles.stepBadgeText, { color: colors.correct }]}>STEP 2</Text>
            </View>
            <Text style={[styles.heading, { color: colors.text }]}>Answer from memory</Text>
            <Text style={[styles.subtext, { color: colors.textMid }]}>Five questions test what you saw. Colours, counts, positions. Trust your memory.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
              {[1,2,3,4,5].map(i => (
                <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i === 1 && answered ? colors.correct : i === 1 ? colors.accent : colors.border, transform: [{ scale: i === 1 && answered ? 1.4 : 1 }] }} />
              ))}
            </View>
            <QuestionCard visible={questionVisible} answered={answered} colors={colors} />
            {answered && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.correctSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.correct, fontSize: 16, fontWeight: '700' }}>{'\u2713'}</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.correct }}>Correct!</Text>
              </View>
            )}
          </View>
        )}

        {page === 3 && (
          <View style={styles.pageCenter}>
            <View style={[styles.stepBadge, { backgroundColor: colors.goldSoft, borderColor: colors.gold + '40' }]}>
              <Text style={[styles.stepBadgeText, { color: colors.gold }]}>STEP 3</Text>
            </View>
            <Text style={[styles.heading, { color: colors.text }]}>Share your score</Text>
            <Text style={[styles.subtext, { color: colors.textMid }]}>Everyone gets the same daily challenge. Compare with friends. Who remembers more?</Text>
            <View style={{ marginVertical: 12 }}>
              <ScoreCard visible={s4Anim >= 1} starsVisible={s4Anim >= 2} colors={colors} />
            </View>
            {s4Anim >= 2 && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {[{ t: '200+ levels', c: colors.accent }, { t: 'Daily challenge', c: colors.correct }, { t: 'Brain training', c: colors.gold }].map((f, i) => (
                  <View key={i} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: f.c + '12', borderWidth: 1, borderColor: f.c + '30' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: f.c }}>{f.t}</Text>
                  </View>
                ))}
              </View>
            )}
            {s4Anim >= 3 && (
              <>
                <TouchableOpacity onPress={finish} activeOpacity={0.85} style={[styles.ctaButton, { backgroundColor: colors.accent }]}>
                  <Text style={styles.ctaButtonText}>Start playing</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 8 }}>Free to play. No account needed.</Text>
              </>
            )}
          </View>
        )}
      </View>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <PageDots current={page} total={4} colors={colors} />
        {page < 3 && (
          <View style={styles.navButtons}>
            {page > 0 && (
              <TouchableOpacity onPress={prev} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
                <Text style={[styles.backButtonText, { color: colors.textMid }]}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={next} style={[styles.nextButton, { backgroundColor: colors.accent, flex: page > 0 ? 2 : 1 }]} activeOpacity={0.85}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipButton: { position: 'absolute', top: 52, right: 20, zIndex: 10, padding: 8 },
  skipText: { fontSize: 14, fontWeight: '500' },
  contentArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  pageCenter: { alignItems: 'center', gap: 8, maxWidth: 300 },
  wordmark: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  heading: { fontSize: 24, fontWeight: '800', textAlign: 'center', lineHeight: 30, letterSpacing: -0.3, marginTop: 4 },
  subtext: { fontSize: 15, textAlign: 'center', lineHeight: 24, marginTop: 4, maxWidth: 270 },
  stepBadge: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  stepBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  bottomNav: { paddingHorizontal: 30, paddingBottom: 40, gap: 18, alignItems: 'center' },
  navButtons: { flexDirection: 'row', gap: 10, width: '100%', maxWidth: 280 },
  backButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  backButtonText: { fontSize: 15, fontWeight: '600' },
  nextButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  nextButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  ctaButton: { width: '100%', maxWidth: 280, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  ctaButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
