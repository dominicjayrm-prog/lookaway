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
  // Guard against NaN / negative / non-finite durations slipping in
  // from upstream (e.g. `currentScene.viewTime` undefined → NaN math).
  // A zero or negative duration was the freeze trigger: withTiming
  // would jump progress to 0 in one frame and the useAnimatedReaction
  // worklet sometimes missed the transition, so onComplete never
  // fired and the screen was stuck on the memorise/question phase
  // with an invisible (0%-width) timer bar. Floor to 1s so even
  // pathological inputs visibly tick down.
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 1;

  const progress = useSharedValue(1);
  const prevDuration = useRef(safeDuration);
  const initialized = useRef(false);
  const completedRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset to full on new duration (new question/scene)
    if (safeDuration !== prevDuration.current || !initialized.current) {
      prevDuration.current = safeDuration;
      initialized.current = true;
      completedRef.current = false;
      cancelAnimation(progress);
      progress.value = 1;
    }

    // Clear any pending fallback before setting a new one.
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    if (running) {
      // Resume from current progress value
      const remaining = progress.value * safeDuration * 1000;
      progress.value = withTiming(0, {
        duration: remaining,
        easing: Easing.linear,
      });

      // SAFETY NET — JS-side fallback. If the reanimated worklet
      // misses the 1→0 transition (e.g. an animation duration of 0,
      // a backgrounding race, or a hot-reload edge case), this
      // setTimeout still fires onComplete on time. The
      // `completedRef` guard means whichever side fires first
      // (worklet via runOnJS, or this fallback) wins and the other
      // is a no-op. Without this the user's screen could freeze
      // forever with a bar at 0% width and no transition.
      const fallbackMs = Math.max(50, remaining + 100);
      fallbackTimerRef.current = setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      }, fallbackMs);
    } else {
      // Freeze at current position
      cancelAnimation(progress);
    }

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [running, safeDuration, progress, onComplete]);

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
    if (completedRef.current) return;
    completedRef.current = true;
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
