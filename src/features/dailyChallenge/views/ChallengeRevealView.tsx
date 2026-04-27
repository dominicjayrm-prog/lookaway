/**
 * The reveal animation. This is the moment users will look forward
 * to every day per the spec ("opening a small daily gift"), so it
 * gets disproportionate polish:
 *   - Screen fades to deep purple.
 *   - "TODAY" eyebrow appears character by character.
 *   - Mode title fades up.
 *   - Blink expression pops in.
 *   - "Begin" button fades in last.
 *
 * Total sequence: ~1.8 seconds. Spec cap is 2s.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated as RNAnimated, Dimensions, Platform,
} from 'react-native';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import { t } from '@/src/i18n';
import type { ChallengeRevealConfig } from '../types';

const { width: SW } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface Props {
  reveal: ChallengeRevealConfig;
  onBegin: () => void;
}

export function ChallengeRevealView({ reveal, onBegin }: Props) {
  // The eyebrow word is i18n-driven so the Spanish locale shows
  // "HOY" (3 chars) instead of "TODAY" (5 chars). The character-by-
  // character stagger animation reads the word's length, so the
  // animation auto-adjusts.
  const eyebrowChars = useMemo(() => t('daily_challenge.reveal.today').split('').map((ch, i) => ({ ch, idx: i })), []);
  const [eyebrowShown, setEyebrowShown] = useState(0);
  const titleOpacity = useRef(new RNAnimated.Value(0)).current;
  const titleY = useRef(new RNAnimated.Value(12)).current;
  const subtitleOpacity = useRef(new RNAnimated.Value(0)).current;
  const blinkOpacity = useRef(new RNAnimated.Value(0)).current;
  const beginOpacity = useRef(new RNAnimated.Value(0)).current;
  const beginY = useRef(new RNAnimated.Value(8)).current;

  useEffect(() => {
    // Eyebrow chars stagger every 80ms.
    const eyebrowTimers = eyebrowChars.map((_, i) =>
      setTimeout(() => setEyebrowShown((n) => Math.max(n, i + 1)), 120 + i * 80),
    );
    // Title at ~580ms.
    const t1 = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(titleOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        RNAnimated.spring(titleY, { toValue: 0, friction: 10, tension: 80, useNativeDriver: true }),
      ]).start();
    }, 580);
    // Subtitle at 880ms.
    const t2 = setTimeout(() => {
      RNAnimated.timing(subtitleOpacity, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    }, 880);
    // Blink pop at 980ms.
    const t3 = setTimeout(() => {
      RNAnimated.timing(blinkOpacity, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    }, 980);
    // Begin button at 1450ms.
    const t4 = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(beginOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        RNAnimated.spring(beginY, { toValue: 0, friction: 10, tension: 90, useNativeDriver: true }),
      ]).start();
    }, 1450);
    return () => { eyebrowTimers.forEach(clearTimeout); [t1, t2, t3, t4].forEach(clearTimeout); };
  }, [eyebrowChars, titleOpacity, titleY, subtitleOpacity, blinkOpacity, beginOpacity, beginY]);

  // Background was a deep purple gradient in v1, but Blink itself
  // is purple so the mascot blended into the backdrop on screen.
  // Switching to a warm cream (matches the home tab + onboarding
  // palette) gives Blink real silhouette + lifts the typography
  // contrast. Title + Begin button still carry the purple accent
  // so the reveal still reads as a dedicated "today's challenge"
  // moment rather than a plain content view.
  return (
    <View style={[s.root, { backgroundColor: '#F7F6F3' }]}>
      <View style={s.eyebrowRow}>
        {eyebrowChars.map(({ ch, idx }) => (
          <Text
            key={idx}
            style={[s.eyebrow, { opacity: idx < eyebrowShown ? 1 : 0 }]}
          >
            {ch}
          </Text>
        ))}
      </View>

      <RNAnimated.View
        style={{ opacity: blinkOpacity, marginTop: 6, marginBottom: 14 }}
      >
        <AnimatedBlink expression={reveal.blinkExpression} size={120} entrance="none" />
      </RNAnimated.View>

      <RNAnimated.Text
        style={[s.title, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}
        accessibilityRole="header"
      >
        {reveal.title}
      </RNAnimated.Text>

      <RNAnimated.Text style={[s.subtitle, { opacity: subtitleOpacity }]}>
        {reveal.subtitle}
      </RNAnimated.Text>

      <RNAnimated.View style={{ opacity: beginOpacity, transform: [{ translateY: beginY }], marginTop: 36 }}>
        <Pressable
          onPress={onBegin}
          style={({ pressed }) => [
            s.beginBtn,
            pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('daily_challenge.reveal.begin_aria')}
        >
          <Text style={s.beginText}>{t('daily_challenge.reveal.begin')}</Text>
        </Pressable>
      </RNAnimated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
    width: '100%', maxWidth: isWeb ? 430 : undefined, alignSelf: 'center',
  },
  eyebrowRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  eyebrow: {
    fontSize: 12, fontWeight: '900', letterSpacing: 4,
    color: '#6C5CE7',
  },
  title: {
    fontSize: 36, fontWeight: '900', color: '#1A1A18',
    marginTop: 6, textAlign: 'center', letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, color: '#636E72',
    textAlign: 'center', marginTop: 8, maxWidth: 280, lineHeight: 20,
  },
  beginBtn: {
    backgroundColor: '#6C5CE7', paddingHorizontal: 44, paddingVertical: 16,
    borderRadius: 999,
    shadowColor: '#6C5CE7', shadowOpacity: 0.32, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14,
    elevation: 6,
  },
  beginText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
