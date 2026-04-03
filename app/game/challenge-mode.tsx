import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/providers/ThemeProvider';
import { CHALLENGE_MODES } from '@/src/data/challengeModes';

export default function ChallengeModeScreen() {
  const { mode, friendId, action, challengeId } = useLocalSearchParams<{ mode: string; friendId?: string; action?: string; challengeId?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const modeConfig = CHALLENGE_MODES[mode ?? 'classic'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.content}>
        <View style={[styles.iconBg, { backgroundColor: modeConfig?.color ?? '#6C5CE7' }]}>
          <Text style={styles.iconText}>{modeConfig?.name?.[0] ?? '?'}</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{modeConfig?.name ?? 'Unknown Mode'}</Text>
        <Text style={[styles.subtitle, { color: colors.textMid }]}>{modeConfig?.howItWorks ?? ''}</Text>
        <View style={[styles.comingSoon, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.comingSoonText, { color: colors.accent }]}>Coming soon!</Text>
          <Text style={[styles.comingSoonSub, { color: colors.textMid }]}>This exclusive mode is being built. Classic mode is available now.</Text>
        </View>
        <Pressable style={[styles.backBtn, { backgroundColor: modeConfig?.color ?? colors.accent }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16 },
  iconBg: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  comingSoon: { padding: 20, borderRadius: 16, alignItems: 'center', width: '100%' },
  comingSoonText: { fontSize: 16, fontWeight: '700' },
  comingSoonSub: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  backBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, marginTop: 8 },
  backBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
