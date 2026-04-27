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
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import type { ChallengeRevealConfig } from '../types';

const { width: SW } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface Props {
  reveal: ChallengeRevealConfig;
  onBegin: () => void;
}

export function ChallengeRevealView({ reveal, onBegin }: Props) {
  const eyebrowChars = useMemo(() => 'TODAY'.split('').map((ch, i) => ({ ch, idx: i })), []);
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

  return (
    <LinearGradient
      colors={['#4A3BBF', '#6C5CE7', '#8F7EEB']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={s.root}
    >
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
          accessibilityLabel="Begin daily challenge"
        >
          <Text style={s.beginText}>Begin</Text>
        </Pressable>
      </RNAnimated.View>
    </LinearGradient>
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
    color: 'rgba(255,255,255,0.7)',
  },
  title: {
    fontSize: 36, fontWeight: '900', color: '#FFFFFF',
    marginTop: 6, textAlign: 'center', letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.78)',
    textAlign: 'center', marginTop: 8, maxWidth: 280, lineHeight: 20,
  },
  beginBtn: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 44, paddingVertical: 16,
    borderRadius: 999,
    shadowColor: '#000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14,
    elevation: 6,
  },
  beginText: { color: '#4A3BBF', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
});
