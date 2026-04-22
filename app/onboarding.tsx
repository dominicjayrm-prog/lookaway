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
import { track, EVENTS } from '@/src/lib/analytics';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import type { BlinkExpression } from '@/src/components/AnimatedBlink';
import { t } from '@/src/i18n';

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
function Counter({ target, duration = 1500, suffix = '', prefix = '', style, active = true }: { target: number; duration?: number; suffix?: string; prefix?: string; style?: any; active?: boolean }) {
  const [val, setVal] = useState(0);
  const hasRun = useRef(false);
  useEffect(() => {
    if (!active || hasRun.current) return;
    hasRun.current = true;
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
  }, [target, duration, active]);
  return <Text style={style}>{prefix}{val}{suffix}</Text>;
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

// ─── SCALE-IN WRAPPER (for icons/stars) ────────────────────
function ScaleIn({ delay = 0, children, active = true }: { delay?: number; children: React.ReactNode; active?: boolean }) {
  const scale = useRef(new RNAnimated.Value(0)).current;
  const hasRun = useRef(false);
  useEffect(() => {
    if (!active || hasRun.current) return;
    hasRun.current = true;
    const t = setTimeout(() => {
      RNAnimated.spring(scale, { toValue: 1, tension: 180, friction: 8, useNativeDriver: true }).start();
    }, delay);
    return () => clearTimeout(t);
  }, [delay, scale, active]);
  return <RNAnimated.View style={{ transform: [{ scale }] }}>{children}</RNAnimated.View>;
}

// ═══ SCREEN 1: EMOTIONAL HOOK ═══════════════════════════════
function Screen1({ isVisible }: { isVisible: boolean }) {
  const { colors: tc } = useTheme();
  // We only use floatAnim now — AnimatedBlink has its own breathing scale
  // built in via the `breathing` prop. The previous setup wrapped it in
  // an additional Animated.View with a redundant pulseAnim, which on iOS
  // caused the native driver to rasterize the SVG at its 120px logical
  // size and then scale it UP by ~1.10x (1.06 pulse × 1.04 breathing).
  // That's where the "pixelated" look came from — bitmap upscaling.
  // Now we do: one native-driver translateY (no scaling), and let the
  // SVG render cleanly at a higher source size (160) so even the
  // internal breathing scale doesn't exceed the rasterized resolution.
  const floatAnim = useRef(new RNAnimated.Value(0)).current;
  // Eye look-down: Blink glances down at the text after a pause
  const [lookY, setLookY] = useState(0);
  const lookRan = useRef(false);
  useEffect(() => {
    if (!isVisible || lookRan.current) return;
    lookRan.current = true;
    // Wait for text to fade in, then slowly look down
    const delay = setTimeout(() => {
      const start = Date.now();
      const duration = 1200; // slow, natural eye movement
      const tick = () => {
        const t = Math.min(1, (Date.now() - start) / duration);
        // Ease-in-out cubic for natural eye movement
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        setLookY(eased * 0.8); // 0.8 = not fully down, just a glance
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, 1500); // start after title fades in
    return () => clearTimeout(delay);
  }, [isVisible]);

  useEffect(() => {
    const floatLoop = () => {
      RNAnimated.sequence([
        RNAnimated.timing(floatAnim, { toValue: -5, duration: 1500, useNativeDriver: true }),
        RNAnimated.timing(floatAnim, { toValue: 5, duration: 1500, useNativeDriver: true }),
      ]).start(floatLoop);
    };
    floatLoop();
  }, [floatAnim]);

  return (
    <View style={s.screenCenter}>
      <FadeIn delay={200}>
        <RNAnimated.View style={{ transform: [{ translateY: floatAnim }] }}>
          <AnimatedBlink expression="normal" size={160} lookOffset={{ x: 0, y: lookY }} />
        </RNAnimated.View>
      </FadeIn>

      <FadeIn delay={500}>
        <Text style={[s.heroTitle, { color: tc.text }]}>{t('onboarding.screen1.title')}</Text>
      </FadeIn>

      <FadeIn delay={800}>
        <Text style={[s.heroSub, { color: tc.textMid }]}>{t('onboarding.screen1.subtitle')}</Text>
      </FadeIn>
    </View>
  );
}

// ═══ SCREEN 2: SCIENCE-BACKED BENEFITS ══════════════════════
function Screen2({ isVisible }: { isVisible: boolean }) {
  const { colors: tc } = useTheme();
  const benefits = [
    { stat: 23, label: t('onboarding.screen2.benefit_1_label'), desc: t('onboarding.screen2.benefit_1_desc'), color: C.blue },
    { stat: 31, label: t('onboarding.screen2.benefit_2_label'), desc: t('onboarding.screen2.benefit_2_desc'), color: C.green },
    { stat: 40, label: t('onboarding.screen2.benefit_3_label'), desc: t('onboarding.screen2.benefit_3_desc'), color: C.accent },
  ];

  return (
    <View style={s.screenLeft}>
      <FadeIn delay={200}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <AnimatedBlink expression="memorise" size={36} entrance="fade" />
          <Text style={s.sectionLabel}>{t('onboarding.screen2.label')}</Text>
        </View>
        <Text style={[s.sectionTitle, { color: tc.text }]}>{t('onboarding.screen2.title')}</Text>
      </FadeIn>

      {benefits.map((b, i) => (
        <FadeIn key={i} delay={400 + i * 200}>
          <View style={[s.benefitRow, i < 2 && [s.benefitBorder, { borderBottomColor: tc.border }]]}>
            <ScaleIn delay={500 + i * 200} active={isVisible}>
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
            </ScaleIn>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
                <Counter target={b.stat} suffix="%" duration={1200 + i * 300} active={isVisible} style={{ fontSize: 22, fontWeight: '800', color: b.color }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: tc.text }}>{b.label}</Text>
              </View>
              <Text style={{ fontSize: 11, color: tc.textMid, lineHeight: 15 }}>{b.desc}</Text>
            </View>
          </View>
        </FadeIn>
      ))}
    </View>
  );
}

// ═══ SCREEN 3: THE COMMITMENT ═══════════════════════════════
function Screen3({ isVisible }: { isVisible: boolean }) {
  const { colors: tc } = useTheme();
  // Week-day letters localise — Spanish uses L/M/X/J/V/S/D, not M/T/W/T/F/S/S.
  const days = [
    t('onboarding.screen3.day_1'),
    t('onboarding.screen3.day_2'),
    t('onboarding.screen3.day_3'),
    t('onboarding.screen3.day_4'),
    t('onboarding.screen3.day_5'),
    t('onboarding.screen3.day_6'),
    t('onboarding.screen3.day_7'),
  ];
  const [filledDays, setFilledDays] = useState(0);
  const hasRunDays = useRef(false);
  useEffect(() => {
    if (!isVisible || hasRunDays.current) return;
    hasRunDays.current = true;
    const t = setInterval(() => setFilledDays(d => (d < 7 ? d + 1 : d)), 300);
    return () => clearInterval(t);
  }, [isVisible]);

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
        <Text style={[s.sectionTitle, { textAlign: 'center', color: tc.text }]}>{t('onboarding.screen3.title')}</Text>
        <Text style={[s.heroSub, { marginBottom: 28, color: tc.textMid }]}>{t('onboarding.screen3.subtitle')}</Text>
      </FadeIn>

      <FadeIn delay={500}>
        <View style={[s.weekCard, { backgroundColor: tc.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={[s.weekLabel, { marginBottom: 0, color: tc.textLight }]}>{t('onboarding.screen3.first_week')}</Text>
            <AnimatedBlink expression="streak" size={32} entrance="fade" />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {days.map((d, i) => {
              const filled = i < filledDays;
              return (
                <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                  <RNAnimated.View style={[
                    s.dayCircle,
                    {
                      backgroundColor: filled ? `${C.coral}12` : tc.surface,
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
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tc.textLight }} />
                    )}
                  </RNAnimated.View>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: filled ? tc.text : tc.textLight }}>{d}</Text>
                </View>
              );
            })}
          </View>
          {filledDays >= 7 && (
            <ScaleIn delay={0} active={true}>
              <View style={s.streakBanner}>
                <Text style={s.streakText}>{t('onboarding.screen3.streak_complete')}</Text>
              </View>
            </ScaleIn>
          )}
        </View>
      </FadeIn>

      <FadeIn delay={900}>
        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          {[
            { value: t('onboarding.screen3.stat_session_value'), label: t('onboarding.screen3.stat_session_label'), color: C.accent },
            { value: t('onboarding.screen3.stat_week_value'), label: t('onboarding.screen3.stat_week_label'), color: C.blue },
            { value: t('onboarding.screen3.stat_year_value'), label: t('onboarding.screen3.stat_year_label'), color: C.green },
          ].map((stat, i) => (
            <View key={i} style={[s.microStat, { backgroundColor: tc.card }]}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: stat.color }}>{stat.value}</Text>
              <Text style={{ fontSize: 9, color: tc.textLight, marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </FadeIn>
    </View>
  );
}

// ═══ SCREEN 4: HOW IT WORKS ═════════════════════════════════
function Screen4({ isVisible }: { isVisible: boolean }) {
  const { colors: tc } = useTheme();
  const [step, setStep] = useState(0);
  const hasRunSteps = useRef(false);
  useEffect(() => {
    if (!isVisible || hasRunSteps.current) return;
    hasRunSteps.current = true;
    const t = setInterval(() => setStep(prev => (prev + 1) % 3), 2000);
    return () => clearInterval(t);
  }, [isVisible]);

  // Individual opacity for each step visual (crossfade)
  const step0Opacity = useRef(new RNAnimated.Value(1)).current;
  const step1Opacity = useRef(new RNAnimated.Value(0)).current;
  const step2Opacity = useRef(new RNAnimated.Value(0)).current;
  const stepOpacities = [step0Opacity, step1Opacity, step2Opacity];

  useEffect(() => {
    stepOpacities.forEach((anim, i) => {
      RNAnimated.timing(anim, { toValue: i === step ? 1 : 0, duration: 300, useNativeDriver: true }).start();
    });
  }, [step]);

  // Tight copy — descriptions must fit in 2 lines inside the step
  // cards on an iPhone SE / Mini without overflowing into the
  // pagination dots. Previously "The scene disappears completely"
  // wrapped to 3 lines and spilled over the bottom bar.
  const steps = [
    { num: '1', title: t('onboarding.screen4.step_1_title'), desc: t('onboarding.screen4.step_1_desc') },
    { num: '2', title: t('onboarding.screen4.step_2_title'), desc: t('onboarding.screen4.step_2_desc') },
    { num: '3', title: t('onboarding.screen4.step_3_title'), desc: t('onboarding.screen4.step_3_desc') },
  ];

  return (
    <View style={s.screenLeft}>
      <FadeIn delay={200}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <AnimatedBlink expression={(['memorise', 'blank', 'correct'] as BlinkExpression[])[step]} size={40} />
          <Text style={s.sectionLabel}>{t('onboarding.screen4.label')}</Text>
        </View>
        <Text style={[s.sectionTitle, { color: tc.text }]}>{t('onboarding.screen4.title')}</Text>
      </FadeIn>

      <FadeIn delay={400}>
        <View style={{ marginBottom: 20, height: 140 }}>
          {/* Step 0: Memorise shapes */}
          <RNAnimated.View style={{ opacity: step0Opacity, position: 'absolute', width: '100%' }}>
            <View style={[s.stepVisual, { backgroundColor: tc.card, height: 140 }]}>
              <View style={{ position: 'absolute', left: 30, top: 22 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.coral }} />
              </View>
              <View style={{ position: 'absolute', right: 40, top: 24 }}>
                <View style={{ width: 26, height: 26, borderRadius: 5, backgroundColor: C.blue }} />
              </View>
              <View style={{ position: 'absolute', left: '45%', top: 48 }}>
                <Svg width={28} height={28} viewBox="0 0 100 100">
                  <Polygon points="50,5 62,35 95,35 68,55 78,90 50,70 22,90 32,55 5,35 38,35" fill={C.accent} />
                </Svg>
              </View>
              <View style={{ position: 'absolute', left: 44, bottom: 18 }}>
                <Svg width={26} height={26} viewBox="0 0 100 100">
                  <Polygon points="50,8 95,88 5,88" fill={C.green} />
                </Svg>
              </View>
              <View style={{ position: 'absolute', right: 44, bottom: 22 }}>
                <Svg width={24} height={24} viewBox="0 0 100 100">
                  <Polygon points="50,5 95,50 50,95 5,50" fill={C.gold} />
                </Svg>
              </View>
            </View>
          </RNAnimated.View>
          {/* Step 1: Gone! */}
          <RNAnimated.View style={{ opacity: step1Opacity, position: 'absolute', width: '100%' }}>
            <View style={[s.stepVisual, { height: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: tc.card }]}>
              <AnimatedBlink expression="blank" size={56} />
              <Text style={{ fontSize: 11, color: tc.textLight, marginTop: 4 }}>{t('onboarding.screen4.gone')}</Text>
            </View>
          </RNAnimated.View>
          {/* Step 2: Answer */}
          <RNAnimated.View style={{ opacity: step2Opacity, position: 'absolute', width: '100%' }}>
            <View style={[s.stepVisual, { height: 140, padding: 14, backgroundColor: tc.card }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: tc.text, marginBottom: 8 }}>{t('onboarding.screen4.sample_q')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                {['4', '5', '6', '3'].map((v, i) => (
                  <View key={i} style={[
                    s.answerOption, { backgroundColor: tc.surface },
                    i === 1 && { backgroundColor: `${C.green}12`, borderColor: C.green, borderWidth: 1.5 },
                  ]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: i === 1 ? C.green : tc.textLight }}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          </RNAnimated.View>
        </View>
      </FadeIn>

      <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
        {steps.map((st, i) => (
          <FadeIn key={i} delay={500 + i * 100} style={{ flex: 1 }}>
            <Pressable
              onPress={() => setStep(i)}
              style={[
                s.stepCard,
                {
                  backgroundColor: i === step ? `${C.accent}0F` : tc.card,
                  borderColor: i === step ? C.accent : tc.border,
                },
              ]}
            >
              <View style={[s.stepNum, { backgroundColor: i === step ? C.accent : tc.surface }]}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: i === step ? 'white' : tc.textLight }}>{st.num}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: i === step ? C.accent : tc.text, marginTop: 4 }} numberOfLines={1}>{st.title}</Text>
              <Text style={{ fontSize: 11, color: tc.textLight, marginTop: 3, lineHeight: 14 }} numberOfLines={2}>{st.desc}</Text>
            </Pressable>
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

// ═══ SCREEN 5: SOCIAL PROOF ═════════════════════════════════
function Screen5({ isVisible }: { isVisible: boolean }) {
  const { colors: tc } = useTheme();
  // Names stay in their native form across locales — "Sarah M." is
  // a marketing proof point, not copy. Streak counts interpolate
  // into a localised template because Spanish reads as "Racha de
  // 42 días" rather than "42 day streak".
  const testimonials = [
    { name: 'Sarah M.', streak: t('onboarding.screen5.streak_days', { count: 42 }), text: t('onboarding.screen5.testimonial_1_text'), avatar: 'S', color: C.coral },
    { name: 'James K.', streak: t('onboarding.screen5.streak_days', { count: 28 }), text: t('onboarding.screen5.testimonial_2_text'), avatar: 'J', color: C.blue },
    { name: 'Maria L.', streak: t('onboarding.screen5.streak_days', { count: 67 }), text: t('onboarding.screen5.testimonial_3_text'), avatar: 'M', color: C.green },
  ];

  return (
    <View style={s.screenLeft}>
      <FadeIn delay={200}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 2, marginBottom: 8 }}>
            {[1, 2, 3, 4].map(i => (
              <ScaleIn key={i} delay={200 + i * 80} active={isVisible}>
                <Svg width={18} height={18} viewBox="0 0 24 24">
                  <Polygon points="12,2 15,8 22,9 17,14 18,21 12,17 6,21 7,14 2,9 9,8" fill={C.gold} />
                </Svg>
              </ScaleIn>
            ))}
            <ScaleIn delay={200 + 5 * 80} active={isVisible}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Defs>
                  <SvgLinearGradient id="partialStar" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0.8" stopColor={C.gold} />
                    <Stop offset="0.8" stopColor={`${C.gold}25`} />
                  </SvgLinearGradient>
                </Defs>
                <Polygon points="12,2 15,8 22,9 17,14 18,21 12,17 6,21 7,14 2,9 9,8" fill="url(#partialStar)" />
              </Svg>
            </ScaleIn>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <AnimatedBlink expression="love" size={32} entrance="fade" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: tc.textMid }}>{t('onboarding.screen5.rating')}</Text>
          </View>
        </View>
      </FadeIn>

      {testimonials.map((item, i) => (
        <FadeIn key={i} delay={400 + i * 200}>
          <View style={[s.testimonialCard, { backgroundColor: tc.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <ScaleIn delay={500 + i * 200} active={isVisible}>
                <View style={[s.avatar, { backgroundColor: `${item.color}15` }]}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: item.color }}>{item.avatar}</Text>
                </View>
              </ScaleIn>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: tc.text }}>{item.name}</Text>
                <Text style={{ fontSize: 9, color: item.color, fontWeight: '600' }}>{'🔥 '}{item.streak}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: tc.textMid, lineHeight: 18 }}>{`\u201c${item.text}\u201d`}</Text>
          </View>
        </FadeIn>
      ))}
    </View>
  );
}

// ═══ SCREEN 6: GET STARTED ══════════════════════════════════
function Screen6({ onPlay, isVisible }: { onPlay: () => void; isVisible: boolean }) {
  const { colors: tc } = useTheme();
  // Shimmer sweep
  const shimmerAnim = useRef(new RNAnimated.Value(-30)).current;
  useEffect(() => {
    const loop = () => {
      shimmerAnim.setValue(-30);
      RNAnimated.timing(shimmerAnim, { toValue: 120, duration: 2000, useNativeDriver: false }).start(loop);
    };
    loop();
  }, [shimmerAnim]);

  // Logo floating
  const logoFloat = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const loop = () => {
      RNAnimated.sequence([
        RNAnimated.timing(logoFloat, { toValue: -4, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(logoFloat, { toValue: 4, duration: 1200, useNativeDriver: true }),
      ]).start(loop);
    };
    loop();
  }, [logoFloat]);

  // Button press scale
  const btnScale = useRef(new RNAnimated.Value(1)).current;
  const onPressIn = () => RNAnimated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, tension: 200, friction: 10 }).start();
  const onPressOut = () => RNAnimated.spring(btnScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();

  return (
    <View style={s.screenCenter}>
      <FadeIn delay={200}>
        <RNAnimated.View style={{ transform: [{ translateY: logoFloat }] }}>
          <AnimatedBlink expression="celebrate" size={80} entrance="spring" entranceDelay={300} />
        </RNAnimated.View>
      </FadeIn>

      <FadeIn delay={400}>
        <Text style={[s.sectionTitle, { textAlign: 'center', color: tc.text }]}>{t('onboarding.screen6.title')}</Text>
        <Text style={[s.heroSub, { marginBottom: 28, color: tc.textMid }]}>{t('onboarding.screen6.subtitle')}</Text>
      </FadeIn>

      <FadeIn delay={600}>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 28 }}>
          {[
            { icon: '🎮', label: t('onboarding.screen6.feature_levels') },
            { icon: '🧠', label: t('onboarding.screen6.feature_modes') },
            { icon: '👥', label: t('onboarding.screen6.feature_friends') },
          ].map((f, i) => (
            <ScaleIn key={i} delay={700 + i * 100} active={isVisible}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 22, marginBottom: 4 }}>{f.icon}</Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: tc.textMid }}>{f.label}</Text>
              </View>
            </ScaleIn>
          ))}
        </View>
      </FadeIn>

      <FadeIn delay={800} style={{ width: '100%' }}>
        <View>
          <Pressable onPress={onPlay} onPressIn={onPressIn} onPressOut={onPressOut}>
            <RNAnimated.View style={{ transform: [{ scale: btnScale }], borderRadius: 16, overflow: 'hidden' }}>
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
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.25)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1 }}
                  />
                </RNAnimated.View>
                <Text style={s.ctaText}>{t('onboarding.screen6.cta')}</Text>
              </LinearGradient>
            </RNAnimated.View>
          </Pressable>
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
            backgroundColor: i === current ? C.accent : i < current ? C.accentL : C.textD,
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
  const [visibleIndex, setVisibleIndex] = useState(0);
  const isLast = current === TOTAL_SCREENS - 1;

  const pageWidth = Platform.OS === 'web' ? Math.min(SCREEN_W, 430) : SCREEN_W;

  // Visibility tracking for lazy animations
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      const idx = viewableItems[0].index;
      setVisibleIndex(idx);
      // Fires once per step the user actually looks at — this is the
      // drop-off funnel ("90% see step 0, 60% see step 1, ..."). If
      // a player swipes away without ever reaching the final step,
      // the missing event tells us where they bailed.
      track(EVENTS.ONBOARDING_STEP_VIEWED, { step: idx });
    }
  }).current;

  const onPlay = useCallback(() => {
    try { localStorage.setItem('blanked_onboarded', 'true'); } catch {}
    track(EVENTS.ONBOARDING_COMPLETED);
    router.replace({ pathname: '/(auth)/login', params: { mode: 'signup' } });
  }, [router]);

  const goTo = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrent(index);
  }, []);

  const onMomentumScrollEnd = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    setCurrent(idx);
  }, [pageWidth]);

  const listHeight = Dimensions.get('window').height;

  const renderItem = useCallback(({ index }: { index: number }) => {
    const vis = visibleIndex === index;
    return (
      <View style={{ width: pageWidth, height: listHeight }}>
        {index === 0 && <Screen1 isVisible={vis} />}
        {index === 1 && <Screen2 isVisible={vis} />}
        {index === 2 && <Screen3 isVisible={vis} />}
        {index === 3 && <Screen4 isVisible={vis} />}
        {index === 4 && <Screen5 isVisible={vis} />}
        {index === 5 && <Screen6 onPlay={onPlay} isVisible={vis} />}
      </View>
    );
  }, [pageWidth, listHeight, onPlay, visibleIndex]);

  const keyExtractor = useCallback((_: number, index: number) => String(index), []);

  return (
    <View style={[s.container, { backgroundColor: colors.bg, maxWidth: Platform.OS === 'web' ? 430 : undefined, alignSelf: Platform.OS === 'web' ? 'center' : undefined, width: '100%' }]}>
      {/* Skip button */}
      {!isLast && (
        <Pressable onPress={() => goTo(TOTAL_SCREENS - 1)} style={[s.skipBtn, { top: insets.top + 12 }]}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textLight }}>{t('onboarding.skip')}</Text>
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
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
              {current === 0 ? t('onboarding.next_first') : t('onboarding.next')}
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
    overflow: 'hidden',
  },
  screenLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    // Removed `overflow: 'hidden'` — it was clipping the step cards at
    // the bottom of screen 3 because the centered content column was
    // taller than the container on smaller phones. Each screen is
    // already clipped per-page by the horizontal FlatList paging, so
    // we don't need additional overflow: hidden here.
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 12,
  },
  heroSub: {
    fontSize: 15,
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
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  stepCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    // minHeight guarantees the card is tall enough to show the title
    // + description text even when the parent container is constrained
    // on smaller phones (iPhone SE etc.). Without this, flex: 1 inside
    // a centered column with `overflow: hidden` could clip to ~30px.
    minHeight: 96,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testimonialCard: {
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
    width: 60,
    transform: [{ skewX: '-20deg' }],
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
