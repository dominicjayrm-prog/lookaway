import React, { useCallback } from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { borderRadius, spacing } from '@/src/theme/spacing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type OptionState = 'default' | 'selected' | 'correct' | 'wrong' | 'dimmed';

interface OptionButtonProps {
  label: string;
  state: OptionState;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const OptionButton = React.memo(function OptionButton({
  label,
  state,
  onPress,
  disabled = false,
  style,
}: OptionButtonProps) {
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
      <Text style={textStyles}>{label}</Text>
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
    alignItems: 'center',
  },
  text: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
});

const stateStyles: Record<OptionState, ViewStyle> = {
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
};

const stateTextStyles: Record<OptionState, { color: string }> = {
  default: { color: colors.text },
  selected: { color: colors.accent },
  correct: { color: colors.correct },
  wrong: { color: colors.wrong },
  dimmed: { color: colors.textMid },
};
