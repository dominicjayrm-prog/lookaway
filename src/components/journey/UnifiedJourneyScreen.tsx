import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Share, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedReaction,
  runOnJS,
  interpolate,
  Extrapolation,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
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

function ContinueArrow() {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[st.continueArrowWrap, style]}>
      <View style={st.continueArrowPill}>
        <Ionicons name="play" size={16} color="#FFFFFF" />
      </View>
    </Animated.View>
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
  // Scroll-driven animations: header blur-in after a few px, hero
  // parallax. Shared on the worklet thread so these never dip below
  // 60fps even when the main JS is busy.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

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
  // Cloud hydration flag — until loadFromCloud has completed at least
  // once, the intro / migration banner / world intro / Brain Master
  // modals stay dormant. Without this guard, a signed-in user on a
  // fresh app open would briefly see the first-run intro before the
  // real state arrives, then have it swapped under them. For guests
  // (no auth) _cloudHydrated flips true immediately so there's no
  // delay added to offline flows.
  const cloudHydrated = useGameStore((s) => s._cloudHydrated);
  const authUserId = useGameStore((s) => s._authUserId);
  // Treat guest users (no auth) as already hydrated — they have no
  // cloud state to wait for.
  const readyForIntroDecisions = cloudHydrated || !authUserId;

  const [worldIntroFor, setWorldIntroFor] = useState<WorldTheme | null>(null);
  const [showBrainMaster, setShowBrainMaster] = useState(false);
  const [showOutOfLives, setShowOutOfLives] = useState(false);

  // Viewport culling — rendering all 380 level nodes + 379 SVG path
  // connectors at once is the single biggest perf risk on Android.
  // Instead we track the scroll position and only render a window of
  // nodes around the current viewport. A buffer of ±40 positions
  // (~3400px) above / below keeps scrolling smooth without ever
  // showing a node mid-spawn. The initial range centres on
  // unifiedPosition so the auto-scroll lands on already-rendered
  // content.
  const VISIBLE_BUFFER = 40;
  const [visibleRange, setVisibleRange] = useState<[number, number]>(() => [
    Math.max(1, unifiedPosition - VISIBLE_BUFFER),
    Math.min(UNIFIED_LADDER.length, unifiedPosition + VISIBLE_BUFFER),
  ]);

  // CRITICAL: this callback MUST be declared BEFORE the
  // useAnimatedReaction below — otherwise Reanimated captures the
  // still-undefined binding when it serialises the worklet for the
  // UI thread, and runOnJS(undefined) crashes natively on the first
  // scroll tick. Learned that the hard way.
  const maybeUpdateRange = useCallback((s: number, e: number) => {
    setVisibleRange((prev) => {
      if (Math.abs(s - prev[0]) < 15 && Math.abs(e - prev[1]) < 15) return prev;
      return [s, e];
    });
  }, []);

  // Shift the visible window when the scroll position drifts far
  // enough that the old window is no longer centred. We only re-render
  // when the center moves by >15 positions to avoid render thrash.
  useAnimatedReaction(
    () => scrollY.value,
    (current) => {
      'worklet';
      const approxPos = Math.max(
        1,
        Math.floor((current - PATH_TOP_PADDING) / ROW_HEIGHT) + 1,
      );
      const nextStart = Math.max(1, approxPos - VISIBLE_BUFFER);
      const nextEnd = Math.min(UNIFIED_LADDER.length, approxPos + VISIBLE_BUFFER);
      runOnJS(maybeUpdateRange)(nextStart, nextEnd);
    },
    [maybeUpdateRange],
  );

  // Is this a brand-new player (position 1, no intro seen) or a
  // migrated existing user (position > 1, no intro seen)?
  // Both gated on cloud hydration so we never show the intro to a
  // signed-in user BEFORE their cloud state arrives — that was the
  // flash-of-wrong-UI bug where existing users would briefly see the
  // 3-card intro before loadFromCloud swapped in their real position.
  const isBrandNew = readyForIntroDecisions && !hasSeenUnifiedIntro && unifiedPosition === 1;
  const isMigratedExisting = readyForIntroDecisions && !hasSeenUnifiedIntro && unifiedPosition > 1;

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
    if (!readyForIntroDecisions) return;
    if (!isWorldTransition(unifiedPosition)) return;
    const level = getUnifiedLevel(unifiedPosition);
    if (!level) return;
    if (hasSeenWorldIntro[level.worldTheme]) return;
    setWorldIntroFor(level.worldTheme);
    if (Platform.OS !== 'web') {
      // Heavy impact for a moment this big — player just crossed into a
      // whole new themed world.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [readyForIntroDecisions, unifiedPosition, hasSeenWorldIntro]);

  // Fire the Brain Master celebration once when the player has
  // completed every level. Gated on `hasSeenBrainMaster` so it never
  // re-fires after dismissal — without that, the modal would pop every
  // time the journey screen mounts after the player reaches 380.
  useEffect(() => {
    if (!readyForIntroDecisions) return;
    if (hasSeenBrainMaster) return;
    if (unifiedPosition < UNIFIED_LADDER.length) return;
    const final = getUnifiedLevel(UNIFIED_LADDER.length);
    if (!final) return;
    const stars =
      final.mode === 'classic'
        ? levelProgress[final.levelId]?.stars ?? 0
        : sideCampaignProgress[final.levelId]?.stars ?? 0;
    if (stars > 0) setShowBrainMaster(true);
  }, [readyForIntroDecisions, unifiedPosition, levelProgress, sideCampaignProgress, hasSeenBrainMaster]);

  const closeBrainMaster = () => {
    setShowBrainMaster(false);
    markBrainMasterSeen();
  };

  const dismissWorldIntro = () => {
    if (worldIntroFor) markWorldIntroSeen(worldIntroFor);
    setWorldIntroFor(null);
  };

  const shareJourney = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
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
        <Animated.ScrollView
          ref={scrollRef as any}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={st.scrollContent}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {/* Migration banner for existing users */}
          {isMigratedExisting && (
            <MigrationBanner
              unifiedPosition={unifiedPosition}
              onDismiss={markUnifiedIntroSeen}
            />
          )}

          {/* Header + hero container. The gradient sits behind everything
           *  chrome-like above the path so the transition into the
           *  themed world backgrounds feels seamless. */}
          <View style={st.heroWrap}>
            <LinearGradient
              colors={[currentTheme.color + '18', 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />

            {/* Header row — eyebrow + title + stats */}
            <View style={st.header}>
              <View style={st.headerLeft}>
                <View style={st.eyebrowRow}>
                  <View style={[st.worldDot, { backgroundColor: currentTheme.color }]} />
                  <Text style={[st.eyebrow, { color: currentTheme.color }]}>
                    {t('journey.world_eyebrow', {
                      world: localizedWorldName(currentLevel?.worldTheme ?? 'emerald_grove').toUpperCase(),
                      num: currentTheme.worldNumber,
                      total: WORLD_THEME_ORDER.length,
                    })}
                  </Text>
                </View>
                <Text style={[st.title, { color: colors.text }]}>
                  {t('journey.unified_title')}
                </Text>
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
                  style={({ pressed }) => [
                    st.pill,
                    { backgroundColor: colors.surface, opacity: pressed ? 0.75 : 1 },
                  ]}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={t('journey.share_journey_aria')}
                >
                  <Ionicons name="share-outline" size={14} color={colors.textMid} />
                </Pressable>
              </View>
            </View>

            {/* Progress rail — "Level N of 380" with a gradient fill bar. */}
            <View style={st.worldBar}>
              <Text style={[st.worldLevelLabel, { color: colors.text }]}>
                {t('journey.position_of_total', { position: unifiedPosition })}
                <Text style={[st.worldOf, { color: colors.textMid }]}>
                  {' '}
                  {t('journey.position_of_total_suffix', { total: UNIFIED_LADDER.length })}
                </Text>
              </Text>
              <Text style={[st.worldPct, { color: currentTheme.color }]}>
                {t('journey.percent_complete', { pct: totalPct })}
              </Text>
            </View>
            <View style={[st.worldTrack, { backgroundColor: colors.surface }]}>
              <View style={[st.worldFillShadow, { width: `${Math.max(2, totalPct)}%` }]} />
              <LinearGradient
                colors={[currentTheme.color, WORLD_VISUALS[currentLevel?.worldTheme ?? 'emerald_grove'].gradientColors[1]]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[st.worldFill, { width: `${Math.max(2, totalPct)}%` }]}
              />
            </View>

            {/* Continue hero — gradient card with world accent + PLAY
             *  chip. Pressed state scales slightly; haptic on tap. */}
            {currentLevel && currentCampaign && (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  }
                  launchLevel(currentLevel);
                }}
                style={({ pressed }) => [
                  st.continueShadow,
                  pressed && { transform: [{ scale: 0.985 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Continue level ${unifiedPosition}`}
              >
                <LinearGradient
                  colors={[
                    currentCampaign.color,
                    WORLD_VISUALS[currentLevel.worldTheme].gradientColors[1],
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.continueCard}
                >
                  <View style={st.continueBody}>
                    <Text style={st.continueLabel}>
                      {t('journey.continue_eyebrow', { position: unifiedPosition })}
                    </Text>
                    <Text style={st.continueMode} numberOfLines={1}>
                      {currentCampaign.name}
                    </Text>
                    <Text style={st.continueTagline}>
                      {t('journey.continue_tap_to_play')}
                    </Text>
                  </View>
                  <ContinueArrow />
                </LinearGradient>
              </Pressable>
            )}
          </View>

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
              currentWorld={currentLevel?.worldTheme ?? 'emerald_grove'}
            />
            {/* Draw connectors first so nodes render above them. Completed
             *  segments get a glow halo + world-tinted gradient; upcoming
             *  segments stay dashed and quiet. Viewport-culled so we only
             *  render connectors inside the current visible window. */}
            {UNIFIED_LADDER.slice(0, UNIFIED_LADDER.length - 1)
              .filter((level) => level.position >= visibleRange[0] && level.position <= visibleRange[1])
              .map((level) => {
              const next = UNIFIED_LADDER[level.position];
              if (!next) return null;
              const x1 = pathXForPosition(level.position, pathWidth);
              const y1 = yForPosition(level.position);
              const x2 = pathXForPosition(next.position, pathWidth);
              const y2 = yForPosition(next.position);
              const completed = next.position <= unifiedPosition;
              const visuals = WORLD_VISUALS[next.worldTheme];
              const fromVisuals = WORLD_VISUALS[level.worldTheme];
              return (
                <PathConnector
                  key={`c-${level.position}`}
                  keyId={level.position}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  color={completed ? fromVisuals.pathColor : 'rgba(255,255,255,0.45)'}
                  endColor={completed ? visuals.pathColor : 'rgba(255,255,255,0.45)'}
                  opacity={completed ? 0.95 : 0.5}
                  dashed={!completed}
                  width={completed ? 5 : 3}
                  glow={completed}
                />
              );
            })}

            {/* Level nodes + chapter badges */}
            {UNIFIED_LADDER
              .filter((level) => level.position >= visibleRange[0] && level.position <= visibleRange[1])
              .map((level) => {
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
        </Animated.ScrollView>

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
  heroWrap: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  worldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
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
    paddingHorizontal: 18,
    paddingTop: 2,
  },
  worldLevelLabel: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  worldOf: {
    fontSize: 14,
    fontWeight: '500',
  },
  worldPct: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  worldTrack: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 18,
    marginTop: 7,
    marginBottom: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  worldFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 3,
  },
  worldFillShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  continueShadow: {
    marginHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  continueCard: {
    padding: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  continueBody: {
    flex: 1,
    gap: 2,
  },
  continueLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.8)',
  },
  continueMode: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  continueTagline: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  continueArrowWrap: {
    marginLeft: 12,
  },
  continueArrowPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  pathContainer: {
    position: 'relative',
  },
});
