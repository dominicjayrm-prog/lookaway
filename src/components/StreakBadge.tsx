import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { spacing } from '@/src/theme/spacing';

interface StreakBadgeProps {
  streak: number;
  pulse?: boolean;
}

export const StreakBadge = React.memo(function StreakBadge({
  streak,
  pulse = false,
}: StreakBadgeProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (pulse) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 400 }),
          withTiming(1, { duration: 400 }),
        ),
        3,
      );
    }
  }, [pulse, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (streak === 0) return null;

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.goldSoft }, animatedStyle]}>
      <Text style={styles.icon}>{'\uD83D\uDD25'}</Text>
      <Text style={[styles.count, { color: colors.gold }]}>{streak}</Text>
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
  icon: {
    fontSize: 14,
  },
  count: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
