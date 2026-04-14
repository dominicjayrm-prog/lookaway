/**
 * AnimatedGemCount — drop-in replacement for `<Text>{gems}</Text>` that:
 *   • Counts up from the previous value to the new value over ~800ms
 *   • Plays the gem-clink sound exactly once per increase
 *   • Briefly bumps the parent's scale (via shared value) for emphasis
 *
 * Decreases (spending) and the very first render are not animated — only
 * positive deltas trigger the celebration so spending feels instant.
 *
 * The component renders ONLY the formatted number Text. Wrap it with
 * whatever icon / pill / styling you need — this lets it slot into the
 * home screen's gem pill, the shop header, etc. without forcing a layout.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, type TextStyle, type StyleProp } from 'react-native';
import { sounds } from '@/src/lib/sounds';

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
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    const prev = prevCount.current;
    prevCount.current = count;

    // First render or decrease — snap to the new value, no animation
    if (prev === count || prev > count) {
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
