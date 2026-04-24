import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle as SvgCircle, Path, Rect } from 'react-native-svg';
import { Animated, Easing } from 'react-native';
import type { ModeId } from '@/src/data/unifiedJourney';

export type NodeState = 'completed' | 'current' | 'locked' | 'unlocked';

interface Props {
  position: number;
  mode: ModeId;
  modeColor: string;
  state: NodeState;
  stars: number; // 0-3
  onPress?: () => void;
  size?: number;
}

const NODE_SIZE_DEFAULT = 54;
const CURRENT_BADGE_COLOR = '#0984E3';

function StarSvg({ size = 10, color = '#D4A012' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={color} />
    </Svg>
  );
}

function LockSvg({ size = 18, color = '#FFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={11} width={14} height={11} rx={2} fill={color} />
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

export function LevelNode({
  position,
  mode,
  modeColor,
  state,
  stars,
  onPress,
  size = NODE_SIZE_DEFAULT,
}: Props) {
  const pulseScale = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state !== 'current') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.08,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulseScale]);

  const isLocked = state === 'locked';
  const isCurrent = state === 'current';
  const isCompleted = state === 'completed';

  const bgColor = isLocked ? '#C7C5BF' : modeColor;
  const textColor = '#FFFFFF';
  const opacity = isLocked ? 0.55 : 1;
  const currentSize = isCurrent ? size + 10 : size;

  return (
    <Pressable
      onPress={isLocked ? undefined : onPress}
      disabled={isLocked}
      style={{ alignItems: 'center' }}
      accessibilityRole="button"
      accessibilityLabel={`Level ${position}, ${state}`}
    >
      {/* Pulsing glow ring for current node */}
      {isCurrent && (
        <Animated.View
          style={[
            st.glowRing,
            {
              width: currentSize + 18,
              height: currentSize + 18,
              borderRadius: (currentSize + 18) / 2,
              borderColor: modeColor,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />
      )}

      {/* The node circle */}
      <View
        style={[
          st.node,
          {
            width: currentSize,
            height: currentSize,
            borderRadius: currentSize / 2,
            backgroundColor: bgColor,
            opacity,
            borderWidth: isCurrent ? 3 : isCompleted ? 2 : 0,
            borderColor: isCurrent ? '#FFF' : isCompleted ? 'rgba(255,255,255,0.7)' : 'transparent',
          },
        ]}
      >
        {isLocked ? (
          <LockSvg size={currentSize * 0.4} color="#FFFFFF" />
        ) : (
          <Text style={[st.number, { color: textColor, fontSize: currentSize * 0.36 }]}>
            {position}
          </Text>
        )}
      </View>

      {/* Play badge below current node */}
      {isCurrent && (
        <View style={[st.playBadge, { backgroundColor: CURRENT_BADGE_COLOR }]}>
          <Text style={st.playBadgeText}>PLAY</Text>
        </View>
      )}

      {/* Stars below completed nodes */}
      {isCompleted && stars > 0 && (
        <View style={st.starRow}>
          {[0, 1, 2].map((i) => (
            <StarSvg key={i} size={10} color={i < stars ? '#D4A012' : '#D8D5CC'} />
          ))}
        </View>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  number: {
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.4,
  },
  playBadge: {
    position: 'absolute',
    bottom: -10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  playBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
});
