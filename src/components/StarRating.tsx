import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';

interface StarRatingProps {
  stars: 0 | 1 | 2 | 3;
  size?: number;
  animate?: boolean;
  style?: ViewStyle;
}

function AnimatedStar({
  filled,
  index,
  size,
  animate,
}: {
  filled: boolean;
  index: number;
  size: number;
  animate: boolean;
}) {
  const scale = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (animate && filled) {
      scale.value = withDelay(
        index * 200,
        withSequence(
          withSpring(1.3, { damping: 8, stiffness: 200 }),
          withSpring(1, { damping: 12, stiffness: 200 }),
        ),
      );
    }
  }, [animate, filled, index, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={filled ? 'star' : 'star-outline'}
        size={size}
        color={filled ? colors.gold : colors.textLight}
      />
    </Animated.View>
  );
}

export const StarRating = React.memo(function StarRating({
  stars,
  size = 28,
  animate = false,
  style,
}: StarRatingProps) {
  return (
    <View style={[styles.container, style]}>
      {[0, 1, 2].map((i) => (
        <AnimatedStar
          key={i}
          filled={i < stars}
          index={i}
          size={size}
          animate={animate}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
