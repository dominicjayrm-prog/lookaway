/**
 * CountdownTimer — pure JS-driven countdown bar.
 *
 * Previous version used Reanimated 4's useAnimatedStyle + worklet-
 * driven progress, which works great on most devices but had visual
 * bugs on certain combinations (notably iPhone 11 + iOS 18.6 the
 * user reported): the bar appeared as a static greyed-out track even
 * though the underlying timer fired and the phase advanced. Reanimated
 * worklet style application is occasionally unreliable on older A-chip
 * devices; rather than chase the platform bug, this rewrite uses a
 * plain `useState` + `setInterval` driving a normal `width: %` style.
 *
 * Tradeoff: we re-render the timer ~30 times per second on the JS
 * thread instead of a UI-thread worklet. For an 8s countdown that's
 * ~240 React renders — negligible overhead and proven to work on
 * every device + browser. The visual is identical at 30fps for a
 * smoothly-shrinking bar.
 *
 * onComplete is fired exactly once when the timer hits 0 OR when the
 * setTimeout safety net trips, whichever comes first. completedRef
 * prevents double-fire.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
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

/** How often to re-render the timer bar. 33ms ≈ 30fps which is
 *  visually smooth for a slowly-shrinking bar. */
const TICK_MS = 33;

export const CountdownTimer = React.memo(function CountdownTimer({
  duration,
  running,
  onComplete,
  height = 8,
  style,
}: CountdownTimerProps) {
  const { colors } = useTheme();
  // Guard against NaN / negative / non-finite durations (e.g. NaN
  // from undefined viewTime upstream). Floor to 1s so even
  // pathological inputs visibly tick down rather than collapsing
  // instantly.
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 1;

  const [progress, setProgress] = useState(1);
  const prevDuration = useRef(safeDuration);
  const startTimeRef = useRef<number | null>(null);
  const startProgressRef = useRef(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  // Track which thresholds have already played sounds/haptics so they
  // don't re-fire if `running` toggles.
  const fired40Ref = useRef(false);
  const fired15Ref = useRef(false);

  const triggerComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  // Reset progress when duration changes (new question/scene).
  useEffect(() => {
    if (safeDuration !== prevDuration.current) {
      prevDuration.current = safeDuration;
      setProgress(1);
      startProgressRef.current = 1;
      startTimeRef.current = null;
      completedRef.current = false;
      fired40Ref.current = false;
      fired15Ref.current = false;
    }
  }, [safeDuration]);

  // Drive the bar via setInterval. Each tick reads wall-clock to
  // compute progress so the UI stays in sync even if a tick is
  // missed (e.g. JS thread momentarily blocked).
  useEffect(() => {
    if (!running) {
      // Pause: capture current progress, stop the interval. The next
      // resume reads `startProgressRef` so it picks up where it left.
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        startProgressRef.current = progress;
        startTimeRef.current = null;
      }
      return;
    }

    if (completedRef.current) return;

    // (Re)start. Capture wall-clock anchor so we can compute elapsed
    // accurately on every tick.
    startTimeRef.current = Date.now();

    const tick = () => {
      const start = startTimeRef.current;
      if (start === null) return;
      const elapsedMs = Date.now() - start;
      const totalMs = startProgressRef.current * safeDuration * 1000;
      const remainingMs = Math.max(0, totalMs - elapsedMs);
      const next = remainingMs / (safeDuration * 1000);
      setProgress(next);

      // Threshold cues — fire once per pass.
      if (!fired40Ref.current && next <= 0.4 && next > 0.15) {
        fired40Ref.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        sounds.play('timerWarning');
      }
      if (!fired15Ref.current && next <= 0.15 && next > 0) {
        fired15Ref.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        sounds.play('timerTick');
      }

      if (remainingMs <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        triggerComplete();
      }
    };

    // Run one tick immediately so the bar starts moving without
    // a 33ms gap, then schedule the interval.
    tick();
    intervalRef.current = setInterval(tick, TICK_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // We intentionally exclude `progress` from deps — it changes every
  // tick and would cause the interval to constantly tear down and
  // rebuild. The closure reads `startProgressRef.current` which is
  // mutable, so we capture the "starting point" on each
  // pause/resume cycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, safeDuration, triggerComplete]);

  // Belt-and-braces JS timeout in case the interval is throttled (e.g.
  // backgrounded tab on web). Fires onComplete after the full duration
  // elapsed regardless of whether the interval ran.
  useEffect(() => {
    if (!running || completedRef.current) return;
    const fallbackMs = startProgressRef.current * safeDuration * 1000 + 200;
    const t = setTimeout(() => {
      triggerComplete();
    }, fallbackMs);
    return () => clearTimeout(t);
  }, [running, safeDuration, triggerComplete]);

  // Bar color: green > yellow > red as it depletes.
  const barColor = progress <= 0.15 ? colors.wrong : progress <= 0.4 ? colors.gold : colors.correct;
  const widthPct = `${Math.max(0, Math.min(100, progress * 100))}%` as `${number}%`;

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.border }, style]}
    >
      <View
        style={[
          styles.fill,
          { borderRadius: height / 2, width: widthPct, backgroundColor: barColor },
        ]}
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
