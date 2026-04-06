import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { borderRadius, spacing } from '@/src/theme/spacing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type OptionState = 'default' | 'selected' | 'correct' | 'wrong' | 'dimmed';

var LETTERS = ['A', 'B', 'C', 'D'];

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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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

  const stateStyles = useMemo<Record<OptionState, ViewStyle>>(() => ({
    default: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    selected: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    correct: {
      backgroundColor: colors.correctSoft,
      borderColor: colors.correct,
    },
    wrong: {
      backgroundColor: colors.wrongSoft,
      borderColor: colors.wrong,
    },
    dimmed: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      opacity: 0.5,
    },
  }), [colors]);

  const stateTextStyles = useMemo<Record<OptionState, { color: string }>>(() => ({
    default: { color: colors.text },
    selected: { color: colors.accent },
    correct: { color: colors.correct },
    wrong: { color: colors.wrong },
    dimmed: { color: colors.textMid },
  }), [colors]);

  const containerStyles = [
    styles.container,
    stateStyles[state],
    style,
  ];

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
      style={[animatedStyle, ...containerStyles]}
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
