/**
 * Home-screen card that opens today's Daily Challenge.
 *
 * Three states per spec 1.1:
 *   A — Not played today: title + mode name + reset countdown +
 *       soft pulse on the CTA. The default appearance.
 *   B — Played today: "Done", shows score + time, calm appearance.
 *       Tapping re-opens the result view (read-only).
 *   C — Streak alert (after 6pm local, played yesterday but not
 *       today, streak >= 2): "Don't break your X-day streak"
 *       subtitle, slightly more visually present than A.
 *
 * Live countdown ticks once per minute (no second-by-second to
 * avoid the eye-grabbing churn the spec calls out).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated as RNAnimated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { t } from '@/src/i18n';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { hasPlayedToday, resetTodaysChallenge } from '../service';
import { todayUtcIso } from '../seededRandom';
import { getModeForDate, getModeDisplayName } from '../modeRotation';
import type { DailyChallengeResult } from '../types';

type CardState =
  | { kind: 'loading' }
  | { kind: 'not_played'; mode: string; resetsInMinutes: number }
  | { kind: 'played'; result: DailyChallengeResult }
  | { kind: 'streak_alert'; mode: string; resetsInMinutes: number; streakCount: number };

function minutesUntilUtcMidnight(now: Date = new Date()): number {
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0,
  ));
  return Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
}

function formatCountdown(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return t('daily_challenge.card.countdown_minutes', { m });
  return t('daily_challenge.card.countdown_hours', { h, m });
}

export function DailyChallengeCard() {
  const { colors } = useTheme();
  const router = useRouter();
  const streakCount = useGameStore((s) => s.streakCount);
  const lastPlayDate = useGameStore((s) => s.lastPlayDate);
  const userId = useGameStore((s) => s._authUserId);

  const [state, setState] = useState<CardState>({ kind: 'loading' });
  const [tickKey, setTickKey] = useState(0);

  const todayIso = useMemo(() => todayUtcIso(), [tickKey]);
  const todayMode = useMemo(() => getModeForDate(), [tickKey]);

  // Re-check played-today status:
  //   - on mount,
  //   - whenever auth user changes (sign in / sign out),
  //   - whenever the streakCount bumps (we just submitted today's
  //     challenge, which incrementStreak triggered),
  //   - on minute-tick so the countdown stays fresh + the state
  //     auto-flips at UTC midnight without needing an app reopen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { played, result } = await hasPlayedToday();
      if (cancelled) return;
      if (played && result) {
        setState({ kind: 'played', result });
      } else {
        // Streak-alert state requires:
        //   - user has a 2+ day streak
        //   - they played YESTERDAY (lastPlayDate matches)
        //   - it's after 6pm LOCAL (not UTC — alert urgency is
        //     keyed to the player's evening)
        const localHour = new Date().getHours();
        const yesterdayIso = (() => {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() - 1);
          return todayUtcIso(d);
        })();
        const minutes = minutesUntilUtcMidnight();
        if (
          streakCount >= 2 &&
          lastPlayDate === yesterdayIso &&
          localHour >= 18
        ) {
          setState({
            kind: 'streak_alert',
            mode: getModeDisplayName(todayMode),
            resetsInMinutes: minutes,
            streakCount,
          });
        } else {
          setState({
            kind: 'not_played',
            mode: getModeDisplayName(todayMode),
            resetsInMinutes: minutes,
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userId, streakCount, lastPlayDate, todayMode, todayIso, tickKey]);

  // Minute-tick. Drives both the countdown text + the UTC midnight
  // state flip from "played" back to "not played" without needing
  // the user to reopen the app.
  useEffect(() => {
    const id = setInterval(() => setTickKey((k) => k + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Pulsing CTA glow for the not-played + streak-alert states.
  // Skipped for "played" so the card reads as calm + completed.
  const pulse = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (state.kind !== 'not_played' && state.kind !== 'streak_alert') return;
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        RNAnimated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state.kind, pulse]);

  const handleOpen = () => router.push('/daily-challenge');

  // Dev escape hatch: navigate straight into the daily-challenge
  // route with `?force=1`, which skips the played-today check on
  // the route side. Doesn't depend on Supabase row deletion (RLS
  // silently no-ops delete-without-policy, so a client-side delete
  // can't be relied on here). Fire the row delete in the background
  // anyway — if a future RLS policy is added it'll start working
  // automatically; today it's a harmless no-op.
  const handleResetLongPress = () => {
    resetTodaysChallenge().catch(() => {});
    router.push('/daily-challenge?force=1');
  };

  if (state.kind === 'loading') {
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.title, { color: colors.textMid }]}>{t('daily_challenge.card.title')}</Text>
        <Text style={[s.subtitle, { color: colors.textLight }]}>{t('daily_challenge.card.loading')}</Text>
      </View>
    );
  }

  if (state.kind === 'played') {
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable
          onPress={handleOpen}
          onLongPress={handleResetLongPress}
          delayLongPress={700}
          style={({ pressed }) => [pressed && { opacity: 0.92 }]}
          accessibilityRole="button"
          accessibilityLabel={t('daily_challenge.card.view_done_aria')}
        >
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { color: colors.text }]}>
                {t('daily_challenge.card.done_prefix')} {t('daily_challenge.card.done_check')} <Text style={{ color: colors.correct }}>✓</Text>
              </Text>
              <Text style={[s.subtitle, { color: colors.textMid }]}>
                {t('daily_challenge.card.score_time', { score: state.result.score, time: state.result.timeSeconds.toFixed(1) })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </View>
        </Pressable>
        {/* Dev-only reset button. Visible so testers can replay
            without discovering the hidden long-press gesture. Remove
            this whole Pressable + the import of resetTodaysChallenge
            before shipping. */}
        <Pressable
          onPress={handleResetLongPress}
          style={({ pressed }) => [
            s.devResetBtn,
            { borderColor: colors.border, backgroundColor: colors.surface },
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Reset today's challenge for testing"
        >
          <Ionicons name="refresh" size={13} color={colors.textMid} />
          <Text style={[s.devResetText, { color: colors.textMid }]}>Reset (dev)</Text>
        </Pressable>
      </View>
    );
  }

  // not_played + streak_alert share the active-state visual. The
  // streak alert just adds the streak subtitle and bumps prominence.
  const isAlert = state.kind === 'streak_alert';

  return (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [
        s.cardActive,
        pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('daily_challenge.card.open_aria', { mode: state.mode, time: formatCountdown(state.resetsInMinutes) })}
    >
      <LinearGradient
        colors={isAlert ? ['#FF6B6B', '#E84545'] : ['#6C5CE7', '#8F7EEB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle pulse halo behind the CTA chevron to draw the eye. */}
      <RNAnimated.View
        style={[
          s.pulseHalo,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.0, 0.18] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
          },
        ]}
      />
      <View style={s.activeRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.activeEyebrow}>
            {isAlert ? t('daily_challenge.card.streak_alert_eyebrow') : t('daily_challenge.card.today_eyebrow')}
          </Text>
          <Text style={s.activeTitle}>{t('daily_challenge.card.title')}</Text>
          <Text style={s.activeSubtitle}>
            {isAlert
              ? t('daily_challenge.card.streak_alert_subtitle', { count: state.streakCount })
              : t('daily_challenge.card.subtitle_resets', { mode: state.mode, time: formatCountdown(state.resetsInMinutes) })}
          </Text>
        </View>
        <View style={s.activeChevron}>
          <Ionicons name="play" size={22} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 10,
    elevation: 1,
  },
  cardActive: {
    borderRadius: 16, padding: 18, overflow: 'hidden',
    shadowColor: '#6C5CE7', shadowOpacity: 0.28, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14,
    elevation: 5,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 15, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 4 },
  activeEyebrow: {
    fontSize: 10, fontWeight: '900', letterSpacing: 2,
    color: 'rgba(255,255,255,0.78)',
  },
  activeTitle: {
    fontSize: 18, fontWeight: '900', color: '#FFFFFF',
    marginTop: 2, letterSpacing: -0.3,
  },
  activeSubtitle: {
    fontSize: 12, fontWeight: '600',
    color: 'rgba(255,255,255,0.85)', marginTop: 4,
  },
  activeChevron: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)',
  },
  pulseHalo: {
    position: 'absolute', right: 12, top: '50%', marginTop: -42,
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#FFFFFF',
  },
  devResetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  devResetText: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.4,
  },
});
