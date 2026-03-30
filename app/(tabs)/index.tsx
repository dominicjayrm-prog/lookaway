import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LookAwayLogo } from '@/src/components/LookAwayLogo';
import { Wordmark } from '@/src/components/Wordmark';
import { useGameStore } from '@/src/store';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { LEVELS } from '@/src/data/levels';
import { typography } from '@/src/theme/typography';
import { spacing, shadows } from '@/src/theme/spacing';

export default function PlayTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { gems, lives, streakCount, totalStars, getNextUnplayedLevelId, getMemoryScore, getCompletedLevelCount } = useGameStore();
  const nextLevelId = getNextUnplayedLevelId();
  const nextLevel = LEVELS.find((l) => l.id === nextLevelId);
  const nextLevelNumber = nextLevel?.levelNumber ?? 1;
  const nextLevelTitle = nextLevel?.title ?? 'Shape Basics';
  const completedCount = getCompletedLevelCount();
  const memoryScore = getMemoryScore();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.topBar}>
        <View style={[styles.livesPill, { backgroundColor: colors.wrongSoft }]}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons key={i} name={i < lives ? 'heart' : 'heart-outline'} size={16} color={i < lives ? colors.wrong : colors.textLight} />
          ))}
        </View>
        <View style={styles.topBarRight}>
          <View style={[styles.gemPill, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="diamond" size={14} color={colors.accent} />
            <Text style={[styles.gemCount, { color: colors.accent }]}>{gems.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: colors.accent }]}
            activeOpacity={0.8}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.profileInitials}>{initials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.logoSection}>
        <LookAwayLogo size={48} />
        <View style={styles.wordmarkWrap}><Wordmark size={24} /></View>
        <Text style={[styles.tagline, { color: colors.textMid }]}>Memorise. Look away. Answer.</Text>
      </View>

      <View style={[styles.continueCard, { backgroundColor: colors.card }, shadows.card]}>
        <Text style={[styles.continueLabel, { color: colors.accent }]}>CONTINUE</Text>
        <Text style={[styles.continueTitle, { color: colors.text }]}>{`World 1 ${String.fromCharCode(8212)} Level ${nextLevelNumber}`}</Text>
        <Text style={[styles.continueSubtitle, { color: colors.textMid }]}>{nextLevelTitle}</Text>
        <TouchableOpacity style={[styles.playButton, { backgroundColor: colors.accent }]} activeOpacity={0.85} onPress={() => router.push(`/game/${nextLevelId}`)}>
          <Text style={styles.playButtonText}>Play</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.dailyCard, { backgroundColor: colors.card, borderLeftColor: colors.accent }, shadows.card]}>
        <View style={styles.dailyHeader}>
          <Text style={[styles.dailyLabel, { color: colors.accent }]}>DAILY CHALLENGE</Text>
          <Text style={[styles.dailyDate, { color: colors.textMid }]}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity style={[styles.dailyButton, { borderColor: colors.accent }]} activeOpacity={0.85} onPress={() => router.push('/game/daily')}>
          <Text style={[styles.dailyButtonText, { color: colors.accent }]}>Play today's challenge</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.statsCard, { backgroundColor: colors.card }, shadows.card]}>
        <View style={styles.statsRow}>
          <View style={styles.statColumn}>
            <Text style={[styles.statLabel, { color: colors.textMid }]}>Memory score</Text>
            <Text style={[styles.statValueMemory, { color: colors.accent }]}>{completedCount > 0 ? `${memoryScore}%` : `${String.fromCharCode(8212)}%`}</Text>
            {completedCount === 0 && <Text style={[styles.statHint, { color: colors.textLight }]}>Play your first level!</Text>}
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statColumn}>
            <Text style={[styles.statLabel, { color: colors.textMid }]}>Total stars</Text>
            <Text style={[styles.statValueStars, { color: colors.gold }]}>{totalStars}/600</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statColumn}>
            <Text style={[styles.statLabel, { color: colors.textMid }]}>Streak</Text>
            <Text style={[styles.statValueStreak, { color: colors.wrong }]}>{streakCount}</Text>
            {streakCount === 0 && <Text style={[styles.statHint, { color: colors.textLight }]}>Play daily!</Text>}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  livesPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  gemPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  gemCount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  profileButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  profileInitials: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  logoSection: { alignItems: 'center', paddingTop: spacing.xxxl, paddingBottom: spacing.xxl },
  wordmarkWrap: { marginTop: spacing.md },
  tagline: { fontSize: 14, marginTop: spacing.sm },
  continueCard: { borderRadius: 16, padding: spacing.lg, marginBottom: spacing.lg },
  continueLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginBottom: spacing.sm },
  continueTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  continueSubtitle: { fontSize: 14, marginBottom: spacing.lg },
  playButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  playButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  dailyCard: { borderRadius: 16, padding: spacing.lg, borderLeftWidth: 3, marginBottom: spacing.lg },
  dailyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  dailyLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5 },
  dailyDate: { fontSize: typography.sizes.sm },
  dailyButton: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  dailyButtonText: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  statsCard: { borderRadius: 16, padding: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  statColumn: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, alignSelf: 'stretch' },
  statLabel: { fontSize: 10, marginBottom: spacing.xs },
  statValueMemory: { fontSize: 20, fontWeight: '700' },
  statValueStars: { fontSize: 20, fontWeight: '700' },
  statValueStreak: { fontSize: 20, fontWeight: '700' },
  statHint: { fontSize: 10, marginTop: spacing.xs, textAlign: 'center' },
});
