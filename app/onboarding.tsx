import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/providers/ThemeProvider';
import { spacing } from '@/src/theme/spacing';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, Line, G, ClipPath, Polygon } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── ANIMATED WRAPPER — fades/slides each child with stagger ────
function AnimatedItem({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: any }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(18)).current;
  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(18);
    const timer = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        RNAnimated.spring(translateY, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity, translateY]);
  return <RNAnimated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</RNAnimated.View>;
}

// ─── BLINKING EYE ───────────────────────────────────────
function BlinkingEye({ active, colors }: { active: boolean; colors: any }) {
  const [blinkPhase, setBlinkPhase] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame: number;
    let timeout: ReturnType<typeof setTimeout>;
    const doBlink = () => {
      let start: number | null = null;
      const closePhase = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 180, 1);
        setBlinkPhase(p);
        if (p < 1) frame = requestAnimationFrame(closePhase);
        else setTimeout(() => { start = null; const openPhase = (ts2: number) => { if (!start) start = ts2; const p2 = Math.min((ts2 - start) / 200, 1); setBlinkPhase(1 - p2); if (p2 < 1) frame = requestAnimationFrame(openPhase); else timeout = setTimeout(doBlink, 2500 + Math.random() * 1500); }; frame = requestAnimationFrame(openPhase); }, 80);
      };
      frame = requestAnimationFrame(closePhase);
    };
    timeout = setTimeout(doBlink, 1200);
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); };
  }, [active]);
  const lidY = blinkPhase * 35, ps = 1 - blinkPhase * 0.3;
  return (
    <Svg width={160} height={100} viewBox="0 0 160 100">
      <Defs><LinearGradient id="eyeG" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor={colors.accent} /><Stop offset="100%" stopColor={colors.accentLight} /></LinearGradient><ClipPath id="eyeClip"><Path d={`M10,50 Q80,${10+lidY} 150,50 Q80,${90-lidY} 10,50 Z`} /></ClipPath></Defs>
      <Path d="M10,50 Q80,10 150,50 Q80,90 10,50 Z" fill={colors.card} stroke="url(#eyeG)" strokeWidth={2.5} />
      <G clipPath="url(#eyeClip)"><Path d="M10,50 Q80,10 150,50 Q80,90 10,50 Z" fill={colors.card} /><Circle cx={80} cy={50} r={22*ps} fill="url(#eyeG)" /><Circle cx={80} cy={50} r={10*ps} fill={colors.bg} /><Circle cx={88} cy={42} r={5*ps} fill="white" opacity={0.8} /><Circle cx={74} cy={55} r={2.5*ps} fill="white" opacity={0.5} /></G>
      <Path d={`M10,50 Q80,${10+lidY} 150,50`} fill="none" stroke="url(#eyeG)" strokeWidth={3} strokeLinecap="round" />
      <Path d={`M25,${55-lidY*0.1} Q80,${85-lidY} 135,${55-lidY*0.1}`} fill="none" stroke="url(#eyeG)" strokeWidth={1.5} opacity={0.4} strokeLinecap="round" />
    </Svg>
  );
}

function MiniLogo({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs><LinearGradient id="obG" x1="0" y1="0" x2="1" y2="1"><Stop offset="0%" stopColor="#6C5CE7" /><Stop offset="100%" stopColor="#A29BFE" /></LinearGradient></Defs>
      <Rect width={64} height={64} rx={16} fill="url(#obG)" />
      <G transform="translate(14,20)"><Path d="M2 12Q18 0 34 12Q18 24 2 12Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth={1.5} /><Circle cx={18} cy={12} r={6} fill="white" /><Circle cx={18} cy={12} r={3} fill="#6C5CE7" /><Line x1={18} y1={1} x2={18} y2={-2} stroke="white" strokeWidth={1.5} strokeLinecap="round" /><Line x1={8} y1={4} x2={5} y2={1} stroke="white" strokeWidth={1.5} strokeLinecap="round" /><Line x1={28} y1={4} x2={31} y2={1} stroke="white" strokeWidth={1.5} strokeLinecap="round" /></G>
    </Svg>
  );
}

// ─── MINI SCENE (with its own animated entrance) ────────
function MiniScene({ colors }: { colors: any }) {
  const scale = useRef(new RNAnimated.Value(0.85)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const [faded, setFaded] = useState(false);
  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(scale, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => setFaded(true), 3500);
    return () => clearTimeout(t);
  }, [scale, opacity]);
  return (
    <RNAnimated.View style={{ opacity, transform: [{ scale }] }}>
      <View style={{ width: 240, height: 200, borderRadius: 20, backgroundColor: colors.card, position: 'relative', overflow: 'hidden' }}>
        {faded && <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlayBg, zIndex: 2, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}><View style={{ backgroundColor: colors.card, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12 }}><Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}>Gone! What did you see?</Text></View></View>}
        <View style={{ position: 'absolute', left: '18%', top: '15%', width: 36, height: 36, borderRadius: 18, backgroundColor: colors.wrong }} />
        <View style={{ position: 'absolute', right: '18%', top: '22%', width: 30, height: 30, borderRadius: 5, backgroundColor: '#0984E3' }} />
        <View style={{ position: 'absolute', left: '42%', bottom: '18%' }}><Svg width={32} height={32} viewBox="0 0 100 100"><Polygon points="50,8 92,88 8,88" fill={colors.correct} /></Svg></View>
        <View style={{ position: 'absolute', right: '14%', bottom: '28%', width: 26, height: 26, borderRadius: 13, backgroundColor: colors.gold }} />
        <View style={{ position: 'absolute', left: '12%', bottom: '38%' }}><Svg width={22} height={22} viewBox="0 0 100 100"><Polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={colors.accent} /></Svg></View>
      </View>
    </RNAnimated.View>
  );
}

function TimerBar({ colors }: { colors: any }) {
  const width = useRef(new RNAnimated.Value(100)).current;
  useEffect(() => { RNAnimated.timing(width, { toValue: 0, duration: 3000, useNativeDriver: false }).start(); }, [width]);
  return (
    <View style={{ width: 240, height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
      <RNAnimated.View style={{ width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), height: '100%', borderRadius: 3, backgroundColor: colors.accent }} />
    </View>
  );
}

function QuestionCard({ colors }: { colors: any }) {
  const [answered, setAnswered] = useState(false);
  const slideY = useRef(new RNAnimated.Value(30)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(slideY, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => setAnswered(true), 1800);
    return () => clearTimeout(t);
  }, [slideY, opacity]);
  const opts = ['1', '2', '3', '4'];
  return (
    <RNAnimated.View style={{ opacity, transform: [{ translateY: slideY }] }}>
      <View style={{ width: 280, borderRadius: 18, backgroundColor: colors.card, padding: 18 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 14 }}>How many red shapes were there?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {opts.map((opt, i) => {
            const sel = answered && i === 0;
            return <View key={i} style={{ width: '47%', paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: sel ? colors.correctSoft : colors.surface, borderWidth: 2, borderColor: sel ? colors.correct : 'transparent' }}><Text style={{ fontSize: 15, fontWeight: '600', color: sel ? colors.correct : colors.textMid }}>{opt}{sel ? ' \u2713' : ''}</Text></View>;
          })}
        </View>
      </View>
      {answered && (
        <AnimatedItem delay={200} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, alignSelf: 'center' }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.correctSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.correct, fontSize: 16, fontWeight: '700' }}>{'\u2713'}</Text></View>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.correct }}>Correct!</Text>
        </AnimatedItem>
      )}
    </RNAnimated.View>
  );
}

function ScoreCard({ colors }: { colors: any }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const rows = [[1,1,1,1,1], [1,1,0,1,1], [1,1,1,1,1]];
  return (
    <AnimatedItem delay={100}>
      <View style={{ width: 260, borderRadius: 20, backgroundColor: colors.card, padding: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 42, fontWeight: '800', color: colors.accent, lineHeight: 46 }}>92%</Text>
        <Text style={{ fontSize: 13, color: colors.textMid, marginTop: 4, marginBottom: 14 }}>Memory score</Text>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 5, marginBottom: 8, justifyContent: 'center' }}>
            {row.map((v, ci) => <View key={ci} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: v ? colors.correct : colors.wrong }} />)}
          </View>
        ))}
        {phase >= 1 && (
          <AnimatedItem delay={0} style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
            {[0,1,2].map(i => <Svg key={i} width={26} height={26} viewBox="0 0 100 100"><Polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={colors.gold} /></Svg>)}
          </AnimatedItem>
        )}
      </View>
    </AnimatedItem>
  );
}

// ─── PAGE DOTS ──────────────────────────────────────────
function PageDots({ current, total, colors }: { current: number; total: number; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ width: i === current ? 28 : 8, height: 8, borderRadius: 4, backgroundColor: i === current ? colors.accent : colors.border }} />
      ))}
    </View>
  );
}

// ─── INDIVIDUAL PAGE COMPONENTS ─────────────────────────
function Page1({ colors }: { colors: any }) {
  return (
    <View style={styles.pageCenter}>
      <AnimatedItem delay={0}><MiniLogo size={52} /></AnimatedItem>
      <AnimatedItem delay={100} style={{ marginTop: 12 }}><Text style={[styles.wordmark, { color: colors.text }]}>Look<Text style={{ color: colors.accent }}>Away</Text></Text></AnimatedItem>
      <AnimatedItem delay={250} style={{ marginVertical: 12 }}><BlinkingEye active colors={colors} /></AnimatedItem>
      <AnimatedItem delay={400}><Text style={[styles.heading, { color: colors.text }]}>{'How much can\nyou remember?'}</Text></AnimatedItem>
      <AnimatedItem delay={550}><Text style={[styles.subtext, { color: colors.textMid }]}>A scene flashes before your eyes. Shapes, colours, positions. Then it vanishes. Can you recall what you saw?</Text></AnimatedItem>
    </View>
  );
}

function Page2({ colors }: { colors: any }) {
  return (
    <View style={styles.pageCenter}>
      <AnimatedItem delay={0}><View style={[styles.stepBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentMid }]}><Text style={[styles.stepBadgeText, { color: colors.accent }]}>STEP 1</Text></View></AnimatedItem>
      <AnimatedItem delay={100}><Text style={[styles.heading, { color: colors.text }]}>Memorise the scene</Text></AnimatedItem>
      <AnimatedItem delay={200}><Text style={[styles.subtext, { color: colors.textMid }]}>You have a few seconds. Study every shape, colour and position carefully.</Text></AnimatedItem>
      <AnimatedItem delay={400} style={{ marginVertical: 16 }}><MiniScene colors={colors} /></AnimatedItem>
      <AnimatedItem delay={500}><TimerBar colors={colors} /></AnimatedItem>
      <AnimatedItem delay={600}><Text style={{ fontSize: 13, color: colors.textLight, fontWeight: '500', marginTop: 12 }}>Study every detail...</Text></AnimatedItem>
    </View>
  );
}

function Page3({ colors }: { colors: any }) {
  return (
    <View style={styles.pageCenter}>
      <AnimatedItem delay={0}><View style={[styles.stepBadge, { backgroundColor: colors.correctSoft, borderColor: colors.correct + '30' }]}><Text style={[styles.stepBadgeText, { color: colors.correct }]}>STEP 2</Text></View></AnimatedItem>
      <AnimatedItem delay={100}><Text style={[styles.heading, { color: colors.text }]}>Answer from memory</Text></AnimatedItem>
      <AnimatedItem delay={200}><Text style={[styles.subtext, { color: colors.textMid }]}>Five questions test what you saw. Colours, counts, positions. Trust your memory.</Text></AnimatedItem>
      <AnimatedItem delay={350}>
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
          {[1,2,3,4,5].map(i => <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i === 1 ? colors.accent : colors.border }} />)}
        </View>
      </AnimatedItem>
      <AnimatedItem delay={500}><QuestionCard colors={colors} /></AnimatedItem>
    </View>
  );
}

function Page4({ colors, onFinish }: { colors: any; onFinish: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 1000); return () => clearTimeout(t); }, []);
  return (
    <View style={styles.pageCenter}>
      <AnimatedItem delay={0}><View style={[styles.stepBadge, { backgroundColor: colors.goldSoft, borderColor: colors.gold + '40' }]}><Text style={[styles.stepBadgeText, { color: colors.gold }]}>STEP 3</Text></View></AnimatedItem>
      <AnimatedItem delay={100}><Text style={[styles.heading, { color: colors.text }]}>Share your score</Text></AnimatedItem>
      <AnimatedItem delay={200}><Text style={[styles.subtext, { color: colors.textMid }]}>Everyone gets the same daily challenge. Compare with friends. Who remembers more?</Text></AnimatedItem>
      <AnimatedItem delay={400} style={{ marginVertical: 12 }}><ScoreCard colors={colors} /></AnimatedItem>
      <AnimatedItem delay={700}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {[{ t: '200+ levels', c: colors.accent }, { t: 'Daily challenge', c: colors.correct }, { t: 'Brain training', c: colors.gold }].map((f, i) => (
            <View key={i} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: f.c + '12', borderWidth: 1, borderColor: f.c + '30' }}><Text style={{ fontSize: 12, fontWeight: '600', color: f.c }}>{f.t}</Text></View>
          ))}
        </View>
      </AnimatedItem>
      {ready && (
        <AnimatedItem delay={0}>
          <TouchableOpacity onPress={onFinish} activeOpacity={0.85} style={[styles.ctaButton, { backgroundColor: colors.accent }]}>
            <Text style={styles.ctaButtonText}>Start playing</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 8, textAlign: 'center' }}>Free to play. No account needed.</Text>
        </AnimatedItem>
      )}
    </View>
  );
}

// ─── MAIN ONBOARDING ────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [page, setPage] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // Page transition animation
  const contentOpacity = useRef(new RNAnimated.Value(1)).current;
  const contentSlide = useRef(new RNAnimated.Value(0)).current;

  const goToPage = useCallback((target: number) => {
    if (transitioning || target === page) return;
    setTransitioning(true);
    // Fade out current
    RNAnimated.parallel([
      RNAnimated.timing(contentOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      RNAnimated.timing(contentSlide, { toValue: target > page ? -30 : 30, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setPage(target);
      // Set starting position for new page
      contentSlide.setValue(target > page ? 30 : -30);
      // Fade in new
      RNAnimated.parallel([
        RNAnimated.timing(contentOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        RNAnimated.spring(contentSlide, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      ]).start(() => setTransitioning(false));
    });
  }, [page, transitioning, contentOpacity, contentSlide]);

  const finish = useCallback(() => {
    try { localStorage.setItem('lookaway_onboarded', 'true'); } catch {}
    router.replace({ pathname: '/(auth)/login', params: { mode: 'signup' } });
  }, [router]);

  const next = () => goToPage(Math.min(page + 1, 3));
  const prev = () => goToPage(Math.max(page - 1, 0));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {/* Skip */}
      {page < 3 && (
        <TouchableOpacity onPress={() => goToPage(3)} style={styles.skipButton} activeOpacity={0.7}>
          <Text style={[styles.skipText, { color: colors.textLight }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Content — animated wrapper */}
      <RNAnimated.View style={[styles.contentArea, { opacity: contentOpacity, transform: [{ translateX: contentSlide }] }]}>
        {page === 0 && <Page1 colors={colors} />}
        {page === 1 && <Page2 colors={colors} />}
        {page === 2 && <Page3 colors={colors} />}
        {page === 3 && <Page4 colors={colors} onFinish={finish} />}
      </RNAnimated.View>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <PageDots current={page} total={4} colors={colors} />
        {page < 3 && (
          <View style={styles.navButtons}>
            {page > 0 && (
              <TouchableOpacity onPress={prev} disabled={transitioning} style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
                <Text style={[styles.backButtonText, { color: colors.textMid }]}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={next} disabled={transitioning} style={[styles.nextButton, { backgroundColor: colors.accent, flex: page > 0 ? 2 : 1 }]} activeOpacity={0.85}>
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
  pageCenter: { alignItems: 'center', gap: 8, maxWidth: 300, width: '100%' },
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
