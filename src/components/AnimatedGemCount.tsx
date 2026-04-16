/**
 * AnimatedGemCount — drop-in replacement for `<Text>{gems}</Text>` that
 * counts up from the previous value to the new value over ~800ms.
 *
 * Sound responsibility moved to `addGems()` in the store — see the
 * docstring there for why. The `sound` prop is kept for API stability
 * but ignored, since the store now owns the audio cue.
 *
 * Decreases (spending), the very first render, AND any count change
 * that lands inside the hydration grace window are not animated.
 *
 * Why the grace window: the component typically mounts while the
 * Zustand store still holds its default (0 gems), then the cloud
 * sync finishes a beat later and bumps the count to the user's real
 * balance. Without the grace window that hydration bump looked like
 * a +N gain.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';

/**
 * How long after mount to suppress count-up animations. Bumped from
 * 1500ms → 3000ms because slow Supabase round trips were exceeding
 * the old window and re-triggering the visual count-up on hydration.
 * 3s is still well below "user has navigated and earned gems" speed.
 */
const HYDRATION_GRACE_MS = 3000;

interface AnimatedGemCountProps {
  count: number;
  style?: StyleProp<TextStyle>;
  /** @deprecated — sound is now played by `addGems()` in the store. */
  sound?: 'gemClink' | null;
}

export const AnimatedGemCount = React.memo(function AnimatedGemCount({
  count,
  style,
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
    // 3s of mount, so it's almost certainly the cloud sync landing
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
  }, [count]);

  return <Text style={style}>{displayCount.toLocaleString()}</Text>;
});
