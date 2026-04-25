import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Blink } from '@/src/components/Blink';
import { useEquippedBlinkExpression } from '@/src/hooks/useEquippedBlink';
import { t } from '@/src/i18n';
import type { WorldTheme } from '@/src/data/unifiedJourney';
import { WORLD_VISUALS } from './worldVisuals';
import { localizedWorldName } from './worldI18n';

interface Props {
  /** Current world the player is in — drives gradient + title copy. */
  worldTheme: WorldTheme;
  /** Controls the splash's alpha. When the parent finishes its heavy
   *  mount (gradient slabs + path nodes + hero SVGs) it flips this to
   *  false and the splash fades out, revealing the tab. */
  visible: boolean;
  /** Optional — called once the fade-out animation completes so the
   *  parent can unmount the splash entirely. */
  onHidden?: () => void;
}

/** Beautiful "Entering the world" splash that covers the Journey tab
 *  during its first mount. Biome-gradient backdrop + animated Blink
 *  mascot + world name. Designed to feel like crossing a threshold
 *  rather than a loading spinner. */
export function JourneySplash({ worldTheme, visible, onHidden }: Props) {
  const visuals = WORLD_VISUALS[worldTheme];
  const expression = useEquippedBlinkExpression();

  const alpha = useSharedValue(1);
  const blinkScale = useSharedValue(0.7);
  const blinkY = useSharedValue(0);
  const titleY = useSharedValue(12);
  const titleOpacity = useSharedValue(0);
  const eyebrowOpacity = useSharedValue(0);

  // Enter — Blink + title spring in, eyebrow fades a moment later.
  useEffect(() => {
    blinkScale.value = withDelay(
      40,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.back(1.4)) }),
    );
    blinkY.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    titleY.value = withDelay(140, withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) }));
    titleOpacity.value = withDelay(140, withTiming(1, { duration: 360 }));
    eyebrowOpacity.value = withDelay(260, withTiming(1, { duration: 320 }));
  }, [blinkScale, blinkY, titleY, titleOpacity, eyebrowOpacity]);

  // Fade-out when `visible` flips false. Quick (300ms) so the
  // transition feels snappy.
  useEffect(() => {
    if (visible) return;
    alpha.value = withTiming(
      0,
      { duration: 300, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished && onHidden) onHidden();
      },
    );
  }, [visible, alpha, onHidden]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: alpha.value }));
  const blinkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: blinkScale.value }, { translateY: blinkY.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const eyebrowStyle = useAnimatedStyle(() => ({ opacity: eyebrowOpacity.value }));

  // Subtle parallax drift on the gradient — barely perceptible but
  // makes the backdrop feel alive during the fade-out.
  const parallax = useSharedValue(0);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    parallax.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [parallax]);
  const parallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: parallax.value }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, st.root, rootStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, parallaxStyle]}>
        <LinearGradient
          colors={visuals.gradientColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <View style={st.centered}>
        <Animated.View style={[st.blinkWrap, blinkStyle]}>
          <View
            style={[
              st.blinkHalo,
              { backgroundColor: visuals.particleColor, shadowColor: visuals.particleColor },
            ]}
            pointerEvents="none"
          />
          <Blink expression={expression} size={96} />
        </Animated.View>

        <Animated.Text style={[st.eyebrow, eyebrowStyle, { color: visuals.particleColor }]}>
          {t('journey.splash_entering')}
        </Animated.Text>
        <Animated.Text style={[st.title, titleStyle]} allowFontScaling={false}>
          {localizedWorldName(worldTheme)}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: {
    zIndex: 1000,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  blinkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  blinkHalo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.18,
    shadowOpacity: 0.6,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3.5,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.1,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
