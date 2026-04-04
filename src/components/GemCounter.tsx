import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

interface GemCounterProps {
  count: number;
}

export const GemCounter = React.memo(function GemCounter({
  count,
}: GemCounterProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
  }, [count, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.accentSoft }, animatedStyle]}>
      <Ionicons name="diamond" size={16} color={colors.accent} />
      <Text style={[styles.count, { color: colors.accent }]}>{count.toLocaleString()}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  count: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
