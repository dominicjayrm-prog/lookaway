import { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { supabase } from '@/src/lib/supabase';

/** Onboarding-seen check. AsyncStorage is the source of truth on
 *  native (onboarding.tsx writes it there); localStorage is the web
 *  fallback. The old version read ONLY localStorage — which doesn't
 *  exist on native iOS — so any user who finished onboarding but
 *  bailed at the auth screen was forced through the entire warm-up
 *  again on next launch. */
async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem('blanked_onboarded');
    if (v === 'true') return true;
  } catch {}
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('blanked_onboarded') === 'true';
    }
  } catch {
    // localStorage may throw on native iOS even if window exists
  }
  return false;
}

function Index() {
  const { session, loading, passwordRecovery } = useAuth();
  const { colors } = useTheme();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    hasSeenOnboarding().then((seen) => { if (!cancelled) setOnboarded(seen); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!session) {
      setHasUsername(null);
      return;
    }

    // Guest users always have a synthetic `player_xxxx` username
    // written inline by signInAsGuest(), so they're treated as
    // "has username" without a round-trip. Without this short-circuit
    // a freshly-installed Meta-ads user would race the profile
    // upsert and momentarily bounce through /username — which is
    // exactly the wall we built guest mode to remove.
    if (session.user.is_anonymous) {
      setHasUsername(true);
      return;
    }

    // ALWAYS check profiles.username directly — never trust
    // user_metadata.display_name as a proxy. Supabase auto-populates
    // user_metadata from Apple's fullName claim on the first Apple
    // Sign-In, which used to make this branch short-circuit to
    // `hasUsername = true` and skip the `/username` picker. Result:
    // Apple users landed straight in /(tabs) with profiles.username
    // still NULL — they looked fine in the app (the header greeting
    // falls back to user_metadata) but showed up as "Player" in the
    // admin panel and any leaderboard that reads profiles.username.
    //
    // Email/password signup already writes to profiles.username
    // synchronously before redirecting here (see app/(auth)/login.tsx
    // signup handler) so those users pass this check on first render
    // with no extra latency beyond the single round-trip below.
    let cancelled = false;

    async function checkUsername() {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session!.user.id)
        .single();

      if (!cancelled) {
        setHasUsername(!!profile?.username);
      }
    }

    checkUsername();
    return () => { cancelled = true; };
  }, [session]);

  if (loading || onboarded === null) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Already logged in — check for username before entering app
  if (session) {
    // Password reset flow: Supabase's PKCE exchange hands us a real
    // session, but the user hasn't proven they know the new
    // password yet — they still need to set it. Hard-redirect to
    // the reset screen instead of letting them into the app.
    // The flag is cleared after a successful password update (or
    // on SIGNED_OUT) so normal sign-in flows don't detour here.
    if (passwordRecovery) {
      return <Redirect href="/(auth)/reset-password" />;
    }

    // Still checking username — show loading
    if (hasUsername === null) {
      return (
        <View style={[styles.loading, { backgroundColor: colors.bg }]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    if (!hasUsername) {
      return <Redirect href="/username" />;
    }

    return <Redirect href="/(tabs)" />;
  }

  // New user who hasn't seen onboarding — show it
  if (!onboarded) {
    return <Redirect href="/onboarding" />;
  }

  // Seen onboarding but not logged in — go to login
  return <Redirect href="/(auth)/login" />;
}

export default Index;
const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
