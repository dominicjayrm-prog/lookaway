import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressBar } from '@/src/components/ProgressBar';
import { TabTransition } from '@/src/components/TabTransition';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { spacing, shadows } from '@/src/theme/spacing';
import Svg, { Rect, Path, Polygon } from 'react-native-svg';

const WORLD_COLORS: Record<number, string> = { 1: '#00B894', 2: '#0984E3', 3: '#6C5CE7', 4: '#F9A825', 5: '#FF6B6B', 6: '#1A1A18' };
const LOCKED_BORDERS: Record<number, string> = { 2: 'rgba(9,132,227,0.2)', 3: 'rgba(108,92,231,0.2)', 4: 'rgba(249,168,37,0.2)', 5: 'rgba(255,107,107,0.2)', 6: 'rgba(26,26,24,0.15)' };

const WORLDS = [
  { id: 1, name: 'Shape Basics', subtitle: 'Learn the fundamentals with simple shapes', levels: 35, unlocked: true, icon: '\u{1F535}', iconBg: 'rgba(0,184,148,0.12)' },
  { id: 2, name: 'Colour & Position', subtitle: 'Test your spatial and colour memory', levels: 35, unlocked: false, icon: '\u{1F3A8}', iconBg: 'rgba(9,132,227,0.12)' },
  { id: 3, name: 'Numbers & Letters', subtitle: 'Alphanumeric memory challenges', levels: 35, unlocked: false, icon: '\u{1F522}', iconBg: 'rgba(108,92,231,0.12)' },
  { id: 4, name: 'Moving Objects', subtitle: 'Track objects in motion', levels: 35, unlocked: false, icon: '\u{1F3AC}', iconBg: 'rgba(249,168,37,0.12)' },
  { id: 5, name: 'Real Scenes', subtitle: 'Memorise realistic illustrations', levels: 30, unlocked: false, icon: '\u{1F4F8}', iconBg: 'rgba(255,107,107,0.12)' },
  { id: 6, name: 'Master Challenge', subtitle: 'The ultimate memory test', levels: 30, unlocked: false, icon: '\u{1F9E0}', iconBg: 'rgba(26,26,24,0.12)' },
];

function StarIcon({ size = 14, color = '#D4A012' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100"><Polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={color} /></Svg>;
}

function LockIcon({ size = 16, color = '#B2BEC3' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={11} width={14} height={11} rx={2} fill={color} />
      <Path d="M8,11 V8 A4,4 0 0,1 16,8 V11" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function worldBadgeBg(c: string): string { return c === '#1A1A18' ? 'rgba(26,26,24,0.08)' : c + '14'; }

export default function JourneyTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { totalStars, getCompletedLevelCount, getNextUnplayedLevelId } = useGameStore();
  const completedCount = getCompletedLevelCount();

  return (
    <TabTransition>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Journey</Text>
        <View style={[styles.starPill, { backgroundColor: colors.goldSoft }]}>
          <StarIcon size={14} color={totalStars > 0 ? '#D4A012' : '#B2BEC3'} />
          <Text style={[styles.starCount, { color: totalStars > 0 ? colors.gold : colors.textLight }]}>{totalStars}/600</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {WORLDS.map((world) => {
          const accent = WORLD_COLORS[world.id];
          const isCurrent = world.id === 1;
          const completed = isCurrent ? completedCount : 0;
          const progress = completed / world.levels;
          const lockedBorder = LOCKED_BORDERS[world.id];

          return (
            <View key={world.id} style={[
              styles.worldCard,
              { backgroundColor: colors.card },
              shadows.card,
              isCurrent && { borderWidth: 2, borderColor: accent },
              !world.unlocked && lockedBorder && { borderLeftWidth: 3, borderLeftColor: lockedBorder },
            ]}>
              <View style={styles.worldBadgeRow}>
                <View style={[styles.worldBadge, { backgroundColor: worldBadgeBg(accent) }]}>
                  <Text style={[styles.worldBadgeText, { color: accent, opacity: world.unlocked ? 1 : 0.5 }]}>WORLD {world.id}</Text>
                </View>
                {!world.unlocked && <LockIcon size={16} color={colors.textLight} />}
              </View>
              <View style={styles.worldInfoRow}>
                <View style={[styles.worldIcon, { backgroundColor: world.iconBg, opacity: world.unlocked ? 1 : 0.4 }]}>
                  <Text style={styles.worldIconEmoji}>{world.icon}</Text>
                </View>
                <View style={styles.worldInfoText}>
                  <Text style={[styles.worldName, { color: colors.text, opacity: world.unlocked ? 1 : 0.6 }]}>{world.name}</Text>
                  <Text style={[styles.worldSubtitle, { color: colors.textMid, opacity: world.unlocked ? 1 : 0.5 }]}>{`${world.levels} levels \u2014 ${world.subtitle}`}</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: accent }]} />
                </View>
                <Text style={[styles.completedText, { color: colors.textLight }]}>{`${completed}/${world.levels} completed`}</Text>
              </View>

              {isCurrent && (
                <TouchableOpacity
                  style={styles.continueButton}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/game/${getNextUnplayedLevelId()}`)}
                >
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
  starPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  starCount: { fontSize: 14, fontWeight: '700' },
  scrollContent: { gap: spacing.lg, paddingBottom: 40 },
  worldCard: { borderRadius: 16, padding: spacing.lg },
  worldBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  worldBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999 },
  worldBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  worldInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  worldIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  worldIconEmoji: { fontSize: 20 },
  worldInfoText: { flex: 1 },
  worldName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  worldSubtitle: { fontSize: 14, lineHeight: 20 },
  progressContainer: { marginBottom: spacing.md },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 2 },
  completedText: { fontSize: 11 },
  continueButton: { backgroundColor: '#6C5CE7', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  lockedMessage: { fontSize: 12, textAlign: 'center', marginTop: 4 },
});
