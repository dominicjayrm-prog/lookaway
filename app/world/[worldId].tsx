import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Modal, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Polygon, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { WORLD_PATHS, WORLD_COLORS, WORLD_LIGHT_COLORS, WORLD_NAMES, WORLD_LEVEL_COUNTS, getMapHeight, buildPathD, getCheckpoint } from '@/src/data/worldPaths';
import { LEVELS, getLevelById } from '@/src/data/levels';
import { spacing } from '@/src/theme/spacing';

const SCREEN_W = Dimensions.get('window').width;
const MAP_W = Math.min(SCREEN_W, 430);
const NODE_SIZE = 42;
const CHECKPOINT_SIZE = 48;
const BOSS_SIZE = 56;

function StarSvg({ size = 11, filled = false, color = '#D4A012' }: { size?: number; filled?: boolean; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100"><Polygon points="50,5 63,35 95,35 69,57 79,90 50,70 21,90 31,57 5,35 37,35" fill={filled ? color : 'none'} stroke={filled ? color : '#B2BEC3'} strokeWidth={filled ? 0 : 6} /></Svg>;
}

function LockSvg({ size = 13, color = '#B2BEC3' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={5} y={11} width={14} height={11} rx={2} fill={color} opacity={0.5} /><Path d="M8,11 V8 A4,4 0 0,1 16,8 V11" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.5} /></Svg>;
}

function PlayTriangle({ size = 14, color = '#00B894' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M8,5 L20,12 L8,19 Z" fill={color} /></Svg>;
}

function CrownSvg({ size = 18, color = '#D4A012', filled = false }: { size?: number; color?: string; filled?: boolean }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3,18 L5,8 L9,13 L12,5 L15,13 L19,8 L21,18 Z" fill={filled ? color : 'none'} stroke={color} strokeWidth={1.5} strokeLinejoin="round" /></Svg>;
}

type NodeState = 'completed' | 'current' | 'near-locked' | 'far-locked' | 'boss-locked' | 'boss-completed';

function getNodeState(levelNum: number, completedUpTo: number, totalLevels: number): NodeState {
  const isBoss = levelNum === totalLevels;
  if (levelNum <= completedUpTo) return isBoss ? 'boss-completed' : 'completed';
  if (levelNum === completedUpTo + 1) return 'current';
  if (isBoss) return 'boss-locked';
  if (levelNum <= completedUpTo + 4) return 'near-locked';
  return 'far-locked';
}

function getLevelStars(worldId: number, levelNum: number, levelProgress: Record<string, { stars: number }>): number {
  const id = `w${worldId}-l${levelNum}`;
  return levelProgress[id]?.stars ?? 0;
}

export default function WorldMapScreen() {
  const { worldId: wIdParam } = useLocalSearchParams<{ worldId: string }>();
  const worldId = parseInt(wIdParam ?? '1', 10);
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const worldColor = WORLD_COLORS[worldId] ?? '#00B894';
  const worldLightColor = WORLD_LIGHT_COLORS[worldId] ?? 'rgba(0,184,148,0.12)';
  const worldName = WORLD_NAMES[worldId] ?? 'Unknown';
  const totalLevels = WORLD_LEVEL_COUNTS[worldId] ?? 20;
  const path = WORLD_PATHS[worldId] ?? [];
  const mapHeight = getMapHeight(worldId);

  const levelProgress = useGameStore((s) => s.levelProgress);

  // Calculate completed count for THIS world
  const completedUpTo = useMemo(() => {
    let count = 0;
    for (let i = 1; i <= totalLevels; i++) {
      if (levelProgress[`w${worldId}-l${i}`]) count = i;
      else break;
    }
    return count;
  }, [levelProgress, worldId, totalLevels]);

  const currentLevel = completedUpTo + 1;
  const earnedStars = useMemo(() => {
    let sum = 0;
    for (let i = 1; i <= totalLevels; i++) sum += getLevelStars(worldId, i, levelProgress);
    return sum;
  }, [levelProgress, worldId, totalLevels]);

  const [popup, setPopup] = useState<number | null>(null);

  // Auto-scroll to current level on mount
  useEffect(() => {
    if (path.length === 0) return;
    const idx = Math.min(currentLevel - 1, path.length - 1);
    const targetY = Math.max(0, path[idx].y - 350);
    setTimeout(() => scrollRef.current?.scrollTo({ y: targetY, animated: false }), 100);
  }, []);

  const handleNodeTap = useCallback((levelNum: number) => {
    const state = getNodeState(levelNum, completedUpTo, totalLevels);
    if (state === 'far-locked' || state === 'boss-locked') return;
    if (state === 'current') {
      router.push(`/game/w${worldId}-l${levelNum}`);
      return;
    }
    setPopup(levelNum);
  }, [completedUpTo, totalLevels, worldId, router]);

  const handlePlay = useCallback(() => {
    router.push(`/game/w${worldId}-l${currentLevel}`);
  }, [worldId, currentLevel, router]);

  // Get level title for bottom bar
  const currentLevelTitle = useMemo(() => {
    const id = `w${worldId}-l${currentLevel}`;
    const level = getLevelById(id);
    return level?.title ?? `Level ${currentLevel}`;
  }, [worldId, currentLevel]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.94)' : colors.bg }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M15,4 L7,12 L15,20" fill="none" stroke={colors.text} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{worldName}</Text>
          <Text style={[styles.headerSubtitle, { color: worldColor }]}>World {worldId} of 6</Text>
        </View>
        <View style={styles.headerPills}>
          <View style={[styles.pill, { backgroundColor: 'rgba(212,160,18,0.1)' }]}>
            <StarSvg size={12} filled color="#D4A012" />
            <Text style={styles.pillText}>{earnedStars}/{totalLevels * 3}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: worldLightColor }]}>
            <Text style={[styles.pillText, { color: worldColor }]}>{completedUpTo}/{totalLevels}</Text>
          </View>
        </View>
      </View>

      {/* ── MAP ── */}
      <ScrollView ref={scrollRef} style={styles.scrollArea} contentContainerStyle={{ height: mapHeight + 100 }} showsVerticalScrollIndicator={false}>
        {/* Background gradient tint */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />

        {/* Background decorations */}
        <BackgroundDecorations worldId={worldId} worldColor={worldColor} mapHeight={mapHeight} />

        {/* SVG paths */}
        <Svg style={StyleSheet.absoluteFill} width={MAP_W} height={mapHeight + 100}>
          {/* Completed path glow */}
          {completedUpTo > 0 && (
            <Path d={buildPathD(path, 0, Math.min(completedUpTo - 1, path.length - 1), MAP_W)} stroke={worldColor} strokeWidth={24} strokeOpacity={0.08} fill="none" strokeLinecap="round" />
          )}
          {/* Completed path solid */}
          {completedUpTo > 0 && (
            <Path d={buildPathD(path, 0, Math.min(completedUpTo - 1, path.length - 1), MAP_W)} stroke={worldColor} strokeWidth={4} fill="none" strokeLinecap="round" />
          )}
          {/* Locked path dashed */}
          {completedUpTo < path.length && (
            <Path d={buildPathD(path, Math.max(0, completedUpTo - 1), path.length - 1, MAP_W)} stroke="rgba(0,0,0,0.08)" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="10,8" />
          )}
        </Svg>

        {/* Level nodes */}
        {path.map((pos, idx) => {
          const levelNum = idx + 1;
          const state = getNodeState(levelNum, completedUpTo, totalLevels);
          const stars = getLevelStars(worldId, levelNum, levelProgress);
          const checkpoint = getCheckpoint(levelNum, totalLevels);
          const isBoss = levelNum === totalLevels;
          const nodeSize = isBoss ? BOSS_SIZE : checkpoint ? CHECKPOINT_SIZE : NODE_SIZE;
          const px = (pos.x / 100) * MAP_W - nodeSize / 2;

          return (
            <Pressable
              key={levelNum}
              onPress={() => handleNodeTap(levelNum)}
              style={[styles.nodeWrapper, { left: px, top: pos.y - nodeSize / 2, width: nodeSize, height: nodeSize + 30 }]}
            >
              {/* Checkpoint badge above */}
              {checkpoint && (
                <View style={[styles.checkpointBadge, { backgroundColor: state === 'completed' || state === 'boss-completed' ? worldLightColor : 'rgba(0,0,0,0.04)' }]}>
                  <Text style={[styles.checkpointText, { color: state === 'completed' || state === 'boss-completed' ? worldColor : '#B2BEC3' }]}>{checkpoint}</Text>
                </View>
              )}
              {/* Finale badge */}
              {isBoss && (
                <View style={[styles.checkpointBadge, { backgroundColor: state === 'boss-completed' ? 'rgba(212,160,18,0.1)' : 'rgba(0,0,0,0.04)' }]}>
                  <Text style={[styles.checkpointText, { color: state === 'boss-completed' ? '#D4A012' : '#B2BEC3' }]}>FINALE</Text>
                </View>
              )}
              {/* Node circle */}
              <LevelNode state={state} levelNum={levelNum} worldColor={worldColor} nodeSize={nodeSize} isBoss={isBoss} />
              {/* Stars below completed nodes */}
              {(state === 'completed' || state === 'boss-completed') && (
                <View style={styles.starsRow}>
                  {[1, 2, 3].map((s) => <StarSvg key={s} size={11} filled={stars >= s} />)}
                </View>
              )}
              {/* PLAY label for current */}
              {state === 'current' && <Text style={[styles.playLabel, { color: worldColor }]}>PLAY</Text>}
            </Pressable>
          );
        })}

        {/* START marker */}
        <View style={[styles.markerPill, { top: (path[0]?.y ?? 2050) + 40, left: MAP_W / 2 - 30 }]}>
          <Text style={[styles.markerText, { color: worldColor }]}>START</Text>
        </View>

        {/* FINISH marker */}
        <View style={[styles.markerPill, { top: (path[path.length - 1]?.y ?? 250) - 50, left: MAP_W / 2 - 45 }]}>
          <Text style={[styles.markerText, { color: completedUpTo >= totalLevels ? '#D4A012' : '#B2BEC3' }]}>
            {completedUpTo >= totalLevels ? 'COMPLETE!' : `WORLD ${worldId + 1} AWAITS`}
          </Text>
        </View>
      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.94)' : colors.bg }]}>
        <View style={styles.bottomInfo}>
          <Text style={[styles.bottomTitle, { color: colors.text }]}>Level {currentLevel}: {currentLevelTitle}</Text>
          <Text style={[styles.bottomSub, { color: colors.textMid }]}>{currentLevel <= totalLevels ? 'Tap to play' : 'World complete!'}</Text>
        </View>
        {currentLevel <= totalLevels && (
          <Pressable style={[styles.playButton, { backgroundColor: worldColor }]} onPress={handlePlay}>
            <Text style={styles.playButtonText}>Play</Text>
          </Pressable>
        )}
      </View>

      {/* ── POPUP ── */}
      {popup !== null && (
        <LevelPopup
          worldId={worldId}
          levelNum={popup}
          worldColor={worldColor}
          stars={getLevelStars(worldId, popup, levelProgress)}
          completedUpTo={completedUpTo}
          colors={colors}
          onClose={() => setPopup(null)}
          onPlay={() => { setPopup(null); router.push(`/game/w${worldId}-l${popup}`); }}
        />
      )}
    </View>
  );
}

/* ── LEVEL NODE ── */
const LevelNode = React.memo(function LevelNode({ state, levelNum, worldColor, nodeSize, isBoss }: { state: NodeState; levelNum: number; worldColor: string; nodeSize: number; isBoss: boolean }) {
  const br = isBoss ? 16 : nodeSize / 2;

  if (state === 'completed' || state === 'boss-completed') {
    return (
      <View style={[styles.nodeCircle, { width: nodeSize, height: nodeSize, borderRadius: br, backgroundColor: worldColor, borderWidth: 2, borderColor: worldColor + '40', shadowColor: worldColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 }]}>
        {isBoss ? <CrownSvg size={18} color="#FFFFFF" filled /> : (
          <Text style={styles.completedNum}>{levelNum}</Text>
        )}
      </View>
    );
  }
  if (state === 'current') {
    return (
      <View style={[styles.nodeCircle, { width: nodeSize, height: nodeSize, borderRadius: br, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: worldColor, shadowColor: worldColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 }]}>
        <PlayTriangle size={14} color={worldColor} />
      </View>
    );
  }
  if (state === 'near-locked') {
    return (
      <View style={[styles.nodeCircle, { width: nodeSize, height: nodeSize, borderRadius: br, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 2, borderColor: 'rgba(0,0,0,0.06)' }]}>
        <Text style={styles.lockedNum}>{levelNum}</Text>
      </View>
    );
  }
  if (state === 'boss-locked') {
    return (
      <View style={[styles.nodeCircle, { width: nodeSize, height: nodeSize, borderRadius: br, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.04)' }]}>
        <CrownSvg size={18} color="#B2BEC3" />
      </View>
    );
  }
  // far-locked
  return (
    <View style={[styles.nodeCircle, { width: nodeSize, height: nodeSize, borderRadius: br, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.04)' }]}>
      <LockSvg size={13} />
    </View>
  );
});

/* ── BACKGROUND DECORATIONS ── */
const BackgroundDecorations = React.memo(function BackgroundDecorations({ worldId, worldColor, mapHeight }: { worldId: number; worldColor: string; mapHeight: number }) {
  const shapes = useMemo(() => {
    const result: { x: number; y: number; size: number; opacity: number; type: 'circle' | 'square' | 'triangle' }[] = [];
    const rng = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
    const r = rng(worldId * 1000 + 42);
    const types: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];
    const count = Math.round(mapHeight / 80);
    for (let i = 0; i < count; i++) {
      result.push({
        x: r() * MAP_W,
        y: r() * mapHeight,
        size: 6 + r() * 14,
        opacity: 0.03 + r() * 0.06,
        type: types[Math.floor(r() * types.length)],
      });
    }
    return result;
  }, [worldId, mapHeight]);

  return (
    <Svg style={StyleSheet.absoluteFill} width={MAP_W} height={mapHeight + 100}>
      {shapes.map((s, i) => {
        if (s.type === 'circle') return <Circle key={i} cx={s.x} cy={s.y} r={s.size / 2} fill={worldColor} opacity={s.opacity} />;
        if (s.type === 'square') return <Rect key={i} x={s.x - s.size / 2} y={s.y - s.size / 2} width={s.size} height={s.size} rx={2} fill={worldColor} opacity={s.opacity} />;
        const hs = s.size / 2;
        return <Polygon key={i} points={`${s.x},${s.y - hs} ${s.x + hs},${s.y + hs} ${s.x - hs},${s.y + hs}`} fill={worldColor} opacity={s.opacity} />;
      })}
    </Svg>
  );
});

/* ── POPUP ── */
function LevelPopup({ worldId, levelNum, worldColor, stars, completedUpTo, colors, onClose, onPlay }: {
  worldId: number; levelNum: number; worldColor: string; stars: number; completedUpTo: number;
  colors: Record<string, string>; onClose: () => void; onPlay: () => void;
}) {
  const isCompleted = levelNum <= completedUpTo;
  const level = getLevelById(`w${worldId}-l${levelNum}`);
  const title = level?.title ?? `Level ${levelNum}`;
  const starsNeeded = 3 - stars;
  const label = stars === 3 ? 'Perfect score!' : stars === 2 ? 'Great job!' : stars === 1 ? 'Passed' : '';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.popupBackdrop} onPress={onClose}>
        <Pressable style={[styles.popupCard, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.popupCircle, { backgroundColor: worldColor }]}>
            <Text style={styles.popupCircleNum}>{levelNum}</Text>
          </View>
          <Text style={[styles.popupTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.popupSub, { color: colors.textMid }]}>World {worldId} — Level {levelNum}</Text>
          {isCompleted && (
            <>
              <View style={styles.popupStars}>
                {[1, 2, 3].map((s) => <StarSvg key={s} size={24} filled={stars >= s} />)}
              </View>
              {label ? <Text style={[styles.popupLabel, { color: colors.textMid }]}>{label}</Text> : null}
              {starsNeeded > 0 && (
                <Text style={[styles.popupHint, { color: colors.accent }]}>Replay to earn {starsNeeded} more star{starsNeeded > 1 ? 's' : ''}</Text>
              )}
            </>
          )}
          <View style={styles.popupButtons}>
            <Pressable style={[styles.popupPlayBtn, { backgroundColor: worldColor }]} onPress={onPlay}>
              <Text style={styles.popupPlayText}>{isCompleted ? 'Replay' : 'Play'}</Text>
            </Pressable>
            <Pressable style={[styles.popupCloseBtn, { backgroundColor: colors.surface }]} onPress={onClose}>
              <Text style={[styles.popupCloseText, { color: colors.textMid }]}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, zIndex: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  backButton: { padding: 8 },
  headerCenter: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  headerPills: { flexDirection: 'row', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 12, fontWeight: '700', color: '#D4A012' },
  // Scroll
  scrollArea: { flex: 1 },
  // Nodes
  nodeWrapper: { position: 'absolute', alignItems: 'center' },
  nodeCircle: { alignItems: 'center', justifyContent: 'center' },
  completedNum: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  lockedNum: { fontSize: 14, fontWeight: '700', color: '#B2BEC3' },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 3 },
  playLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  // Checkpoint
  checkpointBadge: { position: 'absolute', top: -22, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  checkpointText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  // Markers
  markerPill: { position: 'absolute', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.8)' },
  markerText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  // Bottom bar
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)' },
  bottomInfo: { flex: 1 },
  bottomTitle: { fontSize: 15, fontWeight: '700' },
  bottomSub: { fontSize: 12, marginTop: 2 },
  playButton: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  playButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  // Popup
  popupBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  popupCard: { width: '100%', maxWidth: 300, borderRadius: 20, padding: 24, alignItems: 'center' },
  popupCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  popupCircleNum: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  popupTitle: { fontSize: 17, fontWeight: '700' },
  popupSub: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  popupStars: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  popupLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  popupHint: { fontSize: 12, fontWeight: '600', marginBottom: 12 },
  popupButtons: { width: '100%', gap: 8, marginTop: 8 },
  popupPlayBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  popupPlayText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  popupCloseBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  popupCloseText: { fontSize: 14, fontWeight: '600' },
});
