import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Svg, { Polygon, Path, Rect, Defs, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { ModeId } from '@/src/data/unifiedJourney';
import { t } from '@/src/i18n';

export type NodeState = 'completed' | 'current' | 'locked' | 'unlocked';

interface Props {
  position: number;
  mode: ModeId;
  modeColor: string;
  state: NodeState;
  stars: number; // 0-3
  onPress?: () => void;
  size?: number;
  /** Animation delay in ms — lets the parent stagger nodes as they
   *  scroll into view. Default 0 (no delay). */
  enterDelay?: number;
}

const NODE_SIZE_DEFAULT = 58;

function StarGlyph({ size = 11, color = '#D4A012', filled = true }: { size?: number; color?: string; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon
        points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0 : 6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LockGlyph({ size = 20, color = '#FFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={11} width={14} height={11} rx={2.5} fill={color} />
      <Path
        d="M8,11 V8 A4,4 0 0,1 16,8 V11"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CheckGlyph({ size = 16, color = '#FFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 12l5 5L20 7"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function LevelNodeInner({
  position,
  mode,
  modeColor,
  state,
  stars,
  onPress,
  size = NODE_SIZE_DEFAULT,
  enterDelay = 0,
}: Props) {
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.35);
  const pressScale = useSharedValue(1);
  const sparkleRotate = useSharedValue(0);
  const enterOpacity = useSharedValue(0);
  const enterScale = useSharedValue(0.85);

  const isLocked = state === 'locked';
  const isCurrent = state === 'current';
  const isCompleted = state === 'completed';

  // Enter animation — fade + spring-in. Staggered by parent via enterDelay.
  useEffect(() => {
    enterOpacity.value = withDelay(enterDelay, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
    enterScale.value = withDelay(
      enterDelay,
      withSpring(1, { damping: 14, stiffness: 180, mass: 0.8 }),
    );
  }, [enterDelay, enterOpacity, enterScale]);

  // Current-node loops: breathing pulse + glow wave + sparkle rotation.
  useEffect(() => {
    if (!isCurrent) return;
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.25, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    sparkleRotate.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1, false);
  }, [isCurrent, pulseScale, glowOpacity, sparkleRotate]);

  const handlePress = () => {
    if (isLocked || !onPress) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        isCurrent ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => {});
    }
    pressScale.value = withSequence(
      withTiming(0.92, { duration: 80, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 10, stiffness: 280 }),
    );
    onPress();
  };

  const handlePressIn = () => {
    if (isLocked) return;
    pressScale.value = withSpring(0.94, { damping: 14, stiffness: 260 });
  };
  const handlePressOut = () => {
    if (isLocked) return;
    pressScale.value = withSpring(1, { damping: 12, stiffness: 240 });
  };

  const rootStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ scale: enterScale.value * pressScale.value }],
  }));

  const nodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isCurrent ? pulseScale.value : 1 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotate.value}deg` }],
  }));

  const currentSize = isCurrent ? size + 6 : size;
  const bgColor = isLocked ? '#B8B6AE' : modeColor;

  return (
    <Animated.View style={[{ alignItems: 'center' }, rootStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isLocked}
        style={{ alignItems: 'center' }}
        accessibilityRole="button"
        accessibilityLabel={t('journey.node_aria', {
          position,
          state: t(`journey.node_state_${state === 'unlocked' ? 'current' : state}`),
        })}
      >
        {/* Ambient glow halo for the current node. Sits behind everything
         *  and scales/fades in a slow rhythm to draw the eye. */}
        {isCurrent && (
          <Animated.View
            style={[
              st.glowHalo,
              {
                width: currentSize + 46,
                height: currentSize + 46,
                borderRadius: (currentSize + 46) / 2,
                backgroundColor: modeColor,
              },
              glowStyle,
            ]}
          />
        )}

        {/* Rotating sparkle ring — subtle long-period spin that creates
         *  the "alive" shimmer without screaming for attention. */}
        {isCurrent && (
          <Animated.View
            style={[
              st.sparkleRing,
              {
                width: currentSize + 22,
                height: currentSize + 22,
                borderRadius: (currentSize + 22) / 2,
              },
              sparkleStyle,
            ]}
          >
            <Svg
              width={currentSize + 22}
              height={currentSize + 22}
              viewBox="0 0 100 100"
            >
              <SvgCircle
                cx={50}
                cy={50}
                r={46}
                fill="none"
                stroke={modeColor}
                strokeWidth={1.5}
                strokeDasharray="2 8"
                strokeLinecap="round"
                opacity={0.7}
              />
            </Svg>
          </Animated.View>
        )}

        {/* Main node circle. Animated.View so the pulse scale composes
         *  with the press scale without overwriting it. */}
        <Animated.View
          style={[
            st.node,
            {
              width: currentSize,
              height: currentSize,
              borderRadius: currentSize / 2,
              backgroundColor: bgColor,
              borderColor: isCurrent
                ? '#FFFFFF'
                : isCompleted
                  ? 'rgba(255,255,255,0.9)'
                  : isLocked
                    ? 'rgba(255,255,255,0.4)'
                    : 'transparent',
              borderWidth: isCurrent ? 3 : isCompleted ? 2 : isLocked ? 1.5 : 0,
              shadowColor: isLocked ? '#000' : modeColor,
              shadowOpacity: isLocked ? 0.12 : isCurrent ? 0.55 : 0.3,
              shadowRadius: isCurrent ? 16 : isCompleted ? 10 : 6,
              shadowOffset: { width: 0, height: isCurrent ? 6 : 3 },
            },
            nodeStyle,
          ]}
        >
          {/* Inner gradient overlay for depth — subtle radial so the node
           *  doesn't look flat on any background. */}
          <Svg
            width={currentSize}
            height={currentSize}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          >
            <Defs>
              <RadialGradient
                id={`grad-${position}`}
                cx="50%"
                cy="30%"
                r="80%"
              >
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={isLocked ? 0.08 : 0.28} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <SvgCircle
              cx={currentSize / 2}
              cy={currentSize / 2}
              r={currentSize / 2}
              fill={`url(#grad-${position})`}
            />
          </Svg>

          {isLocked ? (
            <LockGlyph size={currentSize * 0.38} color="rgba(255,255,255,0.92)" />
          ) : isCompleted ? (
            <View style={st.completedInner}>
              <CheckGlyph size={currentSize * 0.28} color="#FFFFFF" />
              <Text style={[st.completedNumber, { fontSize: currentSize * 0.23 }]}>{position}</Text>
            </View>
          ) : (
            <Text style={[st.number, { fontSize: currentSize * 0.38 }]}>{position}</Text>
          )}
        </Animated.View>

        {/* Play chip below current node. Floats slightly with its own
         *  subtle bob so it doesn't feel tacked on. */}
        {isCurrent && <PlayChip color={modeColor} />}

        {/* Stars under completed nodes. Bright for earned, muted ghost
         *  outlines for missing — so 1/3 and 2/3 stars read at a glance. */}
        {isCompleted && (
          <View style={st.starRow}>
            {[0, 1, 2].map((i) => (
              <StarGlyph
                key={i}
                size={10}
                color={i < stars ? '#D4A012' : 'rgba(0,0,0,0.15)'}
                filled={i < stars}
              />
            ))}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Memoised wrapper — the journey screen re-renders whenever scroll
 *  position or level progress changes; nodes that aren't the current
 *  one have identical props frame-to-frame so we can skip their
 *  reconciliation entirely. Custom comparator because `onPress` is a
 *  new closure each parent render and we don't want that to bust the
 *  memo. */
export const LevelNode = React.memo(LevelNodeInner, (prev, next) => {
  return (
    prev.position === next.position
    && prev.mode === next.mode
    && prev.modeColor === next.modeColor
    && prev.state === next.state
    && prev.stars === next.stars
    && prev.size === next.size
    && prev.enterDelay === next.enterDelay
  );
});

function PlayChip({ color }: { color: string }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [bob]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));
  return (
    <Animated.View
      style={[
        st.playChip,
        {
          backgroundColor: color,
          shadowColor: color,
        },
        style,
      ]}
    >
      <Text style={st.playChipText}>{t('journey.play_chip')}</Text>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    overflow: 'hidden',
  },
  number: {
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  completedInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: -2,
  },
  completedNumber: {
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginTop: -2,
  },
  glowHalo: {
    position: 'absolute',
    top: -23,
  },
  sparkleRing: {
    position: 'absolute',
    top: -11,
  },
  playChip: {
    position: 'absolute',
    bottom: -14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  playChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 6,
  },
});
