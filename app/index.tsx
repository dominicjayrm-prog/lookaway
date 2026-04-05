import { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';
import { supabase } from '@/src/lib/supabase';

function hasSeenOnboarding(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('blanked_onboarded') === 'true';
  } catch {
    // localStorage may throw on native iOS even if window exists
    return false;
  }
}

function Index() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);

  useEffect(() => { setOnboarded(hasSeenOnboarding()); }, []);

  useEffect(() => {
    if (!session) {
      setHasUsername(null);
      return;
    }

    // Check user_metadata first (set instantly during signUp, no race condition)
    const metaName = session.user.user_metadata?.display_name;
    if (metaName) {
      setHasUsername(true);
      return;
    }

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
