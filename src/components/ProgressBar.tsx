import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/src/providers/ThemeProvider';
import { borderRadius } from '@/src/theme/spacing';

interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle;
  duration?: number;
}

export const ProgressBar = React.memo(function ProgressBar({
  progress,
  color,
  trackColor,
  height = 8,
  style,
  duration = 300,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.accent;
  const resolvedTrackColor = trackColor ?? colors.surface;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, duration, animatedProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
    backgroundColor: resolvedColor,
  }));

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: resolvedTrackColor },
        style,
      ]}
    >
      <Animated.View
        style={[styles.fill, { borderRadius: height / 2 }, fillStyle]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
