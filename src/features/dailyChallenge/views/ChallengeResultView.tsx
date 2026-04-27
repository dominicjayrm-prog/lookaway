/**
 * Standardised post-challenge result screen. Shared across every
 * mode so future Phases 3-5 inherit the same celebration shape.
 *
 * Layout:
 *   - Eyebrow: DAILY CHALLENGE — Mar 27
 *   - Centre hero: mode title + Blink (cheerful / thoughtful /
 *     encouraging based on score band)
 *   - Animated score count-up
 *   - Time (smaller, secondary)
 *   - Streak with milestone celebration if just hit 7/30/100/365
 *   - Share button
 *   - Back to home button
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated as RNAnimated, Platform, Share, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBlink, type BlinkExpression } from '@/src/components/AnimatedBlink';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import type { DailyChallengeModeId } from '../types';
import { MODE_DISPLAY_NAMES } from '../modeRotation';
import { buildShareCardText } from './ShareCardGenerator';

interface Props {
  mode: DailyChallengeModeId;
  challengeDate: string;
  score: number;
  timeSeconds: number;
  shareCardEmojiBlocks: string;
  /** True when the player came back to a previously-completed
   *  daily — disables the "share with current streak" line and
   *  surfaces "Already played today" instead of celebration. */
  alreadyPlayed?: boolean;
  onClose: () => void;
}

const STREAK_MILESTONES = [7, 30, 100, 365];

function blinkForScore(score: number): BlinkExpression {
  if (score >= 80) return 'celebrate';
  if (score >= 50) return 'thinking';
  return 'love'; // encouraging, not crushing
}

function copyForScore(score: number): { headline: string; sub: string } {
  if (score >= 90) return { headline: 'Perfect recall.', sub: 'Memory like a steel trap.' };
  if (score >= 80) return { headline: 'Sharp.', sub: 'You held nearly all of it.' };
  if (score >= 50) return { headline: 'Solid.', sub: 'A few digits slipped, but the core was there.' };
  return { headline: 'Good attempt.', sub: "We'll get a stronger one tomorrow." };
}

export function ChallengeResultView({
  mode, challengeDate, score, timeSeconds, shareCardEmojiBlocks, alreadyPlayed, onClose,
}: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const streakCount = useGameStore((s) => s.streakCount);
  const fadeIn = useRef(new RNAnimated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  // Brief milestone flag — true if the player JUST hit a 7/30/100/
  // 365 day streak with this submission. Drives a subtle pulse on
  // the streak pill so milestones feel earned.
  const milestoneJustHit = !alreadyPlayed && STREAK_MILESTONES.includes(streakCount);

  useEffect(() => {
    RNAnimated.timing(fadeIn, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    // Count-up animation, ease-out cubic, ~1.1s.
    const start = Date.now();
    const dur = 1100;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(score * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [fadeIn, score]);

  const handleShare = async () => {
    const message = buildShareCardText({
      mode, challengeDate, score, timeSeconds, shareCardEmojiBlocks,
      streakCount,
    });
    try {
      await Share.share({ message });
    } catch (e) {
      Alert.alert('Could not share', 'Try again in a moment.');
    }
  };

  const headline = copyForScore(score);
  const dateLabel = formatHumanDate(challengeDate);

  return (
    <RNAnimated.View style={[s.root, { backgroundColor: colors.bg, opacity: fadeIn }]}>
      <Text style={[s.eyebrow, { color: colors.textMid }]}>
        DAILY CHALLENGE — {dateLabel}
      </Text>

      <View style={s.heroBlock}>
        <AnimatedBlink expression={blinkForScore(score)} size={108} entrance="spring" />
        <Text style={[s.modeName, { color: colors.text }]}>{MODE_DISPLAY_NAMES[mode]}</Text>
        <Text style={[s.headline, { color: colors.text }]}>{headline.headline}</Text>
        <Text style={[s.sub, { color: colors.textMid }]}>{headline.sub}</Text>
      </View>

      <View style={[s.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.scoreBig, { color: colors.text }]}>
          {displayScore}<Text style={[s.scoreSuffix, { color: colors.textMid }]}>/100</Text>
        </Text>
        <Text style={[s.timeText, { color: colors.textMid }]}>{timeSeconds.toFixed(1)}s</Text>
      </View>

      {streakCount >= 1 && (
        <View
          style={[
            s.streakPill,
            { backgroundColor: colors.wrongSoft, borderColor: milestoneJustHit ? colors.wrong : 'transparent' },
          ]}
        >
          <Text style={s.streakIcon}>🔥</Text>
          <Text style={[s.streakText, { color: colors.wrong }]}>
            {streakCount}-day streak{milestoneJustHit ? ' · milestone!' : ''}
          </Text>
        </View>
      )}

      {alreadyPlayed && (
        <Text style={[s.alreadyNote, { color: colors.textMid }]}>
          You already played today's challenge. Come back tomorrow for a new one.
        </Text>
      )}

      <View style={s.buttons}>
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            s.primaryBtn, { backgroundColor: colors.accent },
            pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Share result"
        >
          <Ionicons name="share-outline" size={18} color="#FFFFFF" />
          <Text style={s.primaryBtnText}>Share result</Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Text style={[s.secondaryBtnText, { color: colors.accent }]}>Back to home</Text>
        </Pressable>
      </View>
    </RNAnimated.View>
  );
}

function formatHumanDate(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  if (!y || !m || !d) return yyyymmdd;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}`;
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingTop: 32, alignItems: 'center', gap: 16 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  heroBlock: { alignItems: 'center', gap: 8, marginTop: 8 },
  modeName: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 4 },
  headline: { fontSize: 26, fontWeight: '900', textAlign: 'center', letterSpacing: -0.4 },
  sub: { fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  scoreCard: {
    width: '100%', maxWidth: 320, marginTop: 8,
    paddingVertical: 18, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', gap: 4,
  },
  scoreBig: { fontSize: 56, fontWeight: '900', fontVariant: ['tabular-nums'] },
  scoreSuffix: { fontSize: 22, fontWeight: '700' },
  timeText: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5,
  },
  streakIcon: { fontSize: 14 },
  streakText: { fontSize: 13, fontWeight: '800' },
  alreadyNote: { fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 18, marginTop: 4 },
  buttons: { width: '100%', maxWidth: 320, marginTop: 'auto', marginBottom: Platform.OS === 'ios' ? 32 : 20, gap: 8 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 14,
    shadowColor: '#6C5CE7', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 14,
    elevation: 5,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
});
