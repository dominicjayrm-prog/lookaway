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
import { hasPlayedToday } from '../service';
import { todayUtcIso } from '../seededRandom';
import { getModeForDate, getModeDisplayName } from '../modeRotation';
import type { DailyChallengeResult } from '../types';

type CardState =
  | { kind: 'loading' }
  | { kind: 'not_played'; resetsInMinutes: number }
  | { kind: 'played'; result: DailyChallengeResult }
  | { kind: 'streak_alert'; resetsInMinutes: number; streakCount: number };

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
  const lastDailyPlayedDate = useGameStore((s) => s.lastDailyPlayedDate);
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
      // Optimistic done-state from the local cache. If the player
      // submitted today, lastDailyPlayedDate === todayIso and we
      // can short-circuit straight to the played render without
      // waiting for Supabase. Prevents the "card flips back to
      // active when I switch tabs" regression where a transient
      // Supabase read returns played=false even though the row
      // exists. Cloud is still queried below to populate the
      // score/time fields and act as the cross-device authority.
      if (lastDailyPlayedDate === todayIso) {
        setState((prev) => prev.kind === 'played'
          ? prev
          : { kind: 'played', result: { mode: todayMode, score: 0, timeSeconds: 0, shareCardEmojiBlocks: '', challengeDate: todayIso } },
        );
      }
      const { played, result } = await hasPlayedToday();
      if (cancelled) return;
      if (played && result) {
        setState({ kind: 'played', result });
      } else if (lastDailyPlayedDate === todayIso) {
        // Cloud read returned played:false but the local cache says
        // we played today — almost certainly a transient session/RLS
        // hiccup. Keep the played state we already optimistically set
        // above. The next minute-tick will retry.
        return;
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
          // The mode display name isn't stored in state — it's resolved
          // at render time from `todayMode` so language switches (or a
          // late-loading `preferredLanguage` from AsyncStorage) take
          // effect without waiting for the next minute-tick.
          setState({
            kind: 'streak_alert',
            resetsInMinutes: minutes,
            streakCount,
          });
        } else {
          setState({
            kind: 'not_played',
            resetsInMinutes: minutes,
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userId, streakCount, lastPlayDate, lastDailyPlayedDate, todayMode, todayIso, tickKey]);

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
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [
          s.card,
          s.cardCompleted,
          {
            backgroundColor: colors.card,
            // Gold ring around the completed card — earned look that
            // visually signals "this is done" without leaning on the
            // checkmark alone. Slightly soft gold so it sits on the
            // off-white background without screaming.
            borderColor: colors.gold,
            shadowColor: colors.gold,
          },
          pressed && { opacity: 0.92 },
        ]}
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
    );
  }

  // not_played + streak_alert share the active-state visual. The
  // streak alert just adds the streak subtitle and bumps prominence.
  const isAlert = state.kind === 'streak_alert';
  // Resolve mode display name at render time so the locale always
  // matches the current i18n setting (the value cached in state would
  // freeze whatever locale was active when setState ran).
  const modeName = getModeDisplayName(todayMode);

  return (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [
        s.cardActive,
        pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('daily_challenge.card.open_aria', { mode: modeName, time: formatCountdown(state.resetsInMinutes) })}
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
              : t('daily_challenge.card.subtitle_resets', { mode: modeName, time: formatCountdown(state.resetsInMinutes) })}
          </Text>
          {/* Reward preview — the reason to tap. The daily used to
              advertise nothing, so "why come back tomorrow?" had no
              on-screen answer. 15 = calculateDailyReward max. */}
          {!isAlert && (
            <View style={s.rewardRow}>
              <Ionicons name="diamond" size={11} color="rgba(255,255,255,0.85)" />
              <Text style={s.rewardText}>{t('daily_challenge.card.reward_hint')}</Text>
            </View>
          )}
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
  // Gold ring + soft gold shadow when the daily is done. Slightly
  // bumped border weight (1.5) so the ring reads even on small
  // screens without being heavy-handed.
  cardCompleted: {
    borderWidth: 1.5,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  rewardText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  activeChevron: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)',
  },
  pulseHalo: {
    // Centred on the 44×44 chevron. Chevron sits at `padding: 18` from
    // the card's right edge, so its centre is at `cardRight - 40`. With
    // halo width 84 (half = 42), `right` must be `40 - 42 = -2` to put
    // the halo centre on the chevron centre. The card's overflow:hidden
    // clips the 2px sliver past the edge (invisible at rest, ~9px at
    // peak scale 1.18). Pre-fix the halo was at `right: 12`, leaving
    // the glow visibly offset 14px to the left of the play button.
    position: 'absolute', right: -2, top: '50%', marginTop: -42,
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#FFFFFF',
  },
});
