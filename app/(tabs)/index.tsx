import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LookAwayLogo } from '@/src/components/LookAwayLogo';
import { Wordmark } from '@/src/components/Wordmark';
import { useGameStore } from '@/src/store';
import { LEVELS } from '@/src/data/levels';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { spacing, borderRadius, shadows } from '@/src/theme/spacing';

export default function PlayTab() {
  const router = useRouter();
  const { gems, lives, streakCount, totalStars, getNextUnplayedLevelId, getMemoryScore, getCompletedLevelCount } = useGameStore();
  const nextLevelId = getNextUnplayedLevelId();
  const nextLevel = LEVELS.find((l) => l.id === nextLevelId);
  const nextLevelNumber = nextLevel?.levelNumber ?? 1;
  const nextLevelTitle = nextLevel?.title ?? 'Shape Basics';
  const completedCount = getCompletedLevelCount();
  const memoryScore = getMemoryScore();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <View style={styles.livesPill}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Ionicons key={i} name={i < lives ? 'heart' : 'heart-outline'} size={16} color={i < lives ? colors.wrong : colors.textLight} />
          ))}
        </View>
        <View style={styles.gemPill}>
          <Ionicons name="diamond" size={14} color={colors.accent} />
          <Text style={styles.gemCount}>{gems.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.logoSection}>
        <LookAwayLogo size={48} />
        <View style={styles.wordmarkWrap}><Wordmark size={24} /></View>
        <Text style={styles.tagline}>Memorise. Look away. Answer.</Text>
      </View>

      <View style={styles.continueCard}>
        <Text style={styles.continueLabel}>CONTINUE</Text>
        <Text style={styles.continueTitle}>{`World 1 ${String.fromCharCode(8212)} Level ${nextLevelNumber}`}</Text>
        <Text style={styles.continueSubtitle}>{nextLevelTitle}</Text>
        <TouchableOpacity style={styles.playButton} activeOpacity={0.85} onPress={() => router.push(`/game/${nextLevelId}`)}>
          <Text style={styles.playButtonText}>Play</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dailyCard}>
        <View style={styles.dailyHeader}>
          <Text style={styles.dailyLabel}>DAILY CHALLENGE</Text>
          <Text style={styles.dailyDate}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity style={styles.dailyButton} activeOpacity={0.85} onPress={() => router.push('/game/daily')}>
          <Text style={styles.dailyButtonText}>Play today's challenge</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>Memory score</Text>
            <Text style={styles.statValueMemory}>{completedCount > 0 ? `${memoryScore}%` : `${String.fromCharCode(8212)}%`}</Text>
            {completedCount === 0 && <Text style={styles.statHint}>Play your first level!</Text>}
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>Total stars</Text>
            <Text style={styles.statValueStars}>{totalStars}/600</Text>
            {totalStars === 0 && <Text style={styles.statHint}>{''}</Text>}
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValueStreak}>{streakCount}</Text>
            {streakCount === 0 && <Text style={styles.statHint}>Play daily!</Text>}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  livesPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,107,107,0.08)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  gemPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(108,92,231,0.08)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  gemCount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: colors.accent },
  logoSection: { alignItems: 'center', paddingTop: spacing.xxxl, paddingBottom: spacing.xxl },
  wordmarkWrap: { marginTop: spacing.md },
  tagline: { fontSize: 14, color: '#636E72', marginTop: spacing.sm },
  continueCard: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.card },
  continueLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: '#6C5CE7', marginBottom: spacing.sm },
  continueTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  continueSubtitle: { fontSize: 14, color: '#636E72', marginBottom: spacing.lg },
  playButton: { backgroundColor: '#6C5CE7', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  playButtonText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  dailyCard: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, borderLeftWidth: 3, borderLeftColor: '#6C5CE7', marginBottom: spacing.lg, ...shadows.card },
  dailyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  dailyLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: '#6C5CE7' },
  dailyDate: { fontSize: typography.sizes.sm, color: colors.textMid },
  dailyButton: { borderWidth: 1.5, borderColor: '#6C5CE7', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  dailyButtonText: { color: '#6C5CE7', fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  statsCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, ...shadows.card },
  statsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  statColumn: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.06)', alignSelf: 'stretch' },
  statLabel: { fontSize: 10, color: '#636E72', marginBottom: spacing.xs },
  statValueMemory: { fontSize: 20, fontWeight: '700', color: '#6C5CE7' },
  statValueStars: { fontSize: 20, fontWeight: '700', color: '#D4A012' },
  statValueStreak: { fontSize: 20, fontWeight: '700', color: '#FF6B6B' },
  statHint: { fontSize: 10, color: '#B2BEC3', marginTop: spacing.xs, textAlign: 'center' },
});
