/**
 * Memorise phase: shows the digits in a "scrap of paper" card for
 * the configured view window, then dissolves the digits with a
 * fade-out and notifies the caller via onElapsed so the recall view
 * can mount.
 *
 * Designed to feel like glancing at a number scribbled on a napkin
 * — generous letter spacing, monospaced font, soft beige card
 * underneath. Subtle digit-by-digit fade-in keeps it from feeling
 * like a flashed-onscreen wall of numbers.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated, Platform } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';

interface Props {
  digits: readonly number[];
  viewSeconds: number;
  /** Fires when memorise window has elapsed (after fade-out). The
   *  parent then transitions to the recall phase. */
  onElapsed: () => void;
}

const FADE_OUT_MS = 350;
const isWeb = Platform.OS === 'web';

export function PhoneNumberMemoriseView({ digits, viewSeconds, onElapsed }: Props) {
  const { colors } = useTheme();
  // Both opacities start at full visibility — no fade-in. Same iOS
  // layer/text-rasterisation glitch fix as WhatChangedMemoriseView:
  // a `useNativeDriver: true` opacity 0→1 animation over a parent
  // containing <Text> can leave the digit glyphs unrendered until well
  // after the animation completes. For a memorise mode where the
  // player must read those digits, that bug is brutal — we'd rather
  // skip the polish fade-in than risk a player getting an unreadable
  // grid. The fade-out at the end keeps `useNativeDriver: true`
  // because by then the glyphs have been composited and dimming the
  // layer is safe.
  const cardOpacity = useRef(new RNAnimated.Value(1)).current;
  const digitsOpacity = useRef(new RNAnimated.Value(1)).current;
  const [phase, setPhase] = useState<'show' | 'fading'>('show');
  const [secondsLeft, setSecondsLeft] = useState(viewSeconds);

  useEffect(() => {
    // Visible countdown for the player. Tightens the focus.
    const tickId = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, +(s - 0.1).toFixed(1)));
    }, 100);
    const fadeAt = setTimeout(() => {
      setPhase('fading');
      RNAnimated.timing(digitsOpacity, {
        toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true,
      }).start();
    }, viewSeconds * 1000);
    const doneAt = setTimeout(onElapsed, viewSeconds * 1000 + FADE_OUT_MS + 80);

    return () => {
      clearInterval(tickId);
      clearTimeout(fadeAt);
      clearTimeout(doneAt);
    };
  }, [cardOpacity, digitsOpacity, viewSeconds, onElapsed]);

  const a11yLabel = t('daily_challenge.phone_number.memorise_instruction') + ': ' + digits.join(', ');

  return (
    <View style={s.root}>
      <Text style={[s.instruction, { color: colors.textMid }]}>{t('daily_challenge.phone_number.memorise_instruction')}</Text>
      <RNAnimated.View
        style={[
          s.paper,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: cardOpacity },
        ]}
        accessibilityLabel={a11yLabel}
      >
        <RNAnimated.View style={[s.digitsRow, { opacity: digitsOpacity }]}>
          {digits.map((d, i) => (
            <Text key={i} style={[s.digit, { color: colors.text }]}>{d}</Text>
          ))}
        </RNAnimated.View>
      </RNAnimated.View>
      <View style={[s.timerPill, { backgroundColor: colors.accentSoft }]}>
        <Text style={[s.timerText, { color: colors.accent }]}>
          {phase === 'show' ? `${secondsLeft.toFixed(1)}s` : t('daily_challenge.phone_number.look_away')}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 16 },
  instruction: { fontSize: 14, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  paper: {
    width: '100%', maxWidth: 360,
    paddingVertical: 28, paddingHorizontal: 18,
    borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18,
    elevation: 3,
  },
  digitsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  digit: {
    fontSize: 44, fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: isWeb ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : Platform.select({ ios: 'Menlo', android: 'monospace' }),
    letterSpacing: 1,
    minWidth: 28, textAlign: 'center',
  },
  timerPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  timerText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
});
