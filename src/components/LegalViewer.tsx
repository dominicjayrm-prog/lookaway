/**
 * LegalViewer — embeds a remote legal page (Privacy Policy / Terms of Use)
 * inside the app so users never leave to Safari.
 *
 * Native iOS/Android: renders a WKWebView via react-native-webview, with
 *   the app's own SafeAreaView + back-button header so it reads as a
 *   standard in-app screen.
 * Web (Expo Router on Vercel): react-native-webview isn't a DOM thing —
 *   falls back to a plain <iframe> with the same header chrome.
 *
 * Both paths show a spinner until the page finishes loading.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';

interface LegalViewerProps {
  url: string;
  title: string;
}

export function LegalViewer({ url, title }: LegalViewerProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const onBack = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  return (
    <SafeAreaView style={[st.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={st.header}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={[st.backBtn, { backgroundColor: colors.surface }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textMid} />
        </Pressable>
        <Text style={[st.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {Platform.OS === 'web' ? (
          // Plain iframe on web — react-native-webview is native-only.
          // Stretch to fill the remaining vertical space below the header.
          // @ts-expect-error — iframe is a DOM element on RN-web
          <iframe
            src={url}
            title={title}
            onLoad={() => setLoading(false)}
            style={{ flex: 1, width: '100%', height: '100%', border: 'none', backgroundColor: colors.bg }}
          />
        ) : (
          <NativeWebView
            url={url}
            onLoadEnd={() => setLoading(false)}
            bg={colors.bg}
          />
        )}

        {loading && (
          <View style={[st.loadingOverlay, { backgroundColor: colors.bg }]}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// Native WebView is a conditional dynamic require so Metro's web bundle
// doesn't try to resolve the native-only module.
function NativeWebView({ url, onLoadEnd, bg }: { url: string; onLoadEnd: () => void; bg: string }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WebView } = require('react-native-webview') as typeof import('react-native-webview');
  return (
    <WebView
      source={{ uri: url }}
      onLoadEnd={onLoadEnd}
      startInLoadingState={false}
      style={{ flex: 1, backgroundColor: bg }}
      // Let embedded links open inside the same WebView so users stay in-app
      setSupportMultipleWindows={false}
    />
  );
}

const st = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  loadingOverlay: {
    position: 'absolute', inset: 0 as unknown as number, top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
});
