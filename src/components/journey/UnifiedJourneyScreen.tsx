import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Share, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { localizedWorldName } from './worldI18n';
import { LevelNode, type NodeState } from './LevelNode';
import { ChapterBadge } from './ChapterBadge';
import { PathConnector } from './PathConnector';
import { ModeLibrary } from './ModeLibrary';
import { WorldBackground } from './WorldBackground';
import { WorldIntroModal } from './WorldIntroModal';
import { WorldGate } from './WorldGate';
import { WORLD_VISUALS } from './worldVisuals';
import { UnifiedIntro } from './UnifiedIntro';
import { MigrationBanner } from './MigrationBanner';
import { BlinkOnPath } from './BlinkOnPath';
import { BrainMasterCelebration } from './BrainMasterCelebration';
import { OutOfLivesModal } from '@/src/components/OutOfLivesModal';

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
    hasSeenWorldIntro,
    markWorldIntroSeen,
    hasSeenUnifiedIntro,
    markUnifiedIntroSeen,
    hasSeenBrainMaster,
    markBrainMasterSeen,
  } = useGameStore();

  const [worldIntroFor, setWorldIntroFor] = useState<WorldTheme | null>(null);
  const [showBrainMaster, setShowBrainMaster] = useState(false);
  const [showOutOfLives, setShowOutOfLives] = useState(false);

  // Is this a brand-new player (position 1, no intro seen) or a
  // migrated existing user (position > 1, no intro seen)?
  const isBrandNew = !hasSeenUnifiedIntro && unifiedPosition === 1;
  const isMigratedExisting = !hasSeenUnifiedIntro && unifiedPosition > 1;

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

  // Detect a first-time entry into a new world and queue the intro
  // modal. Only fires at world boundaries (76/151/226/301) — the first
  // world (Emerald Grove) doesn't get a standalone intro because
  // UnifiedIntro already introduces all five. The modal is
  // single-shot per world via `hasSeenWorldIntro`.
  useEffect(() => {
    if (!isWorldTransition(unifiedPosition)) return;
    const level = getUnifiedLevel(unifiedPosition);
    if (!level) return;
    if (hasSeenWorldIntro[level.worldTheme]) return;
    setWorldIntroFor(level.worldTheme);
  }, [unifiedPosition, hasSeenWorldIntro]);

  // Fire the Brain Master celebration once when the player has
  // completed every level. Gated on `hasSeenBrainMaster` so it never
  // re-fires after dismissal — without that, the modal would pop every
  // time the journey screen mounts after the player reaches 380.
  useEffect(() => {
    if (hasSeenBrainMaster) return;
    if (unifiedPosition < UNIFIED_LADDER.length) return;
    const final = getUnifiedLevel(UNIFIED_LADDER.length);
    if (!final) return;
    const stars =
      final.mode === 'classic'
        ? levelProgress[final.levelId]?.stars ?? 0
        : sideCampaignProgress[final.levelId]?.stars ?? 0;
    if (stars > 0) setShowBrainMaster(true);
  }, [unifiedPosition, levelProgress, sideCampaignProgress, hasSeenBrainMaster]);

  const closeBrainMaster = () => {
    setShowBrainMaster(false);
    markBrainMasterSeen();
  };

  const dismissWorldIntro = () => {
    if (worldIntroFor) markWorldIntroSeen(worldIntroFor);
    setWorldIntroFor(null);
  };

  const shareJourney = async () => {
    const { streakCount } = useGameStore.getState();
    const streakSuffix =
      streakCount > 0 ? t('journey.share_streak_suffix', { streak: streakCount }) : '';
    try {
      await Share.share({
        message: t('journey.share_message', {
          position: unifiedPosition,
          total: UNIFIED_LADDER.length,
          stars: totalStars,
          streak: streakSuffix,
        }),
      });
    } catch {}
  };

  const launchLevel = (level: UnifiedLevel) => {
    const store = useGameStore.getState();
    store.checkLifeRegen();
    // The unlimited-lives IAP bypasses the lives check entirely — matches
    // the behaviour of the per-mode world maps so players who've paid for
    // it aren't blocked here either.
    const hasUnlimited = store.hasUnlimitedLives();
    if (store.lives <= 0 && !hasUnlimited) {
      setShowOutOfLives(true);
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

  // Brand-new players get the three-card intro before anything else.
  if (isBrandNew) {
    return (
      <TabTransition>
        <UnifiedIntro onComplete={markUnifiedIntroSeen} />
      </TabTransition>
    );
  }

  return (
    <TabTransition>
      <SafeAreaView style={[st.container, { backgroundColor: colors.bg }]} edges={['top']}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.scrollContent}
        >
          {/* Migration banner for existing users */}
          {isMigratedExisting && (
            <MigrationBanner
              unifiedPosition={unifiedPosition}
              onDismiss={markUnifiedIntroSeen}
            />
          )}

          {/* Header */}
          <View style={st.header}>
            <View style={st.headerLeft}>
              <Text style={[st.eyebrow, { color: currentTheme.color }]}>
                {t('journey.world_eyebrow', {
                  world: localizedWorldName(currentLevel?.worldTheme ?? 'emerald_grove').toUpperCase(),
                  num: currentTheme.worldNumber,
                  total: WORLD_THEME_ORDER.length,
                })}
              </Text>
              <Text style={[st.title, { color: colors.text }]}>{t('journey.unified_title')}</Text>
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
              <Pressable
                onPress={shareJourney}
                style={[st.pill, { backgroundColor: colors.surface }]}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('journey.share_journey_aria')}
              >
                <Ionicons name="share-outline" size={14} color={colors.textMid} />
              </Pressable>
            </View>
          </View>

          {/* World title + progress bar */}
          <View style={st.worldBar}>
            <Text style={[st.worldLevelLabel, { color: currentTheme.color }]}>
              {t('journey.position_of_total', { position: unifiedPosition })}
              <Text style={[st.worldOf, { color: colors.textMid }]}>
                {' '}
                {t('journey.position_of_total_suffix', { total: UNIFIED_LADDER.length })}
              </Text>
            </Text>
            <Text style={[st.worldPct, { color: colors.textMid }]}>
              {t('journey.percent_complete', { pct: totalPct })}
            </Text>
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
                  {t('journey.continue_eyebrow', { position: unifiedPosition })}
                </Text>
                <Text style={[st.continueMode, { color: colors.text }]}>
                  {currentCampaign.name}
                  <Text style={[st.continueTagline, { color: colors.textMid }]}>
                    {' · '}
                    {t('journey.continue_tap_to_play')}
                  </Text>
                </Text>
              </View>
              <View style={[st.playChip, { backgroundColor: currentCampaign.color }]}>
                <Text style={st.playChipText}>{t('journey.play_chip')}</Text>
              </View>
            </Pressable>
          )}

          {/* The path — vertically scrolling snake */}
          <View style={[st.pathContainer, { height: pathHeight, width: pathWidth }]}>
            {/* Themed world backgrounds: 5 stacked gradient slabs, each
             *  with its own particle system. Rendered first so path +
             *  nodes layer above. */}
            <WorldBackground
              width={pathWidth}
              pathTopPadding={PATH_TOP_PADDING}
              rowHeight={ROW_HEIGHT}
              totalPositions={UNIFIED_LADDER.length}
            />
            {/* Draw connectors first so nodes render above them. */}
            {UNIFIED_LADDER.slice(0, UNIFIED_LADDER.length - 1).map((level) => {
              const next = UNIFIED_LADDER[level.position];
              if (!next) return null;
              const x1 = pathXForPosition(level.position, pathWidth);
              const y1 = yForPosition(level.position);
              const x2 = pathXForPosition(next.position, pathWidth);
              const y2 = yForPosition(next.position);
              const completed = next.position <= unifiedPosition;
              const visuals = WORLD_VISUALS[next.worldTheme];
              const color = completed ? visuals.pathColor : 'rgba(255,255,255,0.35)';
              return (
                <PathConnector
                  key={`c-${level.position}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  color={color}
                  opacity={completed ? 0.85 : 0.45}
                  dashed={!completed}
                  width={completed ? 5 : 3}
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
                      style={{
                        position: 'absolute',
                        top: y - 70,
                        left: 0,
                        right: 0,
                      }}
                      pointerEvents="none"
                    >
                      <WorldGate
                        nextWorld={level.worldTheme}
                        locked={level.position > unifiedPosition}
                      />
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
                  {state === 'current' && (
                    <View
                      style={{
                        position: 'absolute',
                        // Place Blink ~40px to the right of the node,
                        // flipping to the left when the node sits on the
                        // right half of the screen so he never clips off.
                        left: x > pathWidth / 2 ? x - 80 : x + 50,
                        top: y - 18,
                      }}
                      pointerEvents="none"
                    >
                      <BlinkOnPath size={36} />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* Mode Library */}
          <ModeLibrary sideCampaignProgress={sideCampaignProgress} />
        </ScrollView>

        <WorldIntroModal world={worldIntroFor} onClose={dismissWorldIntro} />
        <BrainMasterCelebration
          visible={showBrainMaster}
          onClose={closeBrainMaster}
        />
        <OutOfLivesModal
          visible={showOutOfLives}
          onClose={() => setShowOutOfLives(false)}
          onGoToShop={() => {
            setShowOutOfLives(false);
            router.push('/(tabs)/shop');
          }}
        />
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
});
