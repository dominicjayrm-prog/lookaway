import React, { useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { borderRadius, spacing } from '@/src/theme/spacing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type OptionState = 'default' | 'selected' | 'correct' | 'wrong' | 'dimmed';

const LETTERS = ['A', 'B', 'C', 'D'];

// Map states to numeric indices for interpolation
const STATE_INDEX: Record<OptionState, number> = {
  default: 0,
  selected: 1,
  correct: 2,
  wrong: 3,
  dimmed: 4,
};

interface OptionButtonProps {
  label: string;
  index?: number;
  state: OptionState;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const OptionButton = React.memo(function OptionButton({
  label,
  index = 0,
  state,
  onPress,
  disabled = false,
  style,
}: OptionButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const stateProgress = useSharedValue(STATE_INDEX[state]);
  const dimmedOpacity = useSharedValue(state === 'dimmed' ? 0.2 : 1);
  const dimmedScale = useSharedValue(state === 'dimmed' ? 0.95 : 1);

  // Animate state transitions
  useEffect(() => {
    stateProgress.value = withTiming(STATE_INDEX[state], { duration: 200 });
    dimmedOpacity.value = withTiming(state === 'dimmed' ? 0.2 : 1, { duration: 250 });
    dimmedScale.value = withTiming(state === 'dimmed' ? 0.95 : 1, { duration: 250 });
  }, [state, stateProgress, dimmedOpacity, dimmedScale]);

  // Background colors for each state
  const bgColors = useMemo(() => [
    colors.card,       // default
    colors.accentSoft, // selected
    colors.correctSoft,// correct
    colors.wrongSoft,  // wrong
    colors.surface,    // dimmed
  ], [colors]);

  const borderColors = useMemo(() => [
    colors.border,  // default
    colors.accent,  // selected
    colors.correct, // correct
    colors.wrong,   // wrong
    colors.border,  // dimmed
  ], [colors]);

  const colorAnimStyle = useAnimatedStyle(() => {
    const p = stateProgress.value;
    return {
      backgroundColor: interpolateColor(p, [0, 1, 2, 3, 4], bgColors),
      borderColor: interpolateColor(p, [0, 1, 2, 3, 4], borderColors),
      opacity: dimmedOpacity.value,
      transform: [{ scale: scale.value * dimmedScale.value }],
    };
  });

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    if (state === 'default') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [state, onPress]);

  const stateTextStyles = useMemo<Record<OptionState, { color: string }>>(() => ({
    default: { color: colors.text },
    selected: { color: colors.accent },
    correct: { color: colors.correct },
    wrong: { color: colors.wrong },
    dimmed: { color: colors.textMid },
  }), [colors]);

  const textStyles = [
    styles.text,
    stateTextStyles[state],
  ];

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.container, colorAnimStyle, style]}
    >
      <View style={styles.inner}>
        <View style={[styles.letterBadge, { backgroundColor: state === 'correct' ? colors.correct + '20' : state === 'wrong' ? colors.wrong + '20' : state === 'selected' ? colors.accent + '20' : colors.surface }]}>
          <Text style={[styles.letterText, stateTextStyles[state]]}>
            {state === 'correct' ? '\u2713' : state === 'wrong' ? '\u2717' : LETTERS[index] ?? 'A'}
          </Text>
        </View>
        <Text style={[styles.text, stateTextStyles[state], { flex: 1 }]}>{label}</Text>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    minHeight: 52,
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  letterBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  text: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
  },
});
