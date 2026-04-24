import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { WORLD_THEMES, type WorldTheme } from '@/src/data/unifiedJourney';
import { WORLD_VISUALS } from './worldVisuals';
import { t } from '@/src/i18n';
import { localizedWorldName } from './worldI18n';

interface Props {
  nextWorld: WorldTheme;
  locked: boolean;
}

function LockSvg({ size = 16, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M17,10V8A5,5 0 0,0 7,8V10H5V21H19V10H17M9,8A3,3 0 0,1 15,8V10H9V8Z"
        fill={color}
      />
    </Svg>
  );
}

function ChevronDownSvg({ size = 14, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M7 10l5 5 5-5"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Banner rendered on the path at each world boundary. Shows the
 *  upcoming world with a subtle breathing glow when the player is
 *  about to enter it, dimmed + locked when they're not there yet. */
export function WorldGate({ nextWorld, locked }: Props) {
  const meta = WORLD_THEMES[nextWorld];
  const visuals = WORLD_VISUALS[nextWorld];

  const glowOpacity = useSharedValue(0.4);
  const arrowY = useSharedValue(0);

  useEffect(() => {
    if (locked) return;
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    arrowY.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [locked, glowOpacity, arrowY]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateY: arrowY.value }] }));

  const colors: [string, string] = locked
    ? ['rgba(30,30,30,0.55)', 'rgba(10,10,10,0.7)']
    : [visuals.gradientColors[0], visuals.gradientColors[1]];

  return (
    <View style={st.wrap}>
      {/* Glow halo behind the banner — only on unlocked/current */}
      {!locked && (
        <Animated.View
          style={[
            st.glow,
            { backgroundColor: meta.color },
            glowStyle,
          ]}
        />
      )}
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          st.gate,
          !locked && { borderColor: 'rgba(255,255,255,0.35)', borderWidth: 1 },
        ]}
      >
        <View style={st.inner}>
          {locked ? (
            <>
              <LockSvg size={18} color="rgba(255,255,255,0.8)" />
              <View style={st.textBlock}>
                <Text style={[st.eyebrow, { opacity: 0.75 }]}>
                  {t('journey.world_gate_ahead', { num: meta.worldNumber })}
                </Text>
                <Text style={[st.title, { opacity: 0.85 }]} numberOfLines={1}>
                  {localizedWorldName(nextWorld)}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={st.textBlock}>
                <Text style={st.eyebrow}>
                  {t('journey.world_gate_ahead', { num: meta.worldNumber })}
                </Text>
                <Text style={st.title} numberOfLines={1}>
                  {localizedWorldName(nextWorld)}
                </Text>
              </View>
              <Animated.View style={arrowStyle}>
                <ChevronDownSvg size={18} color="#FFFFFF" />
              </Animated.View>
            </>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: -10,
    right: -10,
    bottom: 0,
    borderRadius: 22,
    opacity: 0.4,
  },
  gate: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textBlock: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
