import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { supabase } from '@/src/lib/supabase';
import { t } from '@/src/i18n';
import { TabTransition } from '@/src/components/TabTransition';
import { CAMPAIGNS } from '@/src/data/campaigns';
import {
  UNIFIED_LADDER,
  WORLD_THEMES,
  WORLD_THEME_ORDER,
  getUnifiedLevel,
  isChapterStart,
  isWorldTransition,
  type UnifiedLevel,
  type ModeId,
  type WorldTheme,
} from '@/src/data/unifiedJourney';
import { LevelNode, type NodeState } from './LevelNode';
import { ChapterBadge } from './ChapterBadge';
import { PathConnector } from './PathConnector';
import { ModeLibrary } from './ModeLibrary';

const ROW_HEIGHT = 86; // Vertical space per level in the path.
const PATH_TOP_PADDING = 32;
const PATH_SIDE_MARGIN = 60;

const SIDE_PREFIX: Record<string, string> = {
  speed_recall: 'sr',
  snap_match: 'sm',
  sequence: 'seq',
  counting_blitz: 'cb',
  colour_chain: 'cc',
};

function StarSvg({ size = 14, color = '#D4A012' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon
        points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35"
        fill={color}
      />
    </Svg>
  );
}

function GemSvg({ size = 14, color = '#6C5CE7' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points="50,10 90,40 70,90 30,90 10,40" fill={color} />
    </Svg>
  );
}

/** Compute sine-wave x offset per position, within a fixed-width container.
 *  Creates a gentle snake path without hard rows / columns. */
function pathXForPosition(position: number, containerWidth: number): number {
  const centerX = containerWidth / 2;
  const amplitude = Math.min(containerWidth / 2 - PATH_SIDE_MARGIN, 110);
  // Period controls how many levels form one full wave. Longer period =
  // gentler S-curve. 7 keeps the motion readable without looking like a
  // grid.
  const wave = Math.sin((position - 1) * 0.88);
  return centerX + wave * amplitude;
}

function yForPosition(position: number): number {
  return PATH_TOP_PADDING + (position - 1) * ROW_HEIGHT;
}

export function UnifiedJourneyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const didScrollToCurrent = useRef(false);

  const {
    totalStars,
    gems,
    levelProgress,
    unifiedPosition,
    setLastPlayed,
  } = useGameStore();

  const [sideCampaignProgress, setSideCampaignProgress] = useState<
    Record<string, { stars: number; best_score: number }>
  >({});

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user?.id) return;
          const { data } = await supabase
            .from('side_campaign_progress')
            .select('level_id, stars, best_score')
            .eq('user_id', session.user.id);
          if (data) {
            const p: Record<string, { stars: number; best_score: number }> = {};
            data.forEach((r) => {
              p[r.level_id] = { stars: r.stars, best_score: r.best_score };
            });
            setSideCampaignProgress(p);
          }
        } catch {}
      })();
    }, []),
  );

  const pathWidth = screenWidth;
  const pathHeight = PATH_TOP_PADDING + UNIFIED_LADDER.length * ROW_HEIGHT + 40;

  // Lookup helpers for stars per level.
  const getStars = useCallback(
    (levelId: string, mode: ModeId) => {
      if (mode === 'classic') {
        return levelProgress[levelId]?.stars ?? 0;
      }
      return sideCampaignProgress[levelId]?.stars ?? 0;
    },
    [levelProgress, sideCampaignProgress],
  );

  // Derive current level info for hero card.
  const currentLevel = getUnifiedLevel(unifiedPosition);
  const currentTheme = WORLD_THEMES[currentLevel?.worldTheme ?? 'emerald_grove'];
  const currentCampaign = currentLevel ? CAMPAIGNS[currentLevel.mode] : null;

  // Auto-scroll to the current level on first layout.
  useEffect(() => {
    if (didScrollToCurrent.current) return;
    const y = yForPosition(unifiedPosition);
    // Centre the node in the viewport (rough — subtracts ~1/3 of screen).
    const target = Math.max(0, y - 200);
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: target, animated: false });
      didScrollToCurrent.current = true;
    }, 120);
    return () => clearTimeout(timer);
  }, [unifiedPosition]);

  const launchLevel = (level: UnifiedLevel) => {
    const store = useGameStore.getState();
    store.checkLifeRegen();
    if (store.lives <= 0) {
      // Out of lives; parent may wrap this in a modal in future.
      return;
    }
    setLastPlayed(level.mode, level.levelId);
    if (level.mode === 'classic') {
      router.push(`/game/${level.levelId}`);
      return;
    }
    const match = level.levelId.match(/^[a-z]+_w(\d+)_l(\d+)$/);
    const worldNumber = match?.[1] ?? '1';
    const levelNumber = match?.[2] ?? '1';
    const campaign = CAMPAIGNS[level.mode];
    const worldName = campaign?.worldNames[Number(worldNumber) - 1] ?? '';
    router.push({
      pathname: '/game/side-campaign',
      params: {
        levelId: level.levelId,
        mode: level.mode,
        worldNumber,
        levelNumber,
        worldName,
      },
    });
  };

  // Figure out which world we're currently in + progress through it.
  const worldProgress = useMemo(() => {
    const [start, end] = currentTheme.range;
    const inWorld = Math.min(unifiedPosition, end) - start + 1;
    const totalInWorld = end - start + 1;
    return {
      inWorld: Math.max(0, inWorld),
      totalInWorld,
      pct: Math.round((Math.max(0, inWorld) / totalInWorld) * 100),
    };
  }, [currentTheme, unifiedPosition]);

  const totalPct = Math.round((unifiedPosition / UNIFIED_LADDER.length) * 100);

  return (
    <TabTransition>
      <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.scrollContent}
        >
          {/* Header */}
          <View style={st.header}>
            <View style={st.headerLeft}>
              <Text style={[st.eyebrow, { color: currentTheme.color }]}>
                {currentTheme.name.toUpperCase()} · WORLD {currentTheme.worldNumber} OF {WORLD_THEME_ORDER.length}
              </Text>
              <Text style={[st.title, { color: colors.text }]}>Brain Journey</Text>
            </View>
            <View style={st.headerRight}>
              <View style={[st.pill, { backgroundColor: colors.goldSoft }]}>
                <StarSvg size={12} color={totalStars > 0 ? '#D4A012' : '#B2BEC3'} />
                <Text style={[st.pillText, { color: colors.gold }]}>{totalStars}</Text>
              </View>
              <View style={[st.pill, { backgroundColor: colors.accentSoft }]}>
                <GemSvg size={12} color={colors.accent} />
                <Text style={[st.pillText, { color: colors.accent }]}>{gems}</Text>
              </View>
            </View>
          </View>

          {/* World title + progress bar */}
          <View style={st.worldBar}>
            <Text style={[st.worldLevelLabel, { color: currentTheme.color }]}>
              Level {unifiedPosition}
              <Text style={[st.worldOf, { color: colors.textMid }]}>
                {' '}of {UNIFIED_LADDER.length}
              </Text>
            </Text>
            <Text style={[st.worldPct, { color: colors.textMid }]}>{totalPct}% complete</Text>
          </View>
          <View style={[st.worldTrack, { backgroundColor: colors.surface }]}>
            <View
              style={[
                st.worldFill,
                {
                  backgroundColor: currentTheme.color,
                  width: `${Math.max(2, totalPct)}%`,
                },
              ]}
            />
          </View>

          {/* Continue hero card */}
          {currentLevel && currentCampaign && (
            <Pressable
              onPress={() => launchLevel(currentLevel)}
              style={({ pressed }) => [
                st.continueCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Continue level ${unifiedPosition}`}
            >
              <View style={[st.continueAccent, { backgroundColor: currentCampaign.color }]} />
              <View style={st.continueBody}>
                <Text style={[st.continueLabel, { color: colors.textMid }]}>
                  LEVEL {unifiedPosition} · CONTINUE
                </Text>
                <Text style={[st.continueMode, { color: colors.text }]}>
                  {currentCampaign.name}
                  <Text style={[st.continueTagline, { color: colors.textMid }]}>
                    {' · '}Tap to play
                  </Text>
                </Text>
              </View>
              <View style={[st.playChip, { backgroundColor: currentCampaign.color }]}>
                <Text style={st.playChipText}>PLAY</Text>
              </View>
            </Pressable>
          )}

          {/* The path — vertically scrolling snake */}
          <View style={[st.pathContainer, { height: pathHeight, width: pathWidth }]}>
            {/* Draw connectors first so nodes render above them. */}
            {UNIFIED_LADDER.slice(0, UNIFIED_LADDER.length - 1).map((level) => {
              const next = UNIFIED_LADDER[level.position];
              if (!next) return null;
              const x1 = pathXForPosition(level.position, pathWidth);
              const y1 = yForPosition(level.position);
              const x2 = pathXForPosition(next.position, pathWidth);
              const y2 = yForPosition(next.position);
              const completed = next.position <= unifiedPosition;
              const color = completed ? WORLD_THEMES[next.worldTheme].color : colors.borderStrong;
              return (
                <PathConnector
                  key={`c-${level.position}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  color={color}
                  opacity={completed ? 0.65 : 0.35}
                  dashed={!completed}
                  width={completed ? 4 : 3}
                />
              );
            })}

            {/* Level nodes + chapter badges */}
            {UNIFIED_LADDER.map((level) => {
              const x = pathXForPosition(level.position, pathWidth);
              const y = yForPosition(level.position);
              const stars = getStars(level.levelId, level.mode);
              const campaign = CAMPAIGNS[level.mode];
              const modeColor = campaign?.color ?? '#6C5CE7';

              let state: NodeState;
              if (level.position < unifiedPosition) state = 'completed';
              else if (level.position === unifiedPosition) state = 'current';
              else state = 'locked';

              const showChapterBadge =
                isChapterStart(level.position) && level.position !== 1;

              return (
                <React.Fragment key={level.position}>
                  {showChapterBadge && (
                    <View
                      style={{
                        position: 'absolute',
                        left: x - 55,
                        top: y - 38,
                      }}
                      pointerEvents="none"
                    >
                      <ChapterBadge modeName={campaign?.name ?? level.mode} modeColor={modeColor} compact />
                    </View>
                  )}
                  {isWorldTransition(level.position) && (
                    <View
                      style={[
                        st.worldGateBanner,
                        {
                          top: y - 60,
                          backgroundColor: WORLD_THEMES[level.worldTheme].color + '22',
                          borderColor: WORLD_THEMES[level.worldTheme].color,
                        },
                      ]}
                      pointerEvents="none"
                    >
                      <Text
                        style={[
                          st.worldGateText,
                          { color: WORLD_THEMES[level.worldTheme].color },
                        ]}
                      >
                        ENTERING {WORLD_THEMES[level.worldTheme].name.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View
                    style={{
                      position: 'absolute',
                      left: x - 32,
                      top: y - 27,
                    }}
                  >
                    <LevelNode
                      position={level.position}
                      mode={level.mode}
                      modeColor={modeColor}
                      state={state}
                      stars={stars}
                      onPress={() => launchLevel(level)}
                    />
                  </View>
                </React.Fragment>
              );
            })}
          </View>

          {/* Mode Library */}
          <ModeLibrary sideCampaignProgress={sideCampaignProgress} />
        </ScrollView>
      </SafeAreaView>
    </TabTransition>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerLeft: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  worldBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  worldLevelLabel: {
    fontSize: 20,
    fontWeight: '800',
  },
  worldOf: {
    fontSize: 14,
    fontWeight: '500',
  },
  worldPct: {
    fontSize: 11,
    fontWeight: '600',
  },
  worldTrack: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 14,
    overflow: 'hidden',
  },
  worldFill: {
    height: '100%',
    borderRadius: 2,
  },
  continueCard: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  continueAccent: {
    width: 3,
    height: 34,
    borderRadius: 2,
  },
  continueBody: {
    flex: 1,
    gap: 4,
  },
  continueLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  continueMode: {
    fontSize: 15,
    fontWeight: '700',
  },
  continueTagline: {
    fontSize: 12,
    fontWeight: '500',
  },
  playChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  playChipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pathContainer: {
    position: 'relative',
  },
  worldGateBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  worldGateText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
