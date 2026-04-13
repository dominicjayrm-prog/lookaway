import React, { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { sounds } from '@/src/lib/sounds';

interface CountdownTimerProps {
  duration: number; // total seconds
  running: boolean;
  onComplete: () => void;
  height?: number;
  style?: ViewStyle;
}

export const CountdownTimer = React.memo(function CountdownTimer({
  duration,
  running,
  onComplete,
  height = 8,
  style,
}: CountdownTimerProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(1);
  const prevDuration = useRef(duration);
  const initialized = useRef(false);

  useEffect(() => {
    // Reset to full on new duration (new question/scene)
    if (duration !== prevDuration.current || !initialized.current) {
      prevDuration.current = duration;
      initialized.current = true;
      cancelAnimation(progress);
      progress.value = 1;
    }

    if (running) {
      // Resume from current progress value
      const remaining = progress.value * duration * 1000;
      progress.value = withTiming(0, {
        duration: remaining,
        easing: Easing.linear,
      });
    } else {
      // Freeze at current position
      cancelAnimation(progress);
    }
  }, [running, duration, progress]);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const triggerWarningSound = useCallback(() => {
    sounds.play('timerWarning');
  }, []);

  const triggerTickSound = useCallback(() => {
    sounds.play('timerTick');
  }, []);

  const triggerComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useAnimatedReaction(
    () => progress.value,
    (current, previous) => {
      if (previous !== null) {
        if (previous > 0.4 && current <= 0.4) {
          runOnJS(triggerHaptic)();
          runOnJS(triggerWarningSound)();
        }
        if (previous > 0.15 && current <= 0.15) {
          runOnJS(triggerHaptic)();
          runOnJS(triggerTickSound)();
        }
        if (previous > 0 && current <= 0) {
          runOnJS(triggerComplete)();
        }
      }
    },
  );

  const correctColor = colors.correct;
  const goldColor = colors.gold;
  const wrongColor = colors.wrong;

  const fillStyle = useAnimatedStyle(() => {
    const p = progress.value;
    let barColor: string = correctColor;
    if (p <= 0.15) {
      barColor = wrongColor;
    } else if (p <= 0.4) {
      barColor = goldColor;
    }
    return {
      width: `${p * 100}%` as `${number}%`,
      backgroundColor: barColor,
    };
  });

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.border }, style]}
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
