import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Modal, Animated as RNAnimated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Polygon } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';
import { supabase } from '@/src/lib/supabase';
import { CAMPAIGNS } from '@/src/data/campaigns';
import { generatePath, getGeneratedMapHeight, buildPathD, getCheckpoint, type PathNode } from '@/src/data/worldPaths';

const DEFAULT_MAP_W = Math.min(Dimensions.get('window').width, 430);
const NODE_SIZE = 42;
const CHECKPOINT_SIZE = 48;
const BOSS_SIZE = 56;

const SIDE_PREFIX: Record<string, string> = { speed_recall: 'sr', snap_match: 'sm', sequence: 'seq', counting_blitz: 'cb', colour_chain: 'cc' };

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

export default function SideWorldMapScreen() {
  const { mode, worldNumber, worldName } = useLocalSearchParams<{ mode: string; worldNumber: string; worldName: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [mapWidth, setMapWidth] = useState(DEFAULT_MAP_W);

  const modeId = mode ?? 'speed_recall';
  const worldNum = parseInt(worldNumber ?? '1', 10);
  const wName = worldName ?? 'World';
  const campaign = CAMPAIGNS[modeId];
  const worldColor = campaign?.color ?? '#6C5CE7';
  const worldLightColor = worldColor + '15';
  const totalLevels = campaign?.levelsPerWorld?.[worldNum - 1] ?? 15;
  const prefix = SIDE_PREFIX[modeId] ?? modeId;
  const totalWorlds = campaign?.worldCount ?? 3;

  // Generate path for this world
  const path = useMemo(() => generatePath(totalLevels, worldNum + modeId.length), [totalLevels, worldNum, modeId]);
  const mapHeight = useMemo(() => getGeneratedMapHeight(path), [path]);

  // Load progress from Supabase
  const [progress, setProgress] = useState<Record<string, { stars: number; best_score: number }>>({});
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        const { data } = await supabase
          .from('side_campaign_progress')
          .select('level_id, stars, best_score')
          .eq('user_id', session.user.id)
          .like('level_id', `${prefix}_w${worldNum}_%`);
        if (data) {
          const p: Record<string, { stars: number; best_score: number }> = {};
          data.forEach(r => { p[r.level_id] = { stars: r.stars, best_score: r.best_score }; });
          setProgress(p);
        }
      } catch {}
    })();
  }, [prefix, worldNum]);

  function getLevelId(levelNum: number): string {
    return `${prefix}_w${worldNum}_l${levelNum}`;
  }
  function getLevelStars(levelNum: number): number {
    return progress[getLevelId(levelNum)]?.stars ?? 0;
  }

  const completedUpTo = useMemo(() => {
    let count = 0;
    for (let i = 1; i <= totalLevels; i++) {
      if (progress[getLevelId(i)]) count = i;
      else break;
    }
    return count;
  }, [progress, totalLevels, prefix, worldNum]);

  const currentLevel = completedUpTo + 1;
  const earnedStars = useMemo(() => {
    let sum = 0;
    for (let i = 1; i <= totalLevels; i++) sum += getLevelStars(i);
    return sum;
  }, [progress, totalLevels]);

  const [popup, setPopup] = useState<number | null>(null);

  // Entry animations
  const headerAnim = useRef(new RNAnimated.Value(0)).current;
  const bottomAnim = useRef(new RNAnimated.Value(0)).current;
  const pathAnim = useRef(new RNAnimated.Value(0)).current;
  const nodeAnims = useRef(path.map(() => new RNAnimated.Value(0))).current;

  useEffect(() => {
    RNAnimated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    RNAnimated.timing(pathAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }).start();
    const staggered = path.map((_, idx) => {
      const reverseIdx = path.length - 1 - idx;
      return RNAnimated.timing(nodeAnims[idx], { toValue: 1, duration: 350, delay: 300 + reverseIdx * 40, useNativeDriver: true });
    });
    RNAnimated.parallel(staggered).start();
    RNAnimated.timing(bottomAnim, { toValue: 1, duration: 400, delay: 250, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (path.length === 0) return;
    const idx = Math.min(currentLevel - 1, path.length - 1);
    const targetY = Math.max(0, path[idx].y - 350);
    setTimeout(() => scrollRef.current?.scrollTo({ y: targetY, animated: false }), 100);
  }, [currentLevel, path]);

  const handleNodeTap = useCallback((levelNum: number) => {
    const state = getNodeState(levelNum, completedUpTo, totalLevels);
    if (state === 'completed' || state === 'boss-completed') { setPopup(levelNum); return; }
    if (state === 'current') {
      router.push({ pathname: '/game/side-campaign', params: { levelId: getLevelId(levelNum), mode: modeId, worldNumber: String(worldNum), levelNumber: String(levelNum), worldName: wName } });
      return;
    }
  }, [completedUpTo, totalLevels, modeId, worldNum, wName, router]);

  const handlePlay = useCallback(() => {
    router.push({ pathname: '/game/side-campaign', params: { levelId: getLevelId(currentLevel), mode: modeId, worldNumber: String(worldNum), levelNumber: String(currentLevel), worldName: wName } });
  }, [modeId, worldNum, currentLevel, wName, router]);

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <RNAnimated.View style={[st.header, { paddingTop: insets.top + 8, backgroundColor: colors.bg, opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
        <Pressable onPress={() => router.back()} style={st.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M15,4 L7,12 L15,20" fill="none" stroke={colors.text} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={[st.headerTitle, { color: colors.text }]}>{wName}</Text>
          <Text style={[st.headerSubtitle, { color: worldColor }]}>{campaign?.name} — World {worldNum} of {totalWorlds}</Text>
        </View>
        <View style={st.headerPills}>
          <View style={[st.pill, { backgroundColor: 'rgba(212,160,18,0.1)' }]}>
            <StarSvg size={12} filled color="#D4A012" />
            <Text style={st.pillText}>{earnedStars}/{totalLevels * 3}</Text>
          </View>
          <View style={[st.pill, { backgroundColor: worldLightColor }]}>
            <Text style={[st.pillText, { color: worldColor }]}>{completedUpTo}/{totalLevels}</Text>
          </View>
        </View>
      </RNAnimated.View>

      {/* Map */}
      <ScrollView ref={scrollRef} style={st.scrollArea} contentContainerStyle={{ height: mapHeight + 100 }} showsVerticalScrollIndicator={false} onLayout={(e) => setMapWidth(Math.min(e.nativeEvent.layout.width, 430))}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />

        {/* Background decorations */}
        <Svg style={StyleSheet.absoluteFill} width={mapWidth} height={mapHeight + 100}>
          {Array.from({ length: Math.round(mapHeight / 80) }, (_, i) => {
            const rng = ((i * 16807 + (worldNum + modeId.length) * 1000 + 42) % 2147483647) / 2147483646;
            const x = (rng * 1000 % mapWidth);
            const y = (rng * 7919 % mapHeight);
            const sz = 6 + (rng * 13 % 14);
            return <Circle key={i} cx={x} cy={y} r={sz / 2} fill={worldColor} opacity={0.04} />;
          })}
        </Svg>

        {/* SVG paths */}
        <RNAnimated.View style={{ ...StyleSheet.absoluteFillObject, opacity: pathAnim }}>
        <Svg style={StyleSheet.absoluteFill} width={mapWidth} height={mapHeight + 100}>
          {completedUpTo > 0 && (
            <Path d={buildPathD(path, 0, Math.min(completedUpTo - 1, path.length - 1), mapWidth)} stroke={worldColor} strokeWidth={24} strokeOpacity={0.08} fill="none" strokeLinecap="round" />
          )}
          {completedUpTo > 0 && (
            <Path d={buildPathD(path, 0, Math.min(completedUpTo - 1, path.length - 1), mapWidth)} stroke={worldColor} strokeWidth={4} fill="none" strokeLinecap="round" />
          )}
          {completedUpTo < path.length && (
            <Path d={buildPathD(path, Math.max(0, completedUpTo - 1), path.length - 1, mapWidth)} stroke="rgba(0,0,0,0.08)" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="10,8" />
          )}
        </Svg>
        </RNAnimated.View>

        {/* Level nodes */}
        {path.map((pos, idx) => {
          const levelNum = idx + 1;
          const state = getNodeState(levelNum, completedUpTo, totalLevels);
          const stars = getLevelStars(levelNum);
          const checkpoint = getCheckpoint(levelNum, totalLevels);
          const isBoss = levelNum === totalLevels;
          const nodeSize = isBoss ? BOSS_SIZE : checkpoint ? CHECKPOINT_SIZE : NODE_SIZE;
          const px = (pos.x / 100) * mapWidth - nodeSize / 2;
          const anim = nodeAnims[idx];

          return (
            <RNAnimated.View key={levelNum} style={[st.nodeWrapper, { left: px, top: pos.y - nodeSize / 2, width: nodeSize, height: nodeSize + 30, opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }, { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }] }]}>
              <Pressable onPress={() => handleNodeTap(levelNum)} style={{ alignItems: 'center' }}>
                {checkpoint && (
                  <View style={[st.checkpointBadge, { backgroundColor: state === 'completed' || state === 'boss-completed' ? worldLightColor : 'rgba(0,0,0,0.04)' }]}>
                    <Text style={[st.checkpointText, { color: state === 'completed' || state === 'boss-completed' ? worldColor : '#B2BEC3' }]}>{checkpoint}</Text>
                  </View>
                )}
                {isBoss && (
                  <View style={[st.checkpointBadge, { backgroundColor: state === 'boss-completed' ? 'rgba(212,160,18,0.1)' : 'rgba(0,0,0,0.04)' }]}>
                    <Text style={[st.checkpointText, { color: state === 'boss-completed' ? '#D4A012' : '#B2BEC3' }]}>FINALE</Text>
                  </View>
                )}
                <LevelNode state={state} levelNum={levelNum} worldColor={worldColor} nodeSize={nodeSize} isBoss={isBoss} />
                {(state === 'completed' || state === 'boss-completed') && (
                  <View style={st.starsRow}>{[1, 2, 3].map(s => <StarSvg key={s} size={11} filled={stars >= s} />)}</View>
                )}
                {state === 'current' && <Text style={[st.playLabel, { color: worldColor }]}>PLAY</Text>}
              </Pressable>
            </RNAnimated.View>
          );
        })}

        <View style={[st.markerPill, { top: (path[0]?.y ?? 2050) + 40, left: mapWidth / 2 - 30 }]}>
          <Text style={[st.markerText, { color: worldColor }]}>START</Text>
        </View>
        <View style={[st.markerPill, { top: (path[path.length - 1]?.y ?? 250) - 50, left: mapWidth / 2 - 45 }]}>
          <Text style={[st.markerText, { color: completedUpTo >= totalLevels ? '#D4A012' : '#B2BEC3' }]}>
            {completedUpTo >= totalLevels ? 'COMPLETE!' : worldNum < totalWorlds ? `WORLD ${worldNum + 1} AWAITS` : 'THE SUMMIT'}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <RNAnimated.View style={[st.bottomBar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.bg, opacity: bottomAnim, transform: [{ translateY: bottomAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
        <View style={st.bottomInfo}>
          <Text style={[st.bottomTitle, { color: colors.text }]}>Level {currentLevel}</Text>
          <Text style={[st.bottomSub, { color: colors.textMid }]}>{currentLevel <= totalLevels ? 'Tap to play' : 'World complete!'}</Text>
        </View>
        {currentLevel <= totalLevels && (
          <Pressable style={[st.playButton, { backgroundColor: worldColor }]} onPress={handlePlay}>
            <Text style={st.playButtonText}>Play</Text>
          </Pressable>
        )}
      </RNAnimated.View>

      {/* Popup */}
      {popup !== null && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPopup(null)}>
          <View style={st.popupBackdrop}>
            <Pressable style={st.popupBackdropTouchable} onPress={() => setPopup(null)} />
            <View style={[st.popupCard, { backgroundColor: colors.card }]}>
              <View style={[st.popupCircle, { backgroundColor: worldColor }]}>
                <Text style={st.popupCircleNum}>{popup}</Text>
              </View>
              <Text style={[st.popupTitle, { color: colors.text }]}>Level {popup}</Text>
              <Text style={[st.popupSub, { color: colors.textMid }]}>{campaign?.name} — {wName}</Text>
              <View style={st.popupStars}>
                {[1, 2, 3].map(s => <StarSvg key={s} size={24} filled={getLevelStars(popup) >= s} />)}
              </View>
              <View style={st.popupButtons}>
                <Pressable style={[st.popupPlayBtn, { backgroundColor: worldColor }]} onPress={() => {
                  setPopup(null);
                  router.push({ pathname: '/game/side-campaign', params: { levelId: getLevelId(popup), mode: modeId, worldNumber: String(worldNum), levelNumber: String(popup), worldName: wName } });
                }}>
                  <Text style={st.popupPlayText}>Replay</Text>
                </Pressable>
                <Pressable style={[st.popupCloseBtn, { backgroundColor: colors.surface }]} onPress={() => setPopup(null)}>
                  <Text style={[st.popupCloseText, { color: colors.textMid }]}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const LevelNode = React.memo(function LevelNode({ state, levelNum, worldColor, nodeSize, isBoss }: { state: NodeState; levelNum: number; worldColor: string; nodeSize: number; isBoss: boolean }) {
  const br = isBoss ? 16 : nodeSize / 2;
  if (state === 'completed' || state === 'boss-completed') {
    return (
      <View style={[st.nodeCircle, { width: nodeSize, height: nodeSize, borderRadius: br, backgroundColor: worldColor, borderWidth: 2, borderColor: worldColor + '40', shadowColor: worldColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 }]}>
        {isBoss ? <CrownSvg size={18} color="#FFFFFF" filled /> : <Text style={st.completedNum}>{levelNum}</Text>}
      </View>
    );
  }
  if (state === 'current') {
    return (
      <View style={[st.nodeCircle, { width: nodeSize, height: nodeSize, borderRadius: br, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: worldColor, shadowColor: worldColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 }]}>
        <PlayTriangle size={14} color={worldColor} />
      </View>
    );
  }
  if (state === 'near-locked') {
    return (
      <View style={[st.nodeCircle, { width: nodeSize, height: nodeSize, borderRadius: br, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 2, borderColor: 'rgba(0,0,0,0.06)' }]}>
        <Text style={st.lockedNum}>{levelNum}</Text>
      </View>
    );
  }
  if (state === 'boss-locked') {
    return (
      <View style={[st.nodeCircle, { width: nodeSize, height: nodeSize, borderRadius: br, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.04)' }]}>
        <CrownSvg size={18} color="#B2BEC3" />
      </View>
    );
  }
  return (
    <View style={[st.nodeCircle, { width: nodeSize, height: nodeSize, borderRadius: br, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.04)' }]}>
      <LockSvg size={13} />
    </View>
  );
});

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, zIndex: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  backButton: { padding: 12, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  headerPills: { flexDirection: 'row', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 12, fontWeight: '700', color: '#D4A012' },
  scrollArea: { flex: 1 },
  nodeWrapper: { position: 'absolute', alignItems: 'center', minWidth: 48, minHeight: 48 },
  nodeCircle: { alignItems: 'center', justifyContent: 'center' },
  completedNum: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  lockedNum: { fontSize: 14, fontWeight: '700', color: '#B2BEC3' },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 3 },
  playLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  checkpointBadge: { position: 'absolute', top: -22, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  checkpointText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  markerPill: { position: 'absolute', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.8)' },
  markerText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)' },
  bottomInfo: { flex: 1 },
  bottomTitle: { fontSize: 15, fontWeight: '700' },
  bottomSub: { fontSize: 12, marginTop: 2 },
  playButton: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  playButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  popupBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  popupBackdropTouchable: { ...StyleSheet.absoluteFillObject },
  popupCard: { width: '100%', maxWidth: 300, borderRadius: 20, padding: 24, alignItems: 'center' },
  popupCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  popupCircleNum: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  popupTitle: { fontSize: 17, fontWeight: '700' },
  popupSub: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  popupStars: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  popupButtons: { width: '100%', gap: 8, marginTop: 8 },
  popupPlayBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  popupPlayText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  popupCloseBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  popupCloseText: { fontSize: 14, fontWeight: '600' },
});
