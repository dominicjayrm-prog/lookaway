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
  View, Text, Pressable, StyleSheet, Animated as RNAnimated, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBlink, type BlinkExpression } from '@/src/components/AnimatedBlink';
import { t } from '@/src/i18n';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import type { DailyChallengeModeId } from '../types';
import { getModeDisplayName } from '../modeRotation';
import { formatHumanDate } from '../formatDate';
import { ShareCardImage, SHARE_CARD_SIZE, type ModeVisual } from './ShareCardImage';
import { captureAndShareCard } from './captureAndShare';
import { sounds } from '@/src/lib/sounds';

interface Props {
  mode: DailyChallengeModeId;
  challengeDate: string;
  score: number;
  timeSeconds: number;
  shareCardEmojiBlocks: string;
  /** Mode-specific visual data for the beautiful share card. Phone
   *  Number passes digit + correctness arrays so the share card can
   *  render coloured pills. */
  modeVisual: ModeVisual;
  /** True when the player came back to a previously-completed
   *  daily. Disables the "share with current streak" line and
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
  if (score >= 90) return { headline: t('daily_challenge.result.headline_perfect'), sub: t('daily_challenge.result.sub_perfect') };
  if (score >= 80) return { headline: t('daily_challenge.result.headline_sharp'), sub: t('daily_challenge.result.sub_sharp') };
  if (score >= 50) return { headline: t('daily_challenge.result.headline_solid'), sub: t('daily_challenge.result.sub_solid') };
  return { headline: t('daily_challenge.result.headline_attempt'), sub: t('daily_challenge.result.sub_attempt') };
}

export function ChallengeResultView({
  mode, challengeDate, score, timeSeconds, shareCardEmojiBlocks, modeVisual, alreadyPlayed, onClose,
}: Props) {
  const { colors } = useTheme();
  const streakCount = useGameStore((s) => s.streakCount);
  const fadeIn = useRef(new RNAnimated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);
  const [sharing, setSharing] = useState(false);
  // Off-screen card view ref. captureAndShareCard rasterises the
  // node referenced here at 1080x1080 then hands the PNG to the OS
  // share sheet (or the Web Share API on supported browsers).
  const shareCardRef = useRef<View>(null);

  // Brief milestone flag — true if the player JUST hit a 7/30/100/
  // 365 day streak with this submission. Drives a subtle pulse on
  // the streak pill so milestones feel earned.
  const milestoneJustHit = !alreadyPlayed && STREAK_MILESTONES.includes(streakCount);

  useEffect(() => {
    RNAnimated.timing(fadeIn, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    // Capstone audio — celebration for fresh strong scores, gentler
    // levelComplete otherwise. Skipped on alreadyPlayed re-views so
    // the player isn't re-celebrated for opening their old result.
    if (!alreadyPlayed) {
      sounds.play(score >= 80 ? 'celebration' : 'levelComplete');
    }
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
    if (sharing) return;
    setSharing(true);
    try {
      const outcome = await captureAndShareCard(shareCardRef, {
        mode, challengeDate, score, timeSeconds, shareCardEmojiBlocks, streakCount,
      });
      if (outcome === 'error' || outcome === 'unavailable') {
        Alert.alert(t('daily_challenge.result.share_error_title'), t('daily_challenge.result.share_error_body'));
      }
    } finally {
      setSharing(false);
    }
  };

  const headline = copyForScore(score);
  const dateLabel = formatHumanDate(challengeDate);

  return (
    <RNAnimated.View style={[s.root, { backgroundColor: colors.bg, opacity: fadeIn }]}>
      <Text style={[s.eyebrow, { color: colors.textMid }]}>
        {t('daily_challenge.result.eyebrow')} — {dateLabel}
      </Text>

      <View style={s.heroBlock}>
        <AnimatedBlink expression={blinkForScore(score)} size={108} entrance="spring" />
        <Text style={[s.modeName, { color: colors.text }]}>{getModeDisplayName(mode)}</Text>
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
            {t('daily_challenge.result.streak_text', { count: streakCount })}
            {milestoneJustHit ? t('daily_challenge.result.streak_milestone_suffix') : ''}
          </Text>
        </View>
      )}

      {alreadyPlayed && (
        <Text style={[s.alreadyNote, { color: colors.textMid }]}>
          {t('daily_challenge.result.already_played')}
        </Text>
      )}

      <View style={s.buttons}>
        <Pressable
          onPress={handleShare}
          disabled={sharing}
          style={({ pressed }) => [
            s.primaryBtn, { backgroundColor: colors.accent },
            pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] },
            sharing && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('daily_challenge.result.share_aria')}
        >
          <Ionicons name="share-outline" size={18} color="#FFFFFF" />
          <Text style={s.primaryBtnText}>{sharing ? t('daily_challenge.result.share_button_preparing') : t('daily_challenge.result.share_button')}</Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={t('daily_challenge.result.back_aria')}
        >
          <Text style={[s.secondaryBtnText, { color: colors.accent }]}>{t('daily_challenge.result.back_button')}</Text>
        </Pressable>
      </View>

      {/* Off-screen 1080x1080 share card. Positioned absolutely far
          off-screen + opacity 0.001 so it never flashes for the
          player but still renders into the layout tree (a true
          0-opacity / display:none view doesn't paint, which would
          break view-shot's capture). */}
      <View pointerEvents="none" style={s.offscreenCard}>
        <ShareCardImage
          ref={shareCardRef}
          mode={mode}
          challengeDate={challengeDate}
          score={score}
          timeSeconds={timeSeconds}
          streakCount={streakCount}
          modeVisual={modeVisual}
        />
      </View>
    </RNAnimated.View>
  );
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
  // Off-screen render of the share card. Positioned far enough out
  // of the viewport that it can't appear even if a layout glitch
  // tries to push it visible.
  offscreenCard: {
    position: 'absolute',
    left: -99999,
    top: -99999,
    width: SHARE_CARD_SIZE,
    height: SHARE_CARD_SIZE,
    opacity: 0.001,
  },
});
