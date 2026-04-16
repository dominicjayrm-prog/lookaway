/**
 * AnimatedGemCount — drop-in replacement for `<Text>{gems}</Text>` that:
 *   • Counts up from the previous value to the new value over ~800ms
 *   • Plays the gem-clink sound exactly once per increase
 *   • Briefly bumps the parent's scale (via shared value) for emphasis
 *
 * Decreases (spending), the very first render, AND any count change
 * that lands inside the hydration grace window are not animated — only
 * actual in-session gains (reward claims, level completions, purchases)
 * trigger the celebration.
 *
 * Why the grace window: the component typically mounts while the
 * Zustand store still holds its default (0 gems), then the cloud
 * sync finishes a beat later and bumps the count to the user's real
 * balance. Without the grace window that hydration bump looked like
 * a +N gain, so every app launch played the clink sound and animated
 * the pill — which is exactly what the user complained about.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import { sounds } from '@/src/lib/sounds';

/**
 * How long after mount to suppress count-up animations. 1500ms is
 * comfortably longer than a typical cloud hydration round-trip (~400-
 * 800ms) but still short enough that a real reward claimed within
 * the first couple seconds of app open still animates.
 */
const HYDRATION_GRACE_MS = 1500;

interface AnimatedGemCountProps {
  count: number;
  style?: StyleProp<TextStyle>;
  /** Override the sound effect ('gemClink' by default). Set to null to mute. */
  sound?: 'gemClink' | null;
}

export const AnimatedGemCount = React.memo(function AnimatedGemCount({
  count,
  style,
  sound = 'gemClink',
}: AnimatedGemCountProps) {
  const prevCount = useRef(count);
  const mountedRef = useRef(true);
  const mountedAt = useRef(Date.now());
  useEffect(() => () => { mountedRef.current = false; }, []);
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    const prev = prevCount.current;
    prevCount.current = count;

    // First render or decrease — snap to the new value, no animation
    if (prev === count || prev > count) {
      setDisplayCount(count);
      return;
    }

    // Hydration grace — the count went up but it's within the first
    // 1.5s of mount, so it's almost certainly the cloud sync landing
    // with the user's real balance. Snap silently.
    if (Date.now() - mountedAt.current < HYDRATION_GRACE_MS) {
      setDisplayCount(count);
      return;
    }

    // Positive delta — count-up animation
    const diff = count - prev;
    // Cap frames so a +1000 reward doesn't tick a thousand times.
    // Always animate over ~800ms regardless of diff size.
    const steps = Math.max(8, Math.min(diff, 24));
    const stepTime = Math.round(800 / steps);
    let frame = 0;

    if (sound) sounds.play(sound);

    const interval = setInterval(() => {
      // Bail if the component unmounted mid-tick — avoids "setState on
      // unmounted component" warnings during rapid screen transitions.
      if (!mountedRef.current) {
        clearInterval(interval);
        return;
      }
      frame++;
      const progress = frame / steps;
      // Ease-out so it settles smoothly on the final value
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplayCount(Math.round(prev + diff * eased));
      if (frame >= steps) {
        clearInterval(interval);
        setDisplayCount(count); // Guarantee the final value lands exactly
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [count, sound]);

  return <Text style={style}>{displayCount.toLocaleString()}</Text>;
});
