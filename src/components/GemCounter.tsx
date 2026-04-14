import React, { useEffect, useRef, useState } from 'react';
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
import { sounds } from '@/src/lib/sounds';

interface GemCounterProps {
  count: number;
}

export const GemCounter = React.memo(function GemCounter({
  count,
}: GemCounterProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const prevCount = useRef(count);
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    const prev = prevCount.current;
    prevCount.current = count;

    // No animation on initial render or decrease
    if (prev === count || prev > count) {
      setDisplayCount(count);
      return;
    }

    // Animate count-up from previous to new value
    const diff = count - prev;
    const steps = Math.min(diff, 20); // Cap animation frames
    const stepTime = Math.max(40, Math.min(800 / steps, 80));
    let frame = 0;

    // Play gem sound once at the start of the count-up
    sounds.play('gemClink');

    const interval = setInterval(() => {
      frame++;
      const progress = frame / steps;
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplayCount(Math.round(prev + diff * eased));
      if (frame >= steps) {
        clearInterval(interval);
        setDisplayCount(count);
      }
    }, stepTime);

    // Bounce animation
    scale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );

    return () => clearInterval(interval);
  }, [count, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.accentSoft }, animatedStyle]}>
      <Ionicons name="diamond" size={16} color={colors.accent} />
      <Text style={[styles.count, { color: colors.accent }]}>{displayCount.toLocaleString()}</Text>
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
