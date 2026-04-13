/**
 * Mastermind Intro — dramatic one-time intro screen shown when a player
 * enters Classic World 6 for the first time. Explains the "Deep Memory"
 * staged mechanic, shows Boss Blink, and builds anticipation.
 *
 * After tapping "Enter Mastermind", sets an AsyncStorage flag so the
 * screen never shows again, then navigates to the World 6 level map.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
  Animated as RNAnimated, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/providers/ThemeProvider';
import { AnimatedBlink } from '@/src/components/AnimatedBlink';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW } = Dimensions.get('window');
const GOLD = '#D4A012';
const GOLD_LIGHT = 'rgba(212,160,18,';

// ─── Theme palettes ────────────────────────────────────────────────

const LIGHT = {
  bg: '#FAFAF7',
  cardBg: `${GOLD_LIGHT}0.04)`,
  cardBorder: `${GOLD_LIGHT}0.08)`,
  text: '#1A1A18',
  textMid: '#636E72',
  textLight: '#B2BEC3',
  stepBg: `${GOLD_LIGHT}0.06)`,
  glowColor: `${GOLD_LIGHT}0.15)`,
};

const DARK = {
  bg: '#0D0B18',
  cardBg: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.08)',
  text: '#F0EFF4',
  textMid: '#8E8BA3',
  textLight: '#4A4862',
  stepBg: 'rgba(255,255,255,0.04)',
  glowColor: `${GOLD_LIGHT}0.2)`,
};

const STEPS = [
  {
    title: 'Scenes shown in stages',
    desc: 'Shapes move, swap colours, appear, or disappear between stages.',
  },
  {
    title: 'Questions target specific stages',
    desc: 'Every detail matters \u2014 you\'ll be asked about any stage.',
  },
  {
    title: 'Memory + timing = Mastermind',
    desc: 'Track 2\u20133 versions of the same scene simultaneously.',
  },
];

export default function MastermindIntroScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const t = isDark ? DARK : LIGHT;

  // ── Phased entrance animations ──
  const blinkAnim = useRef(new RNAnimated.Value(0)).current;
  const titleAnim = useRef(new RNAnimated.Value(0)).current;
  const contentAnim = useRef(new RNAnimated.Value(0)).current;
  const ctaAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.stagger(400, [
      RNAnimated.spring(blinkAnim, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      RNAnimated.timing(titleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      RNAnimated.timing(contentAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      RNAnimated.timing(ctaAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [blinkAnim, titleAnim, contentAnim, ctaAnim]);

  const handleEnter = async () => {
    try {
      await AsyncStorage.setItem('mastermind_intro_seen', 'true');
    } catch {}
    router.replace('/world/6');
  };

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── TOP: Badge + Blink + Title ── */}
        <RNAnimated.View style={[st.topSection, {
          opacity: blinkAnim,
          transform: [{ scale: blinkAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
        }]}>
          <View style={[st.badge, { backgroundColor: `${GOLD_LIGHT}0.12)` }]}>
            <Text style={st.badgeText}>WORLD 6 · CLASSIC</Text>
          </View>

          {/* Gold glow behind Blink */}
          <View style={[st.glowCircle, { backgroundColor: t.glowColor }]} />
          <AnimatedBlink expression="mastermind_boss" size={110} entrance="spring" entranceDelay={100} />
        </RNAnimated.View>

        <RNAnimated.View style={{ opacity: titleAnim, transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }] }}>
          <Text style={[st.title, { color: t.text }]}>Mastermind</Text>
          <Text style={[st.subtitle, { color: t.textMid }]}>
            The final challenge. Are you ready?
          </Text>
        </RNAnimated.View>

        {/* ── MIDDLE: Info + Steps ── */}
        <RNAnimated.View style={[st.middleSection, {
          opacity: contentAnim,
          transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }]}>
          {/* Message card */}
          <View style={[st.messageCard, { backgroundColor: t.cardBg, borderColor: t.cardBorder }]}>
            <Text style={[st.messageText, { color: t.textMid }]}>
              You&apos;ve conquered 5 worlds. But Mastermind plays by different rules — scenes change across multiple stages. Remember{' '}
              <Text style={{ fontWeight: '700', color: GOLD }}>when</Text> you saw it, not just what.
            </Text>
          </View>

          {/* 3 numbered steps */}
          {STEPS.map((step, i) => (
            <View key={i} style={[st.stepRow, { backgroundColor: t.stepBg }]}>
              <View style={st.stepNumber}>
                <Text style={st.stepNumberText}>{i + 1}</Text>
              </View>
              <View style={st.stepContent}>
                <Text style={[st.stepTitle, { color: t.text }]}>{step.title}</Text>
                <Text style={[st.stepDesc, { color: t.textMid }]}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </RNAnimated.View>

        {/* ── BOTTOM: Stats + CTA ── */}
        <RNAnimated.View style={[st.bottomSection, {
          opacity: ctaAnim,
          transform: [{ translateY: ctaAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }]}>
          {/* Stats row */}
          <View style={st.statsRow}>
            <View style={st.statItem}>
              <Text style={[st.statNumber, { color: GOLD }]}>40</Text>
              <Text style={[st.statLabel, { color: t.textLight }]}>levels</Text>
            </View>
            <View style={[st.statDivider, { backgroundColor: t.cardBorder }]} />
            <View style={st.statItem}>
              <Text style={[st.statNumber, { color: GOLD }]}>3</Text>
              <Text style={[st.statLabel, { color: t.textLight }]}>stages</Text>
            </View>
            <View style={[st.statDivider, { backgroundColor: t.cardBorder }]} />
            <View style={st.statItem}>
              <Text style={[st.statNumber, { color: GOLD }]}>{'\u221E'}</Text>
              <Text style={[st.statLabel, { color: t.textLight }]}>brain power</Text>
            </View>
          </View>

          {/* Gold CTA */}
          <Pressable
            onPress={handleEnter}
            style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
            accessibilityRole="button"
            accessibilityLabel="Enter Mastermind"
          >
            <LinearGradient
              colors={['#D4A012', '#B8860B'] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={st.ctaButton}
            >
              <Text style={st.ctaText}>Enter Mastermind</Text>
            </LinearGradient>
          </Pressable>
        </RNAnimated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },

  // Top
  topSection: { alignItems: 'center', marginBottom: 24 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 20 },
  badgeText: { fontSize: 9, fontWeight: '800', color: GOLD, letterSpacing: 1.5 },
  glowCircle: {
    position: 'absolute', top: 30,
    width: 160, height: 160, borderRadius: 80,
  },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center', marginTop: 16 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 4 },

  // Middle
  middleSection: { marginBottom: 24 },
  messageCard: {
    padding: 16, borderRadius: 16, borderWidth: 1,
    marginBottom: 16,
  },
  messageText: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 12, borderRadius: 12, marginBottom: 8,
    gap: 12,
  },
  stepNumber: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  stepDesc: { fontSize: 11, lineHeight: 16 },

  // Bottom
  bottomSection: {},
  statsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 20, marginBottom: 20,
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, height: 28 },
  ctaButton: {
    paddingVertical: 15, borderRadius: 14, alignItems: 'center',
    shadowColor: '#D4A012', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
