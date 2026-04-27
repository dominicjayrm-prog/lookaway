/**
 * Top-level Daily Challenge route. Mounts the shared container,
 * which drives the full reveal -> memorise -> recall -> result
 * flow for whichever mode is active today.
 *
 * Re-entry path: if the player taps the home card AFTER they've
 * already played today, we land here too. The container detects
 * the existing result via the `alreadyPlayed` prop and skips
 * straight to the result screen (read-only) so they can re-share
 * but can't re-attempt.
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/src/providers/ThemeProvider';
import { DailyChallengeContainer } from '@/src/features/dailyChallenge/views/DailyChallengeContainer';
import { hasPlayedToday } from '@/src/features/dailyChallenge/service';
import type { DailyChallengeResult } from '@/src/features/dailyChallenge/types';

export default function DailyChallengeRoute() {
  const router = useRouter();
  const { colors } = useTheme();
  // `?force=1` skips the played-today check entirely so the dev
  // "Reset (dev)" pill on the home card can re-enter playable state
  // without depending on a Supabase delete (RLS silently no-ops
  // delete-without-policy, so we can't reliably wipe the row from
  // the client). The submit handler later just overwrites the row
  // implicitly via the unique-key collision path — the local result
  // still drives the result screen render so the player sees their
  // freshly-attempted score, not the stale one.
  const params = useLocalSearchParams<{ force?: string }>();
  const force = params.force === '1';
  const [check, setCheck] = useState<{ played: boolean; result: DailyChallengeResult | null } | null>(
    force ? { played: false, result: null } : null,
  );

  useEffect(() => {
    if (force) return;
    let cancelled = false;
    hasPlayedToday().then((res) => { if (!cancelled) setCheck(res); });
    return () => { cancelled = true; };
  }, [force]);

  const handleClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  if (check === null) {
    return (
      <View style={[s.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <DailyChallengeContainer
      alreadyPlayed={check.played}
      initialResult={check.result ? {
        score: check.result.score,
        timeSeconds: check.result.timeSeconds,
        challengeDate: check.result.challengeDate,
      } : undefined}
      onClose={handleClose}
    />
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
