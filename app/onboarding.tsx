import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated as RNAnimated,
  Dimensions,
  FlatList,
  Platform,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Polygon, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';

const { width: SCREEN_W } = Dimensions.get('window');

// Colours matching the mockup
const C = {
  bg: '#FAFAF7',
  accent: '#6C5CE7',
  accentL: '#A29BFE',
  accentD: '#4A3BBF',
  green: '#00B894',
  coral: '#FF6B6B',
  gold: '#D4A012',
  blue: '#0984E3',
  teal: '#00CEC9',
  pink: '#FD79A8',
  text: '#1A1A18',
  textM: '#636E72',
  textD: '#B2BEC3',
};

// ─── ANIMATED COUNTER ──────────────────────────────────────
function Counter({ target, duration = 1500, suffix = '', prefix = '' }: { target: number; duration?: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const pct = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - pct, 3);
      setVal(Math.round(target * eased));
      if (pct < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <Text>{prefix}{val}{suffix}</Text>;
}

// ─── FADE-IN WRAPPER ───────────────────────────────────────
function FadeIn({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: ViewStyle }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(12)).current;
  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(12);
    const t = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        RNAnimated.spring(translateY, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, [delay, opacity, translateY]);
  return <RNAnimated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</RNAnimated.View>;
}

// ═══ SCREEN 1: EMOTIONAL HOOK ═══════════════════════════════
function Screen1() {
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;
  useEffect(() => {
    const loop = () => {
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 1.06, duration: 600, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start(loop);
    };
    loop();
  }, [pulseAnim]);

  return (
    <View style={s.screenCenter}>
      <FadeIn delay={200}>
        <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <LinearGradient
            colors={[`${C.accent}15`, `${C.accentL}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 120, height: 120, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <LinearGradient
              colors={[`${C.accent}20`, `${C.accentL}15`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
            >
              <Svg width={44} height={44} viewBox="0 0 48 48">
                <Path
                  d="M24,6 C18,6 14,10 14,14 C10,14 8,18 8,22 C8,26 10,28 12,29 C12,34 16,38 20,40 L20,42 L28,42 L28,40 C32,38 36,34 36,29 C38,28 40,26 40,22 C40,18 38,14 34,14 C34,10 30,6 24,6Z"
                  fill="none" stroke={C.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                />
                <Path d="M24,14 L24,42" fill="none" stroke={C.accent} strokeWidth={1.5} strokeDasharray="2,3" opacity={0.4} />
                <Path d="M18,20 C20,18 22,20 24,18" fill="none" stroke={C.accent} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
                <Path d="M24,24 C26,22 28,24 30,22" fill="none" stroke={C.accent} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
              </Svg>
            </LinearGradient>
          </LinearGradient>
        </RNAnimated.View>
      </FadeIn>

      <FadeIn delay={500}>
        <Text style={s.heroTitle}>
          Your memory is{'\n'}more powerful{'\n'}than you think
        </Text>
      </FadeIn>

      <FadeIn delay={800}>
        <Text style={s.heroSub}>You just need to train it.</Text>
      </FadeIn>
    </View>
  );
}

// ═══ SCREEN 2: SCIENCE-BACKED BENEFITS ══════════════════════
function Screen2() {
  const benefits = [
    { stat: 23, label: 'faster recall', desc: 'Memory training improves how quickly you retrieve information', color: C.blue },
    { stat: 31, label: 'better focus', desc: 'Visual memory exercises strengthen attention and concentration', color: C.green },
    { stat: 40, label: 'sharper with age', desc: 'Consistent brain training helps maintain cognitive function long-term', color: C.accent },
  ];

  return (
    <View style={s.screenLeft}>
      <FadeIn delay={200}>
        <Text style={s.sectionLabel}>BACKED BY SCIENCE</Text>
        <Text style={s.sectionTitle}>Memory training{'\n'}actually works</Text>
      </FadeIn>

      {benefits.map((b, i) => (
        <FadeIn key={i} delay={400 + i * 200}>
          <View style={[s.benefitRow, i < 2 && s.benefitBorder]}>
            <View style={[s.benefitIcon, { backgroundColor: `${b.color}08` }]}>
              {i === 0 && (
                <Svg width={22} height={22} viewBox="0 0 40 40">
                  <Circle cx={20} cy={20} r={14} fill="none" stroke={b.color} strokeWidth={2.5} />
                  <Path d="M20,12 L20,20 L27,24" fill="none" stroke={b.color} strokeWidth={2.5} strokeLinecap="round" />
                </Svg>
              )}
              {i === 1 && (
                <Svg width={22} height={22} viewBox="0 0 40 40">
                  <Circle cx={20} cy={20} r={14} fill="none" stroke={b.color} strokeWidth={2.5} />
                  <Path d="M14,20 C14,20 18,28 26,14" fill="none" stroke={b.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
              {i === 2 && (
                <Svg width={22} height={22} viewBox="0 0 40 40">
                  <Path d="M8,28 L16,16 L24,22 L32,10" fill="none" stroke={b.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  <Circle cx={32} cy={10} r={3} fill={b.color} />
                </Svg>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: b.color }}>
                  <Counter target={b.stat} suffix="%" duration={1200 + i * 300} />
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{b.label}</Text>
              </View>
              <Text style={{ fontSize: 11, color: C.textM, lineHeight: 15 }}>{b.desc}</Text>
            </View>
          </View>
        </FadeIn>
      ))}
    </View>
  );
}

// ═══ SCREEN 3: THE COMMITMENT ═══════════════════════════════
function Screen3() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const [filledDays, setFilledDays] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFilledDays(d => (d < 7 ? d + 1 : d)), 300);
    return () => clearInterval(t);
  }, []);

  const dayAnims = useRef(days.map(() => new RNAnimated.Value(0.9))).current;
  useEffect(() => {
    if (filledDays > 0 && filledDays <= 7) {
      RNAnimated.spring(dayAnims[filledDays - 1], {
        toValue: 1,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [filledDays, dayAnims]);

  return (
    <View style={s.screenCenter}>
      <FadeIn delay={200}>
        <Text style={[s.sectionTitle, { textAlign: 'center' }]}>Just 2 minutes a day</Text>
        <Text style={[s.heroSub, { marginBottom: 28 }]}>That's all it takes to build a sharper memory</Text>
      </FadeIn>

      <FadeIn delay={500}>
        <View style={s.weekCard}>
          <Text style={s.weekLabel}>YOUR FIRST WEEK</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {days.map((d, i) => {
              const filled = i < filledDays;
              return (
                <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                  <RNAnimated.View style={[
                    s.dayCircle,
                    {
                      backgroundColor: filled ? `${C.coral}12` : '#F5F4F0',
                      borderColor: filled ? C.coral : 'transparent',
                      transform: [{ scale: dayAnims[i] }],
                    },
                  ]}>
                    {filled ? (
                      <Svg width={16} height={16} viewBox="0 0 100 100">
                        <Path
                          d="M50,88 C20,65 5,50 5,32 C5,18 16,8 30,8 C38,8 45,12 50,20 C55,12 62,8 70,8 C84,8 95,18 95,32 C95,50 80,65 50,88Z"
                          fill={C.coral}
                        />
                      </Svg>
                    ) : (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0DCDA' }} />
                    )}
                  </RNAnimated.View>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: filled ? C.text : C.textD }}>{d}</Text>
                </View>
              );
            })}
          </View>
          {filledDays >= 7 && (
            <View style={s.streakBanner}>
              <Text style={s.streakText}>{'🔥 7-day streak \u2014 you did it!'}</Text>
            </View>
          )}
        </View>
      </FadeIn>

      <FadeIn delay={900}>
        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          {[
            { value: '2 min', label: 'per session', color: C.accent },
            { value: '14 min', label: 'per week', color: C.blue },
            { value: '12 hrs', label: 'per year', color: C.green },
          ].map((stat, i) => (
            <View key={i} style={s.microStat}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: stat.color }}>{stat.value}</Text>
              <Text style={{ fontSize: 9, color: C.textD, marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </FadeIn>
    </View>
  );
}

// ═══ SCREEN 4: HOW IT WORKS ═════════════════════════════════
function Screen4() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(prev => (prev + 1) % 3), 2000);
    return () => clearInterval(t);
  }, []);

  const stepFadeAnim = useRef(new RNAnimated.Value(1)).current;
  const stepScaleAnim = useRef(new RNAnimated.Value(1)).current;
  const prevStep = useRef(step);

  useEffect(() => {
    if (prevStep.current !== step) {
      prevStep.current = step;
      stepFadeAnim.setValue(0);
      stepScaleAnim.setValue(0.97);
      RNAnimated.parallel([
        RNAnimated.timing(stepFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        RNAnimated.spring(stepScaleAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
      ]).start();
    }
  }, [step, stepFadeAnim, stepScaleAnim]);

  const steps = [
    { num: '1', title: 'Memorise', desc: 'Study the shapes, colours, and positions' },
    { num: '2', title: 'Go blank', desc: 'The scene disappears completely' },
    { num: '3', title: 'Answer', desc: 'Test your memory with questions' },
  ];

  return (
    <View style={s.screenLeft}>
      <FadeIn delay={200}>
        <Text style={s.sectionLabel}>HOW IT WORKS</Text>
        <Text style={s.sectionTitle}>Simple, fun,{'\n'}surprisingly addictive</Text>
      </FadeIn>

      <FadeIn delay={400}>
        <RNAnimated.View style={{ opacity: stepFadeAnim, transform: [{ scale: stepScaleAnim }], marginBottom: 20 }}>
          {step === 0 && (
            <View style={s.stepVisual}>
              <View style={{ position: 'absolute', left: '15%', top: '18%' }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.coral }} />
              </View>
              <View style={{ position: 'absolute', right: '18%', top: '20%' }}>
                <View style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: C.blue }} />
              </View>
              <View style={{ position: 'absolute', left: '45%', top: '40%' }}>
                <Svg width={24} height={24} viewBox="0 0 100 100">
                  <Polygon points="50,5 62,35 95,35 68,55 78,90 50,70 22,90 32,55 5,35 38,35" fill={C.accent} />
                </Svg>
              </View>
              <View style={{ position: 'absolute', left: '20%', bottom: '15%' }}>
                <Svg width={22} height={22} viewBox="0 0 100 100">
                  <Polygon points="50,8 95,88 5,88" fill={C.green} />
                </Svg>
              </View>
              <View style={{ position: 'absolute', right: '20%', bottom: '18%' }}>
                <Svg width={20} height={20} viewBox="0 0 100 100">
                  <Polygon points="50,5 95,50 50,95 5,50" fill={C.gold} />
                </Svg>
              </View>
            </View>
          )}
          {step === 1 && (
            <View style={[s.stepVisual, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 2 }}>{'🫣'}</Text>
              <Text style={{ fontSize: 11, color: C.textD }}>Gone!</Text>
            </View>
          )}
          {step === 2 && (
            <View style={[s.stepVisual, { padding: 10 }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: C.text, marginBottom: 8 }}>How many shapes?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                {['4', '5', '6', '3'].map((v, i) => (
                  <View key={i} style={[
                    s.answerOption,
                    i === 1 && { backgroundColor: `${C.green}12`, borderColor: C.green, borderWidth: 1.5 },
                  ]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: i === 1 ? C.green : C.textD }}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </RNAnimated.View>
      </FadeIn>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {steps.map((st, i) => (
          <FadeIn key={i} delay={500 + i * 100}>
            <Pressable
              onPress={() => setStep(i)}
              style={[
                s.stepCard,
                {
                  backgroundColor: i === step ? `${C.accent}06` : 'white',
                  borderColor: i === step ? `${C.accent}20` : 'rgba(0,0,0,0.04)',
                },
              ]}
            >
              <View style={[s.stepNum, { backgroundColor: i === step ? C.accent : '#F0EFEB' }]}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: i === step ? 'white' : C.textD }}>{st.num}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: i === step ? C.accent : C.text }}>{st.title}</Text>
              <Text style={{ fontSize: 9, color: C.textD, marginTop: 2, lineHeight: 12 }}>{st.desc}</Text>
            </Pressable>
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

// ═══ SCREEN 5: SOCIAL PROOF ═════════════════════════════════
function Screen5() {
  const testimonials = [
    { name: 'Sarah M.', streak: '42 day streak', text: "I play every morning with my coffee. It's become my favourite way to wake up my brain.", avatar: 'S', color: C.coral },
    { name: 'James K.', streak: '28 day streak', text: "Started to improve my focus at work. Now I'm addicted to getting 3 stars on every level.", avatar: 'J', color: C.blue },
    { name: 'Maria L.', streak: '67 day streak', text: 'My memory has genuinely improved. I remember shopping lists without writing them down now!', avatar: 'M', color: C.green },
  ];

  return (
    <View style={s.screenLeft}>
      <FadeIn delay={200}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 2, marginBottom: 8 }}>
            {[1, 2, 3, 4].map(i => (
              <Svg key={i} width={18} height={18} viewBox="0 0 24 24">
                <Polygon points="12,2 15,8 22,9 17,14 18,21 12,17 6,21 7,14 2,9 9,8" fill={C.gold} />
              </Svg>
            ))}
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Defs>
                <SvgLinearGradient id="partialStar" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0.8" stopColor={C.gold} />
                  <Stop offset="0.8" stopColor={`${C.gold}25`} />
                </SvgLinearGradient>
              </Defs>
              <Polygon points="12,2 15,8 22,9 17,14 18,21 12,17 6,21 7,14 2,9 9,8" fill="url(#partialStar)" />
            </Svg>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.textM }}>{'4.8 out of 5 \u00b7 App Store'}</Text>
        </View>
      </FadeIn>

      {testimonials.map((t, i) => (
        <FadeIn key={i} delay={400 + i * 200}>
          <View style={s.testimonialCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={[s.avatar, { backgroundColor: `${t.color}15` }]}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: t.color }}>{t.avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{t.name}</Text>
                <Text style={{ fontSize: 9, color: t.color, fontWeight: '600' }}>{'🔥 '}{t.streak}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: C.textM, lineHeight: 18 }}>{`\u201c${t.text}\u201d`}</Text>
          </View>
        </FadeIn>
      ))}
    </View>
  );
}

// ═══ SCREEN 6: GET STARTED ══════════════════════════════════
function Screen6({ onPlay }: { onPlay: () => void }) {
  const shimmerAnim = useRef(new RNAnimated.Value(-30)).current;
  useEffect(() => {
    const loop = () => {
      shimmerAnim.setValue(-30);
      RNAnimated.timing(shimmerAnim, {
        toValue: 120,
        duration: 2000,
        useNativeDriver: false,
      }).start(loop);
    };
    loop();
  }, [shimmerAnim]);

  return (
    <View style={s.screenCenter}>
      <FadeIn delay={200}>
        <LinearGradient
          colors={[C.accent, C.accentL]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.logoBox}
        >
          <Svg width={42} height={26} viewBox="0 0 36 24">
            <Path d="M2 12Q18 2 34 12Q18 22 2 12Z" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth={1.2} />
            <Circle cx={18} cy={12} r={5} fill="white" />
          </Svg>
        </LinearGradient>
      </FadeIn>

      <FadeIn delay={400}>
        <Text style={[s.sectionTitle, { textAlign: 'center' }]}>Ready to train{'\n'}your memory?</Text>
        <Text style={[s.heroSub, { marginBottom: 28 }]}>
          Free to play. 2 minutes a day.{'\n'}Your brain will thank you.
        </Text>
      </FadeIn>

      <FadeIn delay={600}>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 28 }}>
          {[
            { icon: '🎮', label: '380+ levels' },
            { icon: '🧠', label: '6 game modes' },
            { icon: '👥', label: 'Challenge friends' },
          ].map((f, i) => (
            <View key={i} style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, marginBottom: 4 }}>{f.icon}</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: C.textM }}>{f.label}</Text>
            </View>
          ))}
        </View>
      </FadeIn>

      <FadeIn delay={800}>
        <View style={{ width: '100%' }}>
          <Pressable onPress={onPlay} style={{ borderRadius: 16, overflow: 'hidden' }}>
            <LinearGradient
              colors={[C.accent, C.accentD]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.ctaButton}
            >
              <RNAnimated.View
                style={[
                  s.shimmer,
                  {
                    left: shimmerAnim.interpolate({
                      inputRange: [-30, 120],
                      outputRange: ['-30%', '120%'],
                    }),
                  },
                ]}
              />
              <Text style={s.ctaText}>Play Now</Text>
            </LinearGradient>
          </Pressable>
          <Text style={{ marginTop: 10, fontSize: 11, color: C.textD, textAlign: 'center' }}>
            No account needed to try
          </Text>
        </View>
      </FadeIn>
    </View>
  );
}

// ═══ DOT INDICATORS ═════════════════════════════════════════
function Dots({ total, current }: { total: number; current: number }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === current ? C.accent : i < current ? C.accentL : '#E0DCDA',
          }}
        />
      ))}
    </View>
  );
}

// ═══ MAIN ONBOARDING ════════════════════════════════════════
const TOTAL_SCREENS = 6;

export default function OnboardingFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [current, setCurrent] = useState(0);
  const isLast = current === TOTAL_SCREENS - 1;

  const pageWidth = Platform.OS === 'web' ? Math.min(SCREEN_W, 430) : SCREEN_W;

  const onPlay = useCallback(() => {
    try { localStorage.setItem('blanked_onboarded', 'true'); } catch {}
    router.replace('/(auth)/login');
  }, [router]);

  const goTo = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrent(index);
  }, []);

  const onMomentumScrollEnd = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    setCurrent(idx);
  }, [pageWidth]);

  const renderItem = useCallback(({ index }: { index: number }) => {
    return (
      <View style={{ width: pageWidth, flex: 1, paddingTop: insets.top + 60 }}>
        {index === 0 && <Screen1 />}
        {index === 1 && <Screen2 />}
        {index === 2 && <Screen3 />}
        {index === 3 && <Screen4 />}
        {index === 4 && <Screen5 />}
        {index === 5 && <Screen6 onPlay={onPlay} />}
      </View>
    );
  }, [pageWidth, insets.top, onPlay]);

  const keyExtractor = useCallback((_: number, index: number) => String(index), []);

  return (
    <View style={[s.container, { backgroundColor: C.bg, maxWidth: Platform.OS === 'web' ? 430 : undefined, alignSelf: Platform.OS === 'web' ? 'center' : undefined, width: '100%' }]}>
      {/* Skip button */}
      {!isLast && (
        <Pressable onPress={() => goTo(TOTAL_SCREENS - 1)} style={[s.skipBtn, { top: insets.top + 12 }]}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.textD }}>Skip</Text>
        </Pressable>
      )}

      <FlatList
        ref={flatListRef}
        data={Array.from({ length: TOTAL_SCREENS }, (_, i) => i)}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Bottom: dots + continue */}
      {!isLast && (
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 36 }]}>
          <Dots total={TOTAL_SCREENS} current={current} />
          <Pressable
            onPress={() => goTo(current + 1)}
            style={s.continueBtn}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: 'white' }}>
              {current === 0 ? 'Tell me more' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ═══ STYLES ═════════════════════════════════════════════════
const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  screenCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  screenLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    lineHeight: 34,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 12,
  },
  heroSub: {
    fontSize: 15,
    color: C.textM,
    lineHeight: 24,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
    lineHeight: 29,
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
  },
  benefitBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 18,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  weekLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textD,
    letterSpacing: 1,
    marginBottom: 12,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBanner: {
    marginTop: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${C.coral}08`,
    alignItems: 'center',
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.coral,
  },
  microStat: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  stepVisual: {
    width: '100%',
    height: 120,
    backgroundColor: 'white',
    borderRadius: 14,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  answerOption: {
    width: '48%',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F5F4F0',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  stepCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 8,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 4,
  },
  ctaButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: 'transparent',
    // Shimmer effect via a semi-transparent white band
    borderLeftWidth: 0,
    // Using a View with opacity for the shimmer
    opacity: 0.18,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
    zIndex: 1,
  },
  bottomBar: {
    paddingHorizontal: 24,
    gap: 16,
  },
  continueBtn: {
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
});
