/**
 * OfflineScreen — full-screen takeover when the device has no
 * network connection. Mounted once under the root layout; renders
 * null when online, and the Blink "offline" expression + copy
 * when NetInfo reports no connection.
 *
 * Why full-screen instead of a banner:
 *  - Most of the app is online-dependent (Supabase auth, friend
 *    challenges, daily challenge, realtime). A thin banner would
 *    tease the user into tapping around and hitting silent
 *    failures on every screen.
 *  - The user's stated design: cold-start in airplane mode → the
 *    app immediately tells them they're offline, no ambiguity.
 *
 * Once we ship proper offline campaign play (scope B per the
 * plan), this screen should downgrade to a banner so the
 * playable-offline surfaces stay reachable. For now it's the
 * simplest honest UX given almost nothing works offline.
 */
import React from 'react';
import { t } from '@/src/i18n';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Blink } from '@/src/components/Blink';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { useTheme } from '@/src/providers/ThemeProvider';

export function OfflineScreen() {
  const { isOnline, recheck } = useNetworkStatus();
  const { colors } = useTheme();

  // While online, render nothing — this component is a conditional
  // overlay, not a permanent piece of UI.
  if (isOnline) return null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      // `zIndex` + absolute positioning put this above every other
      // screen in the tree — the user can't accidentally tap past
      // it into a broken signed-out flow.
      pointerEvents="auto"
    >
      <View style={styles.content}>
        <Blink expression="offline" size={160} />
        <Text style={[styles.title, { color: colors.text }]}>You’re offline</Text>
        <Text style={[styles.body, { color: colors.textMid }]}>
          Blanked needs an internet connection to sign you in, sync your
          progress, and load daily challenges. Check your Wi-Fi or data
          connection and try again.
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={recheck}
          accessibilityRole="button"
          accessibilityLabel={t('modals.check_connection')}
        >
          <Text style={styles.buttonText}>{t('common.try_again')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    // Ensure this sits above EVERY other layer on iOS / Android.
    ...(Platform.OS === 'web' ? { elevation: 9999 } : {}),
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  button: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 14, marginTop: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
