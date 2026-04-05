import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabTransition } from '@/src/components/TabTransition';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { CAMPAIGNS, CAMPAIGN_ORDER, TOTAL_MAX_STARS } from '@/src/data/campaigns';
import { spacing } from '@/src/theme/spacing';
import Svg, { Rect, Path, Polygon, Circle } from 'react-native-svg';
import { supabase } from '@/src/lib/supabase';

const WORLD_COLORS: Record<number, string> = { 1: '#00B894', 2: '#0984E3', 3: '#6C5CE7', 4: '#F9A825', 5: '#FF6B6B', 6: '#1A1A18' };

function StarIcon({ size = 14, color = '#D4A012' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100"><Polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={color} /></Svg>;
}

function LockIcon({ size = 16, color = '#B2BEC3' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={5} y={11} width={14} height={11} rx={2} fill={color} /><Path d="M8,11 V8 A4,4 0 0,1 16,8 V11" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
}

export default function JourneyTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { totalStars, levelProgress } = useGameStore();
  const [activeCampaign, setActiveCampaign] = useState('classic');
  const [sideCampaignProgress, setSideCampaignProgress] = useState<Record<string, { stars: number; best_score: number }>>({});

  const campaign = CAMPAIGNS[activeCampaign];

  // Load side campaign progress from Supabase
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        const { data } = await supabase
          .from('side_campaign_progress')
          .select('level_id, stars, best_score')
          .eq('user_id', session.user.id);
        if (data) {
          const progress: Record<string, { stars: number; best_score: number }> = {};
          data.forEach(r => { progress[r.level_id] = { stars: r.stars, best_score: r.best_score }; });
          setSideCampaignProgress(progress);
        }
      } catch {}
    })();
  }, []);

  // Check how many classic worlds are completed (for unlock logic)
  function getClassicWorldsCompleted(): number {
    const worldLevels = [20, 30, 35, 35, 40, 40];
    let completed = 0;
    for (let w = 0; w < 6; w++) {
      let allDone = true;
      for (let l = 1; l <= worldLevels[w]; l++) {
        if (!levelProgress[`w${w + 1}-l${l}`]) { allDone = false; break; }
      }
      if (allDone) completed = w + 1;
      else break;
    }
    return completed;
  }

  const classicWorldsCompleted = getClassicWorldsCompleted();

  function isCampaignUnlocked(campaignId: string): boolean {
    const c = CAMPAIGNS[campaignId];
    return classicWorldsCompleted >= c.unlockAfterWorld;
  }

  // Per-world completion for classic campaign
  function getWorldCompleted(worldId: number, totalLevels: number): number {
    let count = 0;
    for (let i = 1; i <= totalLevels; i++) {
      if (levelProgress[`w${worldId}-l${i}`]) count++;
    }
    return count;
  }

  function isWorldUnlocked(worldId: number): boolean {
    if (worldId === 1) return true;
    const prevWorldLevels = campaign.levelsPerWorld[worldId - 2] ?? 0;
    return getWorldCompleted(worldId - 1, prevWorldLevels) >= prevWorldLevels;
  }

  // Side campaign helpers
  const SIDE_PREFIX: Record<string, string> = { speed_recall: 'sr', snap_match: 'sm', sequence: 'seq', counting_blitz: 'cb', colour_chain: 'cc' };

  function getSideLevelId(campaignId: string, worldNum: number, levelNum: number): string {
    return `${SIDE_PREFIX[campaignId] ?? campaignId}_w${worldNum}_l${levelNum}`;
  }

  function getSideWorldCompleted(campaignId: string, worldNum: number, totalLevels: number): number {
    let count = 0;
    for (let i = 1; i <= totalLevels; i++) {
      if (sideCampaignProgress[getSideLevelId(campaignId, worldNum, i)]) count++;
    }
    return count;
  }

  function isSideWorldUnlocked(campaignId: string, worldNum: number): boolean {
    if (worldNum === 1) return true;
    const c = CAMPAIGNS[campaignId];
    const prevLevels = c.levelsPerWorld[worldNum - 2] ?? 0;
    return getSideWorldCompleted(campaignId, worldNum - 1, prevLevels) >= prevLevels;
  }

  return (
    <TabTransition>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Journey</Text>
        <View style={[styles.starPill, { backgroundColor: colors.goldSoft }]}>
          <StarIcon size={14} color={totalStars > 0 ? '#D4A012' : '#B2BEC3'} />
          <Text style={[styles.starCount, { color: totalStars > 0 ? colors.gold : colors.textLight }]}>{totalStars}/{TOTAL_MAX_STARS}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Campaign selector */}
        <Text style={[styles.sectionLabel, { color: colors.textLight }]}>CAMPAIGNS</Text>
        <View style={styles.campaignGrid}>
          {CAMPAIGN_ORDER.map(id => {
            const c = CAMPAIGNS[id];
            const isActive = activeCampaign === id;
            const isLocked = !isCampaignUnlocked(id);
            return (
              <Pressable
                key={id}
                style={[styles.campaignPill, {
                  backgroundColor: isActive ? c.color + '12' : isLocked ? colors.surface : colors.card,
                  borderWidth: isActive ? 1.5 : 1,
                  borderColor: isActive ? c.color + '40' : isLocked ? 'transparent' : 'rgba(0,0,0,0.04)',
                  opacity: isLocked ? 0.5 : 1,
                }]}
                onPress={() => !isLocked && setActiveCampaign(id)}
                disabled={isLocked}
              >
                <View style={[styles.campaignIconBg, { backgroundColor: isLocked ? 'rgba(0,0,0,0.04)' : c.color + '15' }]}>
                  {isLocked ? <LockIcon size={16} /> : (
                    <Text style={{ fontSize: 14, fontWeight: '800', color: c.color }}>{c.name[0]}</Text>
                  )}
                </View>
                <Text style={[styles.campaignName, { color: isLocked ? colors.textLight : isActive ? c.color : colors.text }]} numberOfLines={1}>{c.name}</Text>
                {isLocked ? (
                  <Text style={[styles.campaignMeta, { color: colors.textLight }]}>World {c.unlockAfterWorld}</Text>
                ) : (
                  <Text style={[styles.campaignMeta, { color: colors.textMid }]}>{c.totalLevels} levels</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Active campaign description */}
        <View style={[styles.descCard, { backgroundColor: campaign.color + '08', borderColor: campaign.color + '15' }]}>
          <Text style={[styles.descTitle, { color: campaign.color }]}>{campaign.name}</Text>
          <Text style={[styles.descText, { color: colors.textMid }]}>{campaign.description}</Text>
          <Text style={[styles.descMeta, { color: colors.textLight }]}>{campaign.worldCount} world{campaign.worldCount !== 1 ? 's' : ''} · {campaign.totalLevels} levels</Text>
        </View>

        {/* Worlds for selected campaign */}
        <Text style={[styles.sectionLabel, { color: colors.textLight }]}>{campaign.name.toUpperCase()} WORLDS</Text>

        {activeCampaign === 'classic' ? (
          // Classic worlds
          campaign.worldNames.map((name, i) => {
            const worldId = i + 1;
            const worldLevels = campaign.levelsPerWorld[i];
            const completed = getWorldCompleted(worldId, worldLevels);
            const unlocked = isWorldUnlocked(worldId);
            const progress = completed / worldLevels;
            const accent = WORLD_COLORS[worldId] ?? campaign.color;
            const isCurrent = unlocked && completed < worldLevels;

            return (
              <Pressable
                key={worldId}
                style={[styles.worldCard, { backgroundColor: colors.card, borderWidth: isCurrent ? 2 : 0, borderColor: isCurrent ? accent : 'transparent' }]}
                onPress={() => unlocked && router.push(`/world/${worldId}`)}
                disabled={!unlocked}
              >
                <View style={styles.worldBadgeRow}>
                  <View style={[styles.worldBadge, { backgroundColor: accent + '14' }]}>
                    <Text style={[styles.worldBadgeText, { color: accent, opacity: unlocked ? 1 : 0.5 }]}>WORLD {worldId}</Text>
                  </View>
                  {!unlocked && <LockIcon size={16} color={colors.textLight} />}
                </View>
                <Text style={[styles.worldName, { color: colors.text, opacity: unlocked ? 1 : 0.6 }]}>{name}</Text>
                <Text style={[styles.worldSubtitle, { color: colors.textMid, opacity: unlocked ? 1 : 0.5 }]}>{worldLevels} levels</Text>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: accent }]} />
                  </View>
                  <Text style={[styles.completedText, { color: colors.textLight }]}>{completed}/{worldLevels}</Text>
                </View>
                {unlocked && (
                  <Pressable style={[styles.continueButton, { backgroundColor: accent }]} onPress={() => router.push(`/world/${worldId}`)}>
                    <Text style={styles.continueButtonText}>{completed > 0 ? 'Continue' : 'Start'}</Text>
                  </Pressable>
                )}
                {!unlocked && <Text style={[styles.lockedMessage, { color: colors.textMid }]}>Complete World {worldId - 1} to unlock</Text>}
              </Pressable>
            );
          })
        ) : (
          // Side campaign worlds — real progress
          campaign.worldNames.map((name, i) => {
            const worldNum = i + 1;
            const worldLevels = campaign.levelsPerWorld[i];
            const completed = getSideWorldCompleted(activeCampaign, worldNum, worldLevels);
            const unlocked = isSideWorldUnlocked(activeCampaign, worldNum);
            const progress = completed / worldLevels;
            const accent = campaign.color;
            const isCurrent = unlocked && completed < worldLevels;

            return (
              <Pressable
                key={i}
                style={[styles.worldCard, { backgroundColor: colors.card, borderWidth: isCurrent ? 2 : 0, borderColor: isCurrent ? accent : 'transparent' }]}
                onPress={() => {
                  if (!unlocked) return;
                  router.push({
                    pathname: '/world/side-world',
                    params: { mode: activeCampaign, worldNumber: String(worldNum), worldName: name },
                  });
                }}
                disabled={!unlocked}
              >
                <View style={styles.worldBadgeRow}>
                  <View style={[styles.worldBadge, { backgroundColor: accent + '14' }]}>
                    <Text style={[styles.worldBadgeText, { color: accent, opacity: unlocked ? 1 : 0.5 }]}>WORLD {worldNum}</Text>
                  </View>
                  {!unlocked && <LockIcon size={16} color={colors.textLight} />}
                </View>
                <Text style={[styles.worldName, { color: colors.text, opacity: unlocked ? 1 : 0.6 }]}>{name}</Text>
                <Text style={[styles.worldSubtitle, { color: colors.textMid, opacity: unlocked ? 1 : 0.5 }]}>{worldLevels} levels</Text>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: accent }]} />
                  </View>
                  <Text style={[styles.completedText, { color: colors.textLight }]}>{completed}/{worldLevels}</Text>
                </View>
                {unlocked && (
                  <Pressable
                    style={[styles.continueButton, { backgroundColor: accent }]}
                    onPress={() => {
                      router.push({
                        pathname: '/world/side-world',
                        params: { mode: activeCampaign, worldNumber: String(worldNum), worldName: name },
                      });
                    }}
                  >
                    <Text style={styles.continueButtonText}>{completed > 0 ? 'Continue' : 'Start'}</Text>
                  </Pressable>
                )}
                {!unlocked && <Text style={[styles.lockedMessage, { color: colors.textMid }]}>Complete World {worldNum - 1} to unlock</Text>}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
    </TabTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  starPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 2 },
  starCount: { fontSize: 14, fontWeight: '700' },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 16, marginBottom: 8 },

  // Campaign selector
  campaignGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  campaignPill: { width: '31%', flexGrow: 1, padding: 12, borderRadius: 16, alignItems: 'center' },
  campaignIconBg: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  campaignName: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  campaignMeta: { fontSize: 9, marginTop: 2 },

  // Campaign description
  descCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 8 },
  descTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  descText: { fontSize: 12, marginBottom: 4 },
  descMeta: { fontSize: 10, fontWeight: '600' },

  // World cards
  worldCard: { borderRadius: 20, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  worldBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  worldBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  worldBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  worldName: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  worldSubtitle: { fontSize: 12, marginBottom: 10 },
  progressContainer: { marginBottom: 12 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 2 },
  completedText: { fontSize: 11 },
  continueButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  continueButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  lockedMessage: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  comingSoonBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start', marginTop: 8 },
  comingSoonText: { fontSize: 11, fontWeight: '600' },
});
