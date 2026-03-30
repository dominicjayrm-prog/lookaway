import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressBar } from '@/src/components/ProgressBar';
import { TabTransition } from '@/src/components/TabTransition';
import { useTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/typography';
import { spacing, shadows } from '@/src/theme/spacing';

const WORLD_COLORS: Record<number, string> = { 1: '#00B894', 2: '#0984E3', 3: '#6C5CE7', 4: '#F9A825', 5: '#FF6B6B', 6: '#1A1A18' };

const WORLDS = [
  { id: 1, name: 'Shape Basics', subtitle: 'Learn the fundamentals with simple shapes', levels: 35, unlocked: true, progress: 0, icon: String.fromCodePoint(0x1F535), iconBg: 'rgba(0,184,148,0.12)' },
  { id: 2, name: 'Colour & Position', subtitle: 'Test your spatial and colour memory', levels: 35, unlocked: false, progress: 0, icon: String.fromCodePoint(0x1F3A8), iconBg: 'rgba(9,132,227,0.12)' },
  { id: 3, name: 'Numbers & Letters', subtitle: 'Alphanumeric memory challenges', levels: 35, unlocked: false, progress: 0, icon: String.fromCodePoint(0x1F522), iconBg: 'rgba(108,92,231,0.12)' },
  { id: 4, name: 'Moving Objects', subtitle: 'Track objects in motion', levels: 35, unlocked: false, progress: 0, icon: String.fromCodePoint(0x1F3AC), iconBg: 'rgba(249,168,37,0.12)' },
  { id: 5, name: 'Real Scenes', subtitle: 'Memorise realistic illustrations', levels: 30, unlocked: false, progress: 0, icon: String.fromCodePoint(0x1F4F8), iconBg: 'rgba(255,107,107,0.12)' },
  { id: 6, name: 'Master Challenge', subtitle: 'The ultimate memory test', levels: 30, unlocked: false, progress: 0, icon: String.fromCodePoint(0x1F9E0), iconBg: 'rgba(26,26,24,0.12)' },
];

function worldBadgeBg(c: string): string { return c === '#1A1A18' ? 'rgba(26,26,24,0.08)' : c + '18'; }

export default function JourneyTab() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <TabTransition>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Journey</Text>
        <View style={[styles.starPill, { backgroundColor: colors.goldSoft }]}>
          <Text style={styles.starEmoji}>{String.fromCodePoint(0x2B50)}</Text>
          <Text style={[styles.starCount, { color: colors.gold }]}>0</Text>
          <Text style={[styles.starHint, { color: colors.textLight }]}>(play to earn)</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {WORLDS.map((world) => {
          const accent = WORLD_COLORS[world.id];
          const isCurrent = world.id === 1;
          const completed = Math.round(world.progress * world.levels);
          return (
            <View key={world.id} style={[styles.worldCard, { backgroundColor: colors.card }, shadows.card, isCurrent && { borderWidth: 2, borderColor: colors.accent }, !world.unlocked && { opacity: 0.4 }]}>
              <View style={styles.worldBadgeRow}>
                <View style={[styles.worldBadge, { backgroundColor: worldBadgeBg(accent) }]}>
                  <Text style={[styles.worldBadgeText, { color: accent }]}>WORLD {world.id}</Text>
                </View>
                {!world.unlocked && <Text style={styles.lockIcon}>{String.fromCodePoint(0x1F512)}</Text>}
              </View>
              <View style={styles.worldInfoRow}>
                <View style={[styles.worldIcon, { backgroundColor: world.iconBg }]}>
                  <Text style={styles.worldIconEmoji}>{world.icon}</Text>
                </View>
                <View style={styles.worldInfoText}>
                  <Text style={[styles.worldName, { color: colors.text }]}>{world.name}</Text>
                  <Text style={[styles.worldSubtitle, { color: colors.textMid }]}>{`${world.levels} levels ${String.fromCharCode(8212)} ${world.subtitle}`}</Text>
                </View>
              </View>
              <ProgressBar progress={world.progress} color={accent} height={4} style={styles.progressBar} />
              <Text style={[styles.completedText, { color: colors.textLight }]}>{`${completed}/${world.levels} completed`}</Text>
              {isCurrent && (
                <TouchableOpacity style={[styles.continueButton, { backgroundColor: colors.accent }]} activeOpacity={0.85} onPress={() => router.push('/game/w1-l1')}>
                  <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
              )}
              {!world.unlocked && <Text style={[styles.lockedMessage, { color: colors.textMid }]}>{`Complete World ${world.id - 1} to unlock`}</Text>}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
    </TabTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.lg },
  title: { fontSize: 24, fontWeight: '800' },
  starPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  starEmoji: { fontSize: 14 },
  starCount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  starHint: { fontSize: 11 },
  scrollContent: { gap: spacing.lg, paddingBottom: spacing.xxxl + 20 },
  worldCard: { borderRadius: 16, padding: spacing.lg },
  worldBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  worldBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999 },
  worldBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  lockIcon: { fontSize: 16 },
  worldInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  worldIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  worldIconEmoji: { fontSize: 20 },
  worldInfoText: { flex: 1 },
  worldName: { fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  worldSubtitle: { fontSize: typography.sizes.md, lineHeight: 20 },
  progressBar: { marginBottom: spacing.xs },
  completedText: { fontSize: 11, marginBottom: spacing.md },
  continueButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  continueButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  lockedMessage: { fontSize: typography.sizes.sm, textAlign: 'center' },
});
