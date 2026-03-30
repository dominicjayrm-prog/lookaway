import { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { useTheme } from '@/src/providers/ThemeProvider';

function hasSeenOnboarding(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('lookaway_onboarded') === 'true';
  } catch { return false; }
}

export default function Index() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => { setOnboarded(hasSeenOnboarding()); }, []);

  if (loading || onboarded === null) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Already logged in — go straight to app
  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  // New user who hasn't seen onboarding — show it
  if (!onboarded) {
    return <Redirect href="/onboarding" />;
  }

  // Seen onboarding but not logged in — go to login
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
