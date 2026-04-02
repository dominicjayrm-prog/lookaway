import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabTransition } from '@/src/components/TabTransition';
import { useGameStore } from '@/src/store';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useAuth } from '@/src/providers/AuthProvider';
import { fetchLevelById } from '@/src/data/levels';
import Svg, { Path, Circle, Polygon } from 'react-native-svg';

const WORLD_COLORS = ['#00B894','#0984E3','#6C5CE7','#D4A012','#FF6B6B','#1A1A18'];
const WORLD_NAMES = ['Shapes','Colour','Numbers','Motion','Photo','Master'];
const WORLD_LEVEL_COUNTS = [20, 30, 35, 35, 40, 40];
const EMDASH = String.fromCharCode(8212);

function MiniEyeIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 36 36">
      <Path d="M2 18Q18 6 34 18Q18 30 2 18Z" fill="rgba(255,255,255,0.3)" stroke="white" strokeWidth={2} />
      <Circle cx={18} cy={18} r={5} fill="white" />
      <Circle cx={18} cy={18} r={2.5} fill="rgba(108,92,231,0.5)" />
    </Svg>
  );
}

function StarIcon({ size = 14, color = '#D4A012' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100"><Polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={color} /></Svg>;
}


export default function PlayTab() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { gems, lives, streakCount, totalStars, getNextUnplayedLevelId, getMemoryScore, getCompletedLevelCount, levelProgress } = useGameStore();
  const nextLevelId = getNextUnplayedLevelId(); // Re-computes when levelProgress changes

  // Parse world/level from ID format "w1-l3"
  const idMatch = nextLevelId.match(/^w(\d+)-l(\d+)$/);
  const currentWorldId = idMatch ? parseInt(idMatch[1], 10) : 1;
  const nextLevelNumber = idMatch ? parseInt(idMatch[2], 10) : 1;
  const currentWorldLevels = WORLD_LEVEL_COUNTS[(currentWorldId - 1)] ?? 20;
  const completedCount = getCompletedLevelCount();
  const worldProgress = Math.max(0, nextLevelNumber - 1) / currentWorldLevels;
  const memoryScore = getMemoryScore();

  // Fetch level title from Supabase
  const [nextLevelTitle, setNextLevelTitle] = useState('Loading...');
  useEffect(() => {
    fetchLevelById(nextLevelId).then(l => setNextLevelTitle(l?.title ?? `Level ${nextLevelNumber}`));
  }, [nextLevelId, nextLevelNumber]);

  // Contextual hero subtitle
  const heroSubtitle = (() => {
    const remaining = currentWorldLevels - (nextLevelNumber - 1);
    if (nextLevelNumber === 1) return `Welcome to World ${currentWorldId}`;
    if (remaining <= 3) return `${remaining} level${remaining !== 1 ? 's' : ''} to finish World ${currentWorldId}!`;
    if (streakCount >= 3) return `${streakCount}-day streak! Keep it going`;
    const subs = ['Keep pushing forward', 'Your memory is getting sharper', "Let's test that memory", 'Ready for the next challenge?'];
    return subs[nextLevelNumber % subs.length];
  })();

  // Best level (highest 3-star level)
  const bestLevel = (() => {
    let best = 0;
    for (const [id, p] of Object.entries(levelProgress)) {
      if (p.stars === 3) {
        const m = id.match(/l(\d+)$/);
        if (m) best = Math.max(best, parseInt(m[1], 10));
      }
    }
    return best;
  })();
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Player';
  const initials = displayName.slice(0, 2).toUpperCase();
  let profilePic: string | null = null;
  try { profilePic = typeof window !== 'undefined' ? localStorage.getItem('lookaway-profile-pic') : null; } catch {}

  return (
    <TabTransition>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={[styles.livesPill, { backgroundColor: colors.wrongSoft }]}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons key={i} name={i < lives ? 'heart' : 'heart-outline'} size={15} color={i < lives ? colors.wrong : colors.textLight} />
            ))}
          </View>
          <View style={styles.topBarRight}>
            <View style={[styles.gemPill, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="diamond" size={13} color={colors.accent} />
              <Text style={[styles.gemCount, { color: colors.accent }]}>{gems.toLocaleString()}</Text>
            </View>
            <Pressable
              style={[styles.profileButton, { backgroundColor: profilePic ? 'transparent' : colors.accent }]}
                           onPress={() => router.push('/profile')}
            >
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.profileImage} />
              ) : (
                <Text style={styles.profileInitials}>{initials}</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Hero card — purple gradient */}
        <View style={styles.heroCard}>
          {/* Logo row */}
          <View style={styles.heroLogoRow}>
            <View style={styles.heroLogoBg}><MiniEyeIcon /></View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.heroLogoText}>Look<Text style={{ fontWeight: '800' }}>Away</Text></Text>
              <Text style={styles.heroLogoSub}>Memorise. Look away. Answer.</Text>
            </View>
          </View>

          {/* Level info */}
          <Text style={styles.heroContinueLabel}>CONTINUE</Text>
          <Text style={styles.heroLevelTitle}>{`World ${currentWorldId} ${EMDASH} Level ${nextLevelNumber}`}</Text>
          <Text style={styles.heroLevelSubtitle}>{heroSubtitle}</Text>

          {/* Progress bar */}
          <View style={styles.heroProgressRow}>
            <View style={styles.heroProgressTrack}>
              <View style={[styles.heroProgressFill, { width: `${Math.round(worldProgress * 100)}%` }]} />
            </View>
            <Text style={styles.heroProgressText}>{nextLevelNumber - 1}/{currentWorldLevels}</Text>
          </View>

          {/* Play button */}
          <Pressable style={styles.heroPlayButton} onPress={() => router.push(`/game/${nextLevelId}`)}>
            <Text style={styles.heroPlayText}>Play</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.accentSoft }]}>
              <Svg width={16} height={12} viewBox="0 0 36 24"><Path d="M2 12Q18 2 34 12Q18 22 2 12Z" fill="none" stroke={colors.accent} strokeWidth={1.8} /><Circle cx={18} cy={12} r={4} fill={colors.accent} /><Circle cx={18} cy={12} r={2} fill="white" /></Svg>
            </View>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>BRAIN</Text>
            <Text style={[styles.statValue, { color: completedCount > 0 ? colors.accent : colors.textLight }]}>
              {completedCount > 0 ? `${memoryScore}%` : EMDASH}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.goldSoft }]}>
              <StarIcon size={13} color={colors.gold} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>STARS</Text>
            <Text style={[styles.statValue, { color: totalStars > 0 ? colors.gold : colors.textLight }]}>{totalStars}/600</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.wrongSoft }]}>
              <Text style={{ fontSize: 12 }}>{'\u{1F525}'}</Text>
            </View>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>STREAK</Text>
            <Text style={[styles.statValue, { color: streakCount > 0 ? colors.wrong : colors.textLight }]}>{streakCount}</Text>
          </View>
        </View>

        {/* Your Journey */}
        <View style={[styles.journeyCard, { backgroundColor: colors.card }]}>
          <View style={styles.journeyHeader}>
            <Text style={[styles.journeyTitle, { color: colors.text }]}>Your Journey</Text>
            <Pressable onPress={() => router.push('/(tabs)/journey')}>
              <Text style={{ fontSize: 12, color: colors.accent, fontWeight: '600' }}>See all {'>'}</Text>
            </Pressable>
          </View>
          <View style={styles.journeyPills}>
            {WORLD_NAMES.map((name, i) => {
              const wc = WORLD_COLORS[i];
              const isCurrentWorld = i + 1 === currentWorldId;
              const isCompleted = i + 1 < currentWorldId;
              const isLocked = i + 1 > currentWorldId;
              return (
                <View key={i} style={[styles.worldPill, {
                  backgroundColor: isCurrentWorld || isCompleted ? wc + '12' : wc + '06',
                  borderWidth: isCurrentWorld ? 1.5 : isCompleted ? 1 : 1,
                  borderColor: isCurrentWorld ? wc + '35' : isCompleted ? wc + '20' : wc + '10',
                  opacity: isLocked ? 0.7 : 1,
                }]}>
                  <Text style={[styles.worldPillNum, { color: isCurrentWorld || isCompleted ? wc : wc + '80' }]}>{i + 1}</Text>
                  <Text style={[styles.worldPillName, { color: isCurrentWorld || isCompleted ? wc : wc + '60' }]}>{name}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Memory Insights */}
        <View style={[styles.insightsCard, { backgroundColor: colors.card }]}>
          <View style={styles.insightsHeader}>
            <Svg width={16} height={12} viewBox="0 0 36 24"><Path d="M2 12Q18 2 34 12Q18 22 2 12Z" fill="none" stroke={colors.accent} strokeWidth={1.8} /><Circle cx={18} cy={12} r={4} fill={colors.accent} /><Circle cx={18} cy={12} r={2} fill="white" /></Svg>
            <Text style={[styles.insightsTitle, { color: colors.text }]}>Memory Insights</Text>
          </View>
          {completedCount === 0 ? (
            <Text style={[styles.insightsEmpty, { color: colors.textMid }]}>Play your first level to start tracking your memory progress!</Text>
          ) : (
            <View style={styles.insightsGrid}>
              <View style={[styles.insightMini, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.insightLabel, { color: colors.textLight }]}>BEST LEVEL</Text>
                <Text style={[styles.insightValue, { color: colors.accent }]}>{bestLevel > 0 ? `Level ${bestLevel}` : EMDASH}</Text>
              </View>
              <View style={[styles.insightMini, { backgroundColor: colors.correctSoft }]}>
                <Text style={[styles.insightLabel, { color: colors.textLight }]}>ACCURACY</Text>
                <Text style={[styles.insightValue, { color: colors.correct }]}>{memoryScore}%</Text>
              </View>
              <View style={[styles.insightMini, { backgroundColor: colors.blueSoft }]}>
                <Text style={[styles.insightLabel, { color: colors.textLight }]}>LEVELS PLAYED</Text>
                <Text style={[styles.insightValue, { color: colors.blue }]}>{completedCount}</Text>
              </View>
              <View style={[styles.insightMini, { backgroundColor: colors.goldSoft }]}>
                <Text style={[styles.insightLabel, { color: colors.textLight }]}>TOTAL STARS</Text>
                <Text style={[styles.insightValue, { color: colors.gold }]}>{totalStars}</Text>
              </View>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
    </TabTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livesPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  gemPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  gemCount: { fontSize: 12, fontWeight: '700' },
  profileButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileImage: { width: 32, height: 32, borderRadius: 16 },
  profileInitials: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },

  // Hero card
  heroCard: { marginHorizontal: 16, marginTop: 8, borderRadius: 24, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, backgroundColor: '#6C5CE7', shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 32, elevation: 6,
    // Gradient workaround: use solid purple (RN doesn't support CSS gradients natively)
  },
  heroLogoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  heroLogoBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroLogoText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  heroLogoSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  heroContinueLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  heroLevelTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  heroLevelSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16 },
  heroProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  heroProgressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 2, backgroundColor: '#FFFFFF' },
  heroProgressText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  heroPlayButton: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
  heroPlayText: { fontSize: 17, fontWeight: '700', color: '#6C5CE7' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 14 },
  statCard: { flex: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  statIconBg: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: '800' },

  // Journey
  journeyCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  journeyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  journeyTitle: { fontSize: 13, fontWeight: '700' },
  journeyPills: { flexDirection: 'row', gap: 6 },
  worldPill: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  worldPillNum: { fontSize: 12, fontWeight: '700' },
  worldPillName: { fontSize: 8, fontWeight: '600', marginTop: 1 },

  // Memory Insights
  insightsCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  insightsTitle: { fontSize: 13, fontWeight: '700' },
  insightsEmpty: { fontSize: 13, textAlign: 'center', lineHeight: 18, paddingVertical: 8 },
  insightsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  insightMini: { width: '47%', borderRadius: 14, padding: 14 },
  insightLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  insightValue: { fontSize: 18, fontWeight: '800' },
});
