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
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/providers/ThemeProvider';
import { DailyChallengeContainer } from '@/src/features/dailyChallenge/views/DailyChallengeContainer';
import { hasPlayedToday } from '@/src/features/dailyChallenge/service';
import type { DailyChallengeResult } from '@/src/features/dailyChallenge/types';

// TEMPORARY (QA): in dev builds, force a fresh play every visit so
// the developer can re-test Phase 4 without manually wiping their
// daily_challenge_results row. The submit will silently no-op on
// the unique-violation if a row already exists (so streak won't
// double-bump). Also clears the Names & Faces tutorial flag so
// the one-time tutorial replays. Strip this whole block before
// shipping production.
const DEV_REPLAY_BYPASS = __DEV__;

export default function DailyChallengeRoute() {
  const router = useRouter();
  const { colors } = useTheme();
  const [check, setCheck] = useState<{ played: boolean; result: DailyChallengeResult | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (DEV_REPLAY_BYPASS) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.removeItem('blanked_dc_names_and_faces_tutorial_seen');
        } catch {}
        if (!cancelled) setCheck({ played: false, result: null });
        return;
      }
      const res = await hasPlayedToday();
      if (!cancelled) setCheck(res);
    })();
    return () => { cancelled = true; };
  }, []);

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
