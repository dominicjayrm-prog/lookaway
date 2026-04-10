/**
 * StatsCard — one glass-style card in the 2x3 grid on the Memory Analytics
 * screen. Accepts a theme, an icon emoji, a coloured value (with count-up
 * animation), a label and an optional suffix (% / s).
 *
 * The card mounts with a staggered fade-in handled by the parent via
 * Reanimated's `entering` prop.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface Theme {
  cardBg: string;
  cardBorder: string;
  muted: string;
}

interface Props {
  icon: string;
  value: number;
  suffix?: string;
  /** Number of decimals to display. 0 = integer. */
  decimals?: number;
  label: string;
  color: string;
  theme: Theme;
  /** Delay in ms before the card fades in. */
  delay?: number;
  /** When false, skip the count-up and render the value statically (used for
   *  free-user sample data so the preview feels instant). */
  animate?: boolean;
}

const COUNT_UP_DURATION = 1200;

function useCountUp(target: number, animate: boolean): number {
  const [current, setCurrent] = useState(animate ? 0 : target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      setCurrent(target);
      return;
    }
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / COUNT_UP_DURATION);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(target * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCurrent(target);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, animate]);

  return current;
}

function format(value: number, decimals: number): string {
  if (decimals === 0) return String(Math.round(value));
  return value.toFixed(decimals);
}

export function StatsCard({ icon, value, suffix, decimals = 0, label, color, theme, delay = 0, animate = true }: Props) {
  const displayed = useCountUp(value, animate);
  return (
    <Animated.View
      entering={FadeIn.duration(350).delay(delay)}
      style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, { color }]}>
        {format(displayed, decimals)}{suffix ?? ''}
      </Text>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 98,
  },
  icon: { fontSize: 16, marginBottom: 2 },
  value: { fontSize: 22, fontWeight: '800' },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },
});
