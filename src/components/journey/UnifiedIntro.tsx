import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { WORLD_THEMES, WORLD_THEME_ORDER } from '@/src/data/unifiedJourney';
import { CAMPAIGNS, CAMPAIGN_ORDER } from '@/src/data/campaigns';
import { t } from '@/src/i18n';
import { localizedWorldName } from './worldI18n';
import { Blink } from '@/src/components/Blink';
import { useEquippedBlinkExpression } from '@/src/hooks/useEquippedBlink';

interface Props {
  onComplete: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Reanimated 4 entrance animations don't reliably propagate `opacity`
// or `transform` updates on react-native-web. The journey intro was
// rendering as a completely blank card because every shared value
// started at 0 and the entrance animations never landed. On web we
// skip the entrance choreography and start every value at its final
// state so the card is visible immediately. Native still gets the
// staggered slide-and-fade.
const SKIP_ENTRANCE = Platform.OS === 'web';

/** Three-card swipeable intro shown to brand-new accounts. Each card
 *  has staggered entrance animations — eyebrow, title, body, and content
 *  elements slide in sequence so scrolling into a new card feels alive. */
export function UnifiedIntro({ onComplete }: Props) {
  const { colors } = useTheme();
  const [cardIdx, setCardIdx] = useState(0);
  const scrollRef = React.useRef<ScrollView>(null);
  const blinkExpression = useEquippedBlinkExpression();

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (page !== cardIdx) {
      setCardIdx(page);
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync().catch(() => {});
      }
    }
  };

  const goNext = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        cardIdx < 2 ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
      ).catch(() => {});
    }
    if (cardIdx < 2) {
      scrollRef.current?.scrollTo({ x: (cardIdx + 1) * SCREEN_WIDTH, animated: true });
    } else {
      onComplete();
    }
  };

  return (
    <SafeAreaView style={[st.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
      >
        <IntroCard1 colors={colors} active={cardIdx === 0} blinkExpression={blinkExpression} />
        <IntroCard2 colors={colors} active={cardIdx === 1} />
        <IntroCard3 colors={colors} active={cardIdx === 2} />
      </ScrollView>

      {/* Pagination dots with animated width for the active dot */}
      <View style={st.dots}>
        {[0, 1, 2].map((i) => (
          <DotPill key={i} active={i === cardIdx} color={colors.accent} inactive={colors.borderStrong} />
        ))}
      </View>

      {/* CTA */}
      <View style={st.ctaContainer}>
        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            st.cta,
            { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            cardIdx < 2 ? t('journey.intro.next_aria') : t('journey.intro.start_aria')
          }
        >
          <LinearGradient
            colors={[colors.accent, '#8F7EEB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.ctaInner}
          >
            <Text style={st.ctaText}>
              {cardIdx < 2 ? t('journey.intro.next') : t('journey.intro.start')}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DotPill({ active, color, inactive }: { active: boolean; color: string; inactive: string }) {
  const w = useSharedValue(active ? 24 : 7);
  useEffect(() => {
    w.value = withSpring(active ? 24 : 7, { damping: 12, stiffness: 200 });
  }, [active, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return <Animated.View style={[st.dot, { backgroundColor: active ? color : inactive }, style]} />;
}

function IntroCard1({
  colors,
  active,
  blinkExpression,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  active: boolean;
  blinkExpression: ReturnType<typeof useEquippedBlinkExpression>;
}) {
  const numberScale = useSharedValue(SKIP_ENTRANCE ? 1 : 0.4);
  const numberOpacity = useSharedValue(SKIP_ENTRANCE ? 1 : 0);
  const eyebrowY = useSharedValue(SKIP_ENTRANCE ? 0 : 16);
  const eyebrowOpacity = useSharedValue(SKIP_ENTRANCE ? 1 : 0);
  const titleY = useSharedValue(SKIP_ENTRANCE ? 0 : 16);
  const titleOpacity = useSharedValue(SKIP_ENTRANCE ? 1 : 0);
  const bodyOpacity = useSharedValue(SKIP_ENTRANCE ? 1 : 0);
  const blinkScale = useSharedValue(SKIP_ENTRANCE ? 1 : 0);

  useEffect(() => {
    if (!active || SKIP_ENTRANCE) return;
    blinkScale.value = withSpring(1, { damping: 10, stiffness: 150 });
    eyebrowOpacity.value = withDelay(120, withTiming(1, { duration: 400 }));
    eyebrowY.value = withDelay(120, withSpring(0, { damping: 14, stiffness: 180 }));
    numberOpacity.value = withDelay(240, withTiming(1, { duration: 500 }));
    numberScale.value = withDelay(240, withSpring(1, { damping: 8, stiffness: 120 }));
    titleOpacity.value = withDelay(460, withTiming(1, { duration: 420 }));
    titleY.value = withDelay(460, withSpring(0, { damping: 14, stiffness: 180 }));
    bodyOpacity.value = withDelay(620, withTiming(1, { duration: 500 }));
  }, [active, blinkScale, eyebrowOpacity, eyebrowY, numberOpacity, numberScale, titleOpacity, titleY, bodyOpacity]);

  const blinkStyle = useAnimatedStyle(() => ({ transform: [{ scale: blinkScale.value }] }));
  const eyebrowStyle = useAnimatedStyle(() => ({
    opacity: eyebrowOpacity.value,
    transform: [{ translateY: eyebrowY.value }],
  }));
  const numberStyle = useAnimatedStyle(() => ({
    opacity: numberOpacity.value,
    transform: [{ scale: numberScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: bodyOpacity.value }));

  return (
    <View style={[st.card, { width: SCREEN_WIDTH }]}>
      <Animated.View style={[st.blinkSlot, blinkStyle]}>
        <Blink expression={blinkExpression} size={72} />
      </Animated.View>
      <Animated.Text style={[st.eyebrow, { color: colors.accent }, eyebrowStyle]}>
        {t('journey.intro.eyebrow_1')}
      </Animated.Text>
      <Animated.Text style={[st.bigNumber, { color: colors.accent }, numberStyle]}>380</Animated.Text>
      <Animated.Text style={[st.title, { color: colors.text }, titleStyle]}>
        {t('journey.intro.title_1')}
      </Animated.Text>
      <Animated.Text style={[st.body, { color: colors.textMid }, bodyStyle]}>
        {t('journey.intro.body_1')}
      </Animated.Text>
    </View>
  );
}

function IntroCard2({
  colors,
  active,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  active: boolean;
}) {
  const headerY = useSharedValue(SKIP_ENTRANCE ? 0 : 16);
  const headerOpacity = useSharedValue(SKIP_ENTRANCE ? 1 : 0);
  const chipOpacities = CAMPAIGN_ORDER.map(() => useSharedValue(SKIP_ENTRANCE ? 1 : 0));
  const chipScales = CAMPAIGN_ORDER.map(() => useSharedValue(SKIP_ENTRANCE ? 1 : 0.6));

  useEffect(() => {
    if (!active || SKIP_ENTRANCE) return;
    headerOpacity.value = withTiming(1, { duration: 420 });
    headerY.value = withSpring(0, { damping: 14, stiffness: 180 });
    CAMPAIGN_ORDER.forEach((_, i) => {
      chipOpacities[i].value = withDelay(300 + i * 110, withTiming(1, { duration: 300 }));
      chipScales[i].value = withDelay(300 + i * 110, withSpring(1, { damping: 10, stiffness: 160 }));
    });
  }, [active, headerY, headerOpacity, chipOpacities, chipScales]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  return (
    <View style={[st.card, { width: SCREEN_WIDTH }]}>
      <Animated.View style={headerStyle}>
        <Text style={[st.eyebrow, { color: colors.accent, textAlign: 'center' }]}>
          {t('journey.intro.eyebrow_2')}
        </Text>
        <Text style={[st.title, { color: colors.text }]}>{t('journey.intro.title_2')}</Text>
        <Text style={[st.body, { color: colors.textMid }]}>{t('journey.intro.body_2')}</Text>
      </Animated.View>
      <View style={st.modeGrid}>
        {CAMPAIGN_ORDER.map((id, i) => {
          const c = CAMPAIGNS[id];
          const chipStyle = useAnimatedStyle(() => ({
            opacity: chipOpacities[i].value,
            transform: [{ scale: chipScales[i].value }],
          }));
          return (
            <Animated.View
              key={id}
              style={[st.modeChip, { backgroundColor: c.color + '18', borderColor: c.color + '30' }, chipStyle]}
            >
              <View style={[st.modeDot, { backgroundColor: c.color }]} />
              <Text style={[st.modeName, { color: c.color }]}>{c.name}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

function IntroCard3({
  colors,
  active,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  active: boolean;
}) {
  const headerY = useSharedValue(SKIP_ENTRANCE ? 0 : 16);
  const headerOpacity = useSharedValue(SKIP_ENTRANCE ? 1 : 0);
  const rowOpacities = WORLD_THEME_ORDER.map(() => useSharedValue(SKIP_ENTRANCE ? 1 : 0));
  const rowX = WORLD_THEME_ORDER.map(() => useSharedValue(SKIP_ENTRANCE ? 0 : -30));

  useEffect(() => {
    if (!active || SKIP_ENTRANCE) return;
    headerOpacity.value = withTiming(1, { duration: 420 });
    headerY.value = withSpring(0, { damping: 14, stiffness: 180 });
    WORLD_THEME_ORDER.forEach((_, i) => {
      rowOpacities[i].value = withDelay(300 + i * 140, withTiming(1, { duration: 380 }));
      rowX[i].value = withDelay(300 + i * 140, withSpring(0, { damping: 14, stiffness: 160 }));
    });
  }, [active, headerOpacity, headerY, rowOpacities, rowX]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  return (
    <View style={[st.card, { width: SCREEN_WIDTH }]}>
      <Animated.View style={headerStyle}>
        <Text style={[st.eyebrow, { color: colors.accent, textAlign: 'center' }]}>
          {t('journey.intro.eyebrow_3')}
        </Text>
        <Text style={[st.title, { color: colors.text }]}>{t('journey.intro.title_3')}</Text>
        <Text style={[st.body, { color: colors.textMid }]}>{t('journey.intro.body_3')}</Text>
      </Animated.View>
      <View style={st.worldColumn}>
        {WORLD_THEME_ORDER.map((theme, i) => {
          const meta = WORLD_THEMES[theme];
          const rowStyle = useAnimatedStyle(() => ({
            opacity: rowOpacities[i].value,
            transform: [{ translateX: rowX[i].value }],
          }));
          return (
            <Animated.View key={theme} style={[st.worldRow, { borderColor: meta.color + '30' }, rowStyle]}>
              <LinearGradient
                colors={[meta.color, meta.color + '88']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.worldStripe}
              />
              <View style={[st.worldDot, { backgroundColor: meta.color }]} />
              <Text style={[st.worldName, { color: colors.text }]}>{localizedWorldName(theme)}</Text>
              <Text style={[st.worldRange, { color: colors.textMid }]}>
                {meta.range[0]}–{meta.range[1]}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
  },
  card: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
    alignItems: 'center',
  },
  blinkSlot: {
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 14,
    textAlign: 'center',
  },
  bigNumber: {
    fontSize: 96,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -3,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.8,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 300,
    fontWeight: '500',
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  modeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  modeName: {
    fontSize: 14,
    fontWeight: '800',
  },
  worldColumn: {
    gap: 10,
    marginTop: 16,
    width: '100%',
    maxWidth: 300,
  },
  worldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  worldStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
  },
  worldDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: 4,
  },
  worldName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  worldRange: {
    fontSize: 12,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },
  ctaContainer: {
    paddingHorizontal: 28,
    paddingBottom: 30,
  },
  cta: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaInner: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
