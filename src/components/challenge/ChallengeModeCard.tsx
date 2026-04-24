import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { ChallengeMode } from '@/src/data/challengeModes';
import { useTheme } from '@/src/providers/ThemeProvider';

/** Per-mode SVG glyph. Drawn at 22-24px on the card, all strokes in
 *  pure white since the icon container is always tinted in the mode
 *  colour. Intentionally minimal so the cards feel like a family. */
export function ModeGlyph({ mode, size = 22, color = '#FFF' }: { mode: string; size?: number; color?: string }) {
  switch (mode) {
    case 'classic':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={3} y={3} width={8} height={8} rx={2} fill={color} />
          <Rect x={13} y={3} width={8} height={8} rx={2} fill={color} opacity={0.65} />
          <Rect x={3} y={13} width={8} height={8} rx={2} fill={color} opacity={0.65} />
          <Rect x={13} y={13} width={8} height={8} rx={2} fill={color} opacity={0.4} />
        </Svg>
      );
    case 'speed_recall':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={2} />
          <Circle cx={12} cy={12} r={2} fill={color} />
          <Line x1={12} y1={12} x2={12} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case 'snap_match':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={2} y={4} width={8} height={16} rx={2} fill={color} opacity={0.65} />
          <Rect x={14} y={4} width={8} height={16} rx={2} fill={color} />
          <Path d="M10,12 L14,12" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
    case 'sequence':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={5} cy={12} r={3} fill={color} opacity={0.4} />
          <Circle cx={12} cy={12} r={3} fill={color} opacity={0.7} />
          <Circle cx={19} cy={12} r={3} fill={color} />
          <Path d="M8,12 L9,12 M15,12 L16,12" stroke={color} strokeWidth={1.5} />
        </Svg>
      );
    case 'counting_blitz':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={6} cy={8} r={3} fill={color} opacity={0.55} />
          <Circle cx={16} cy={6} r={2.5} fill={color} opacity={0.75} />
          <Circle cx={10} cy={16} r={3.5} fill={color} />
          <Circle cx={19} cy={15} r={2} fill={color} opacity={0.35} />
        </Svg>
      );
    case 'colour_chain':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x={2} y={2} width={6} height={6} rx={1} fill={color} />
          <Rect x={9} y={2} width={6} height={6} rx={1} fill={color} opacity={0.7} />
          <Rect x={16} y={2} width={6} height={6} rx={1} fill={color} opacity={0.4} />
          <Rect x={2} y={9} width={6} height={6} rx={1} fill={color} opacity={0.5} />
          <Rect x={9} y={9} width={6} height={6} rx={1} fill={color} opacity={0.85} />
          <Rect x={16} y={9} width={6} height={6} rx={1} fill={color} opacity={0.3} />
        </Svg>
      );
    default:
      return null;
  }
}

interface Props {
  mode: ChallengeMode;
  isSelected: boolean;
  onPress: () => void;
  /** Stagger delay in ms for the entrance animation. */
  enterDelay?: number;
}

/** The core "pick-a-mode" card on the challenge-select screen. All
 *  six modes render as peer cards using this component — no hero vs
 *  grid hierarchy. Selected state shows a coloured border + halo and
 *  a check pill in the top-right.
 *
 *  Animations: spring-scale + fade on mount (staggered via
 *  enterDelay), press-scale-down, and a soft pulse on the selection
 *  checkmark when the card becomes selected.
 *
 *  Haptic: light impact on press — unselected cards become selected,
 *  selected cards no-op on press but still fire the haptic for
 *  consistency. */
function ChallengeModeCardInner({ mode, isSelected, onPress, enterDelay = 0 }: Props) {
  const { colors } = useTheme();

  const enterOpacity = useSharedValue(0);
  const enterY = useSharedValue(16);
  const pressScale = useSharedValue(1);
  const checkScale = useSharedValue(isSelected ? 1 : 0);
  const selectionGlow = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    enterOpacity.value = withDelay(enterDelay, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
    enterY.value = withDelay(enterDelay, withSpring(0, { damping: 14, stiffness: 180, mass: 0.8 }));
  }, [enterDelay, enterOpacity, enterY]);

  useEffect(() => {
    if (isSelected) {
      checkScale.value = withSequence(
        withSpring(1.15, { damping: 10, stiffness: 300 }),
        withSpring(1, { damping: 14, stiffness: 220 }),
      );
      selectionGlow.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    } else {
      checkScale.value = withTiming(0, { duration: 140, easing: Easing.in(Easing.cubic) });
      selectionGlow.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
    }
  }, [isSelected, checkScale, selectionGlow]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  const rootStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateY: enterY.value }, { scale: pressScale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkScale.value,
    transform: [{ scale: checkScale.value }],
  }));

  // Shadow intensity ramps up with selection state so selected cards
  // "lift" subtly off the surface.
  const cardStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.05 + selectionGlow.value * 0.18,
    shadowRadius: 8 + selectionGlow.value * 10,
  }));

  return (
    <Animated.View style={[st.shadowWrap, rootStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => {
          pressScale.value = withSpring(0.97, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 12, stiffness: 240 });
        }}
        accessibilityRole="button"
        accessibilityLabel={`${mode.name}. ${mode.description}`}
        accessibilityState={{ selected: isSelected }}
      >
        <Animated.View
          style={[
            st.card,
            {
              backgroundColor: colors.card,
              borderColor: isSelected ? mode.color : colors.border,
              borderWidth: isSelected ? 2.5 : 1,
              shadowColor: isSelected ? mode.color : '#000',
            },
            cardStyle,
          ]}
        >
          {/* Icon tile */}
          <View
            style={[
              st.iconTile,
              {
                backgroundColor: mode.color,
                shadowColor: mode.color,
                shadowOpacity: isSelected ? 0.45 : 0.22,
              },
            ]}
          >
            <ModeGlyph mode={mode.id} size={24} />
          </View>

          {/* Name + description */}
          <Text style={[st.name, { color: colors.text }]} numberOfLines={1}>
            {mode.name}
          </Text>
          <Text
            style={[st.description, { color: colors.textMid }]}
            numberOfLines={2}
          >
            {mode.description}
          </Text>

          {/* Meta footer */}
          <View style={st.metaRow}>
            <View style={[st.metaDot, { backgroundColor: mode.color }]} />
            <Text style={[st.meta, { color: colors.textLight }]}>
              {mode.roundLabel} · {mode.estimatedTime}
            </Text>
          </View>

          {/* Selection check pill */}
          <Animated.View
            style={[
              st.checkPill,
              { backgroundColor: mode.color, shadowColor: mode.color },
              checkStyle,
            ]}
            pointerEvents="none"
          >
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path
                d="M5 12l5 5L20 7"
                stroke="#FFFFFF"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** Memoised to skip re-renders when sibling cards change selection
 *  state — critical perf when all six cards are on screen. */
export const ChallengeModeCard = React.memo(ChallengeModeCardInner, (prev, next) => {
  return (
    prev.mode.id === next.mode.id
    && prev.isSelected === next.isSelected
    && prev.enterDelay === next.enterDelay
  );
});

const st = StyleSheet.create({
  shadowWrap: {
    width: '48.5%',
  },
  card: {
    borderRadius: 18,
    padding: 14,
    minHeight: 160,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
  },
  metaDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  meta: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  checkPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
