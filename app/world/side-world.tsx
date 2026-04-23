import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { t } from '@/src/i18n';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, Modal, Animated as RNAnimated } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Polygon } from 'react-native-svg';
import { OutOfLivesModal } from '@/src/components/OutOfLivesModal';
import SubscriptionPaywall from '@/src/components/SubscriptionPaywall';
import { useTheme } from '@/src/providers/ThemeProvider';
import { supabase } from '@/src/lib/supabase';
import { useGameStore } from '@/src/store';
import { CAMPAIGNS } from '@/src/data/campaigns';
import { generatePath, getGeneratedMapHeight, buildPathD, getCheckpoint } from '@/src/data/worldPaths';

var MAP_W = Math.min(Dimensions.get('window').width, 430);
// START/FINISH pill wrapper is a fixed-width View centred under the level
// node, so the text aligns with the node regardless of pill width.
var MARKER_ANCHOR_WIDTH = 160;
var MARKER_ANCHOR_HALF = MARKER_ANCHOR_WIDTH / 2;
var PREFIXES: Record<string, string> = { speed_recall: 'sr', snap_match: 'sm', sequence: 'seq', counting_blitz: 'cb', colour_chain: 'cc' };

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

function getNodeState(num: number, done: number, total: number) {
  var boss = num === total;
  if (num <= done) return boss ? 'boss-completed' : 'completed';
  if (num === done + 1) return 'current';
  if (boss) return 'boss-locked';
  if (num <= done + 4) return 'near-locked';
  return 'far-locked';
}

function renderNode(state: string, num: number, wc: string, sz: number, boss: boolean) {
  var br = boss ? 16 : sz / 2;
  if (state === 'completed' || state === 'boss-completed') {
    return <View style={[st.nodeCircle, { width: sz, height: sz, borderRadius: br, backgroundColor: wc, borderWidth: 2, borderColor: wc + '40', shadowColor: wc, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 }]}>{boss ? <CrownSvg size={18} color="#FFFFFF" filled /> : <Text style={st.completedNum}>{num}</Text>}</View>;
  }
  if (state === 'current') {
    return <View style={[st.nodeCircle, { width: sz, height: sz, borderRadius: br, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: wc, shadowColor: wc, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 }]}><PlayTriangle size={14} color={wc} /></View>;
  }
  if (state === 'near-locked') {
    return <View style={[st.nodeCircle, { width: sz, height: sz, borderRadius: br, backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 2, borderColor: 'rgba(0,0,0,0.06)' }]}><Text style={st.lockedNum}>{num}</Text></View>;
  }
  return <View style={[st.nodeCircle, { width: sz, height: sz, borderRadius: br, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.04)' }]}>{boss ? <CrownSvg size={18} color="#B2BEC3" /> : <LockSvg size={13} />}</View>;
}

/** Animation hook — keeps animated values in their own scope to avoid minifier name collisions */
function useMapAnims(nodeCount: number) {
  var header = useRef(new RNAnimated.Value(0)).current;
  var bottom = useRef(new RNAnimated.Value(0)).current;
  var pathLine = useRef(new RNAnimated.Value(0)).current;
  var nodes = useRef(Array.from({ length: nodeCount }, () => new RNAnimated.Value(0))).current;

  useEffect(() => {
    RNAnimated.timing(header, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    RNAnimated.timing(pathLine, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }).start();
    RNAnimated.parallel(nodes.map((n, i) => RNAnimated.timing(n, { toValue: 1, duration: 350, delay: 300 + (nodeCount - 1 - i) * 40, useNativeDriver: true }))).start();
    RNAnimated.timing(bottom, { toValue: 1, duration: 400, delay: 250, useNativeDriver: true }).start();
  }, []);

  return { header, bottom, pathLine, nodes };
}

function SideWorldMap() {
  var params = useLocalSearchParams<{ mode: string; worldNumber: string; worldName: string }>();
  var router = useRouter();
  var themeColors = useTheme().colors;
  var safeArea = useSafeAreaInsets();
  var scrollRef = useRef<ScrollView>(null);

  var modeId = params.mode ?? 'speed_recall';
  var worldNum = parseInt(params.worldNumber ?? '1', 10);
  var wName = params.worldName ?? 'World';
  var campaign = CAMPAIGNS[modeId];
  var worldColor = campaign?.color ?? '#6C5CE7';
  var totalLevels = campaign?.levelsPerWorld?.[worldNum - 1] ?? 15;
  var prefix = PREFIXES[modeId] ?? modeId;
  var totalWorlds = campaign?.worldCount ?? 3;

  var [mapWidth, setMapWidth] = useState(MAP_W);
  var [popup, setPopup] = useState<number | null>(null);
  var [showOutOfLives, setShowOutOfLives] = useState(false);
  var [showPaywall, setShowPaywall] = useState(false);
  var [progress, setProgress] = useState<Record<string, { stars: number; best_score: number }>>({});

  var path = useMemo(() => generatePath(totalLevels, worldNum + modeId.length), [totalLevels, worldNum, modeId]);
  var mapHeight = useMemo(() => getGeneratedMapHeight(path), [path]);
  var anims = useMapAnims(path.length);

  // Re-fetch progress every time this screen comes into focus (including returning from a game)
  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        var sess = await supabase.auth.getSession();
        var uid = sess.data?.session?.user?.id;
        if (!uid) return;
        var res = await supabase.from('side_campaign_progress').select('level_id, stars, best_score').eq('user_id', uid).like('level_id', `${prefix}_w${worldNum}_%`);
        if (res.data) {
          var p: Record<string, { stars: number; best_score: number }> = {};
          res.data.forEach(r => { p[r.level_id] = { stars: r.stars, best_score: r.best_score }; });
          setProgress(p);
        }
      } catch {}
    })();
  }, [prefix, worldNum]));

  function lid(n: number) { return `${prefix}_w${worldNum}_l${n}`; }
  function starCount(n: number) { return progress[lid(n)]?.stars ?? 0; }

  var completedUpTo = useMemo(() => {
    var c = 0;
    for (var i = 1; i <= totalLevels; i++) { if (progress[lid(i)]?.stars > 0) c = i; else break; }
    return c;
  }, [progress, totalLevels, prefix, worldNum]);

  var currentLevel = completedUpTo + 1;
  var earnedStars = useMemo(() => {
    var s = 0;
    for (var i = 1; i <= totalLevels; i++) s += starCount(i);
    return s;
  }, [progress, totalLevels]);

  useEffect(() => {
    if (path.length === 0) return;
    var idx = Math.min(currentLevel - 1, path.length - 1);
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, path[idx].y - 350), animated: false }), 100);
  }, [currentLevel, path]);

  function goToLevel(n: number) {
    useGameStore.getState().checkLifeRegen();
    if (useGameStore.getState().lives <= 0) { setShowOutOfLives(true); return; }
    router.push({ pathname: '/game/side-campaign', params: { levelId: lid(n), mode: modeId, worldNumber: String(worldNum), levelNumber: String(n), worldName: wName } });
  }
  function onNodeTap(n: number) {
    var s = getNodeState(n, completedUpTo, totalLevels);
    if (s === 'completed' || s === 'boss-completed') { setPopup(n); return; }
    if (s === 'current') goToLevel(n);
  }

  return (
    <View style={[st.root, { backgroundColor: themeColors.bg }]}>
      {/* Header */}
      <RNAnimated.View style={[st.header, { paddingTop: safeArea.top + 8, backgroundColor: themeColors.bg, opacity: anims.header, transform: [{ translateY: anims.header.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
        <Pressable onPress={() => router.back()} style={st.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M15,4 L7,12 L15,20" fill="none" stroke={themeColors.text} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Pressable>
        <View style={st.headerCenter}>
          <Text style={[st.headerTitle, { color: themeColors.text }]}>{wName}</Text>
          <Text style={[st.headerSubtitle, { color: worldColor }]}>{t('world_map.mode_world_of_count', { mode: campaign?.name ?? '', world: worldNum, total: totalWorlds })}</Text>
        </View>
        <View style={st.headerPills}>
          <View style={[st.pill, { backgroundColor: 'rgba(212,160,18,0.1)' }]}>
            <StarSvg size={12} filled color="#D4A012" />
            <Text style={st.pillText}>{earnedStars}/{totalLevels * 3}</Text>
          </View>
          <View style={[st.pill, { backgroundColor: worldColor + '15' }]}>
            <Text style={[st.pillText, { color: worldColor }]}>{completedUpTo}/{totalLevels}</Text>
          </View>
        </View>
      </RNAnimated.View>

      {/* Map */}
      <ScrollView ref={scrollRef} style={st.scrollArea} contentContainerStyle={{ height: mapHeight + 100 }} showsVerticalScrollIndicator={false} onLayout={(e) => setMapWidth(Math.min(e.nativeEvent.layout.width, 430))}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: themeColors.bg }]} />

        <RNAnimated.View style={{ ...StyleSheet.absoluteFillObject, opacity: anims.pathLine }}>
          <Svg style={StyleSheet.absoluteFill} width={mapWidth} height={mapHeight + 100}>
            {completedUpTo > 0 && <Path d={buildPathD(path, 0, Math.min(completedUpTo - 1, path.length - 1), mapWidth)} stroke={worldColor} strokeWidth={28} strokeOpacity={0.1} fill="none" strokeLinecap="round" />}
            {completedUpTo > 0 && <Path d={buildPathD(path, 0, Math.min(completedUpTo - 1, path.length - 1), mapWidth)} stroke={worldColor} strokeWidth={6} fill="none" strokeLinecap="round" />}
            {completedUpTo < path.length && <Path d={buildPathD(path, Math.max(0, completedUpTo - 1), path.length - 1, mapWidth)} stroke="rgba(0,0,0,0.08)" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="10,8" />}
          </Svg>
        </RNAnimated.View>

        {path.map((pos, idx) => {
          var levelNum = idx + 1;
          var state = getNodeState(levelNum, completedUpTo, totalLevels);
          var stars = starCount(levelNum);
          var checkpoint = getCheckpoint(levelNum, totalLevels);
          var isBoss = levelNum === totalLevels;
          var nodeSize = isBoss ? 56 : checkpoint ? 48 : 42;
          var px = (pos.x / 100) * mapWidth - nodeSize / 2;
          var anim = anims.nodes[idx];
          return (
            <RNAnimated.View key={levelNum} style={[st.nodeWrapper, { left: px, top: pos.y - nodeSize / 2, width: nodeSize, height: nodeSize + 30, opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }, { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) }] }]}>
              <Pressable onPress={() => onNodeTap(levelNum)} style={{ alignItems: 'center' }}>
                {checkpoint && <View style={[st.checkpointBadge, { backgroundColor: state === 'completed' || state === 'boss-completed' ? worldColor + '15' : 'rgba(0,0,0,0.04)' }]}><Text style={[st.checkpointText, { color: state === 'completed' || state === 'boss-completed' ? worldColor : '#B2BEC3' }]}>{checkpoint}</Text></View>}
                {isBoss && <View style={[st.checkpointBadge, { backgroundColor: state === 'boss-completed' ? 'rgba(212,160,18,0.1)' : 'rgba(0,0,0,0.04)' }]}><Text style={[st.checkpointText, { color: state === 'boss-completed' ? '#D4A012' : '#B2BEC3' }]}>{t('world_map.finale_marker')}</Text></View>}
                {renderNode(state, levelNum, worldColor, nodeSize, isBoss)}
                {(state === 'completed' || state === 'boss-completed') && <View style={[st.starsRow, stars === 3 && { shadowColor: '#D4A012', shadowOpacity: 0.4, shadowRadius: 4, elevation: 2 }]}>{[1, 2, 3].map(s => <StarSvg key={s} size={13} filled={stars >= s} />)}</View>}
                {state === 'current' && <Text style={[st.playLabel, { color: worldColor }]}>{t('world_map.play_label')}</Text>}
              </Pressable>
            </RNAnimated.View>
          );
        })}

        {/* START marker — anchored under level 1, not the map centre */}
        <View
          style={[
            st.markerAnchor,
            {
              top: (path[0]?.y ?? 2050) + 60,
              left: ((path[0]?.x ?? 50) / 100) * mapWidth - MARKER_ANCHOR_HALF,
            },
          ]}
          pointerEvents="none"
        >
          <View style={st.markerPill}>
            <Text style={[st.markerText, { color: worldColor }]}>{t('world_map.start_marker')}</Text>
          </View>
        </View>
        {/* FINISH marker — anchored under the final level */}
        <View
          style={[
            st.markerAnchor,
            {
              top: (path[path.length - 1]?.y ?? 250) - 50,
              left: ((path[path.length - 1]?.x ?? 50) / 100) * mapWidth - MARKER_ANCHOR_HALF,
            },
          ]}
          pointerEvents="none"
        >
          <View style={st.markerPill}>
            <Text style={[st.markerText, { color: completedUpTo >= totalLevels ? '#D4A012' : '#B2BEC3' }]}>{completedUpTo >= totalLevels
              ? t('world_map.complete_badge')
              : worldNum < totalWorlds
                ? t('world_map.next_world_awaits', { next: worldNum + 1 })
                : t('world_map.summit')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <RNAnimated.View style={[st.bottomBar, { paddingBottom: Math.max(safeArea.bottom, 16), backgroundColor: themeColors.bg, opacity: anims.bottom, transform: [{ translateY: anims.bottom.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
        <View style={st.bottomInfo}>
          <Text style={[st.bottomTitle, { color: themeColors.text }]}>{t('world_map.level_prefix', { number: currentLevel })}</Text>
          <Text style={[st.bottomSub, { color: themeColors.textMid }]}>{currentLevel <= totalLevels ? t('world_map.tap_to_play') : t('world_map.world_complete_footer')}</Text>
        </View>
        {currentLevel <= totalLevels && <Pressable style={[st.playButton, { backgroundColor: worldColor }]} onPress={() => goToLevel(currentLevel)}><Text style={st.playButtonText}>{t('world_map.play')}</Text></Pressable>}
      </RNAnimated.View>

      {/* Popup */}
      {popup !== null && (() => {
        // Capture into a local so the inner arrow functions don't lose
        // narrowing — TypeScript can't follow `popup !== null` across the
        // JSX boundary into the map / onPress callbacks.
        const popupLevel = popup;
        return (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPopup(null)}>
          <View style={st.popupBackdrop}>
            <Pressable style={st.popupBackdropTouch} onPress={() => setPopup(null)} />
            <View style={[st.popupCard, { backgroundColor: themeColors.card }]}>
              <View style={[st.popupCircle, { backgroundColor: worldColor }]}><Text style={st.popupCircleNum}>{popupLevel}</Text></View>
              <Text style={[st.popupTitle, { color: themeColors.text }]}>Level {popupLevel}</Text>
              <Text style={[st.popupSub, { color: themeColors.textMid }]}>{campaign?.name} — {wName}</Text>
              <View style={st.popupStars}>{[1, 2, 3].map(s => <StarSvg key={s} size={24} filled={starCount(popupLevel) >= s} />)}</View>
              <View style={st.popupButtons}>
                <Pressable style={[st.popupPlayBtn, { backgroundColor: worldColor }]} onPress={() => { setPopup(null); goToLevel(popupLevel); }}><Text style={st.popupPlayText}>{t('world_map.replay')}</Text></Pressable>
                <Pressable style={[st.popupCloseBtn, { backgroundColor: themeColors.surface }]} onPress={() => setPopup(null)}><Text style={[st.popupCloseText, { color: themeColors.textMid }]}>{t('world_map.close')}</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>
        );
      })()}
      <OutOfLivesModal
        visible={showOutOfLives}
        onClose={() => setShowOutOfLives(false)}
        onGoToShop={() => { setShowOutOfLives(false); router.push('/(tabs)/shop'); }}
        onGoToBlankedPlus={() => { setShowOutOfLives(false); setShowPaywall(true); }}
      />
      <SubscriptionPaywall visible={showPaywall} onDismiss={() => setShowPaywall(false)} onSubscribe={() => setShowPaywall(false)} />
    </View>
  );
}

export default SideWorldMap;

var st = StyleSheet.create({
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
  markerAnchor: { position: 'absolute', width: 160, alignItems: 'center' },
  markerPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.8)' },
  markerText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.04)' },
  bottomInfo: { flex: 1 },
  bottomTitle: { fontSize: 15, fontWeight: '700' },
  bottomSub: { fontSize: 12, marginTop: 2 },
  playButton: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  playButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  popupBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  popupBackdropTouch: { ...StyleSheet.absoluteFillObject },
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
