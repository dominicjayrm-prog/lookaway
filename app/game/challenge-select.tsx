import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Polygon, Rect, Line } from 'react-native-svg';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { CHALLENGE_MODES, MODE_ORDER, EXCLUSIVE_MODES } from '@/src/data/challengeModes';
import { DIFFICULTY_META, isUserOnline, sendInvite, pickChallengeLevels, type ChallengeDifficulty } from '@/src/utils/challengeFlow';
import { generateSpeedRecallData, generateSnapMatchData, generateSequenceData, generateCountingBlitzData, generateColourChainData } from '@/src/utils/modeGenerators';
import { spacing } from '@/src/theme/spacing';

function ModeIcon({ mode, size = 22, color = '#FFF' }: { mode: string; size?: number; color?: string }) {
  switch (mode) {
    case 'classic': return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={3} y={3} width={8} height={8} rx={2} fill={color} /><Rect x={13} y={3} width={8} height={8} rx={2} fill={color} opacity={0.6} /><Rect x={3} y={13} width={8} height={8} rx={2} fill={color} opacity={0.6} /><Rect x={13} y={13} width={8} height={8} rx={2} fill={color} opacity={0.4} /></Svg>;
    case 'speed_recall': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={2} /><Circle cx={12} cy={12} r={2} fill={color} /><Line x1={12} y1={12} x2={12} y2={6} stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
    case 'snap_match': return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={2} y={4} width={8} height={16} rx={2} fill={color} opacity={0.6} /><Rect x={14} y={4} width={8} height={16} rx={2} fill={color} /><Path d="M10,12 L14,12" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
    case 'sequence': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={5} cy={12} r={3} fill={color} opacity={0.4} /><Circle cx={12} cy={12} r={3} fill={color} opacity={0.7} /><Circle cx={19} cy={12} r={3} fill={color} /><Path d="M8,12 L9,12 M15,12 L16,12" stroke={color} strokeWidth={1.5} /></Svg>;
    case 'counting_blitz': return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={6} cy={8} r={3} fill={color} opacity={0.5} /><Circle cx={16} cy={6} r={2.5} fill={color} opacity={0.7} /><Circle cx={10} cy={16} r={3.5} fill={color} /><Circle cx={19} cy={15} r={2} fill={color} opacity={0.3} /></Svg>;
    case 'colour_chain': return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={2} y={2} width={6} height={6} rx={1} fill={color} /><Rect x={9} y={2} width={6} height={6} rx={1} fill={color} opacity={0.7} /><Rect x={16} y={2} width={6} height={6} rx={1} fill={color} opacity={0.4} /><Rect x={2} y={9} width={6} height={6} rx={1} fill={color} opacity={0.5} /><Rect x={9} y={9} width={6} height={6} rx={1} fill={color} opacity={0.8} /><Rect x={16} y={9} width={6} height={6} rx={1} fill={color} opacity={0.3} /></Svg>;
    default: return null;
  }
}

/** Cross-platform confirm dialog. Alert.alert multi-step chains
 *  are unreliable on RN-web so we fall back to window.confirm there. */
function confirm(title: string, body: string, onConfirm: () => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if ((window as any).confirm?.(`${title}\n\n${body}`)) onConfirm();
    return;
  }
  Alert.alert(title, body, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('challenge.send_anyway'), onPress: onConfirm },
  ]);
}
function notify(title: string, body: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    (window as any).alert?.(`${title}\n\n${body}`);
    return;
  }
  Alert.alert(title, body);
}

function ChallengeSelectScreen() {
  const { friendId, friendUsername } = useLocalSearchParams<{ friendId: string; friendUsername: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState('classic');
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('medium');
  const [friendOnline, setFriendOnline] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const selected = CHALLENGE_MODES[selectedMode];

  // Poll friend's online status every 5s so the CTA accurately
  // reflects whether we'll send a real-time invite or fall back
  // to async. Initial fetch on mount.
  useEffect(() => {
    if (!friendId) return;
    let cancelled = false;
    const check = () => { isUserOnline(friendId).then((on) => { if (!cancelled) setFriendOnline(on); }); };
    check();
    const id = setInterval(check, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [friendId]);

  /** Build the mode-specific shared seed that BOTH players will see.
   *  Classic uses the level_ids pool from their shared campaign pool.
   *  Exclusive modes generate a deterministic blob locally. */
  async function buildSharedSeed(userId: string, targetId: string): Promise<{ modeData: unknown; levelIds: string[] }> {
    if (selectedMode === 'classic') {
      const ids = await pickChallengeLevels(userId, targetId, difficulty);
      return { modeData: { difficulty }, levelIds: ids };
    }
    if (selectedMode === 'speed_recall') return { modeData: generateSpeedRecallData(), levelIds: [] };
    if (selectedMode === 'snap_match') return { modeData: generateSnapMatchData(), levelIds: [] };
    if (selectedMode === 'sequence') return { modeData: generateSequenceData(), levelIds: [] };
    if (selectedMode === 'counting_blitz') return { modeData: generateCountingBlitzData(), levelIds: [] };
    if (selectedMode === 'colour_chain') return { modeData: generateColourChainData(), levelIds: [] };
    return { modeData: {}, levelIds: [] };
  }

  async function startInstantInvite() {
    if (!user?.id || !friendId || sending) return;
    setSending(true);
    try {
      const { modeData, levelIds } = await buildSharedSeed(user.id, friendId);
      if (selectedMode === 'classic' && levelIds.length === 0) {
        notify(t('challenge.cannot_create_title'), t('challenge.cannot_create_body'));
        setSending(false);
        return;
      }
      const id = await sendInvite({
        challengerId: user.id,
        challengedId: friendId,
        mode: selectedMode,
        modeData,
        levelIds,
        difficulty,
      });
      if (!id) {
        notify(t('challenge.could_not_send_title'), t('challenge.could_not_send_body'));
        setSending(false);
        return;
      }
      // Realtime will deliver the INSERT to the invited user's
      // IncomingInviteListener; a separate push is redundant + noisy
      // when both are online, so we skip it for live invites.
      router.replace({ pathname: '/game/challenge-waiting', params: { challengeId: id } });
    } finally {
      setSending(false);
    }
  }

  // (Async fallback removed — challenges are real-time only now.
  // If the friend is offline, handleStart shows an error popup
  // instead of silently creating a pending row that may sit for
  // hours.)

  const handleStart = () => {
    if (friendOnline === true) { startInstantInvite(); return; }
    // Friend isn't online — hard block. The async fallback is
    // disabled by design: the user wants real-time 1v1 only, with
    // a clear error instead of a silently-created pending row.
    // Re-check status on tap so a friend who just came online
    // (between the 5s poll and the tap) still gets through.
    if (friendId) {
      isUserOnline(friendId).then((online) => {
        if (online) { setFriendOnline(true); startInstantInvite(); return; }
        notify(
          '@' + (friendUsername || 'friend') + ' is offline',
          t('challenge.offline_body'),
        );
      });
    } else {
      notify('Friend unavailable', 'Couldn\u2019t find that friend. Go back and pick them again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M15,4 L7,12 L15,20" fill="none" stroke={colors.text} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        </Pressable>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Challenge @{friendUsername || 'friend'}</Text>
          <Text style={[styles.headerSub, { color: colors.textMid }]}>{t('challenge.select_mode')}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Classic — full width */}
        <Pressable
          style={[styles.classicCard, { backgroundColor: CHALLENGE_MODES.classic.color, borderWidth: 3, borderColor: selectedMode === 'classic' ? '#FFF' : 'transparent' }]}
          onPress={() => setSelectedMode('classic')}
        >
          <View style={styles.classicRow}>
            <View style={styles.classicIconBg}><ModeIcon mode="classic" size={24} /></View>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={styles.originalBadge}><Text style={styles.badgeText}>{t('challenge.original')}</Text></View>
              </View>
              <Text style={styles.classicName}>{CHALLENGE_MODES.classic.name}</Text>
              <Text style={styles.classicDesc}>{CHALLENGE_MODES.classic.description}</Text>
            </View>
            {selectedMode === 'classic' && <View style={styles.checkCircle}><Text style={styles.checkMark}>{'\u2713'}</Text></View>}
          </View>
          <Text style={styles.classicMeta}>{CHALLENGE_MODES.classic.roundLabel} · {CHALLENGE_MODES.classic.estimatedTime}</Text>
        </Pressable>

        {/* Difficulty selector — only meaningful for the classic flow,
            which uses level_ids drawn from the campaign pool. Exclusive
            modes generate their own data and don't use worlds. */}
        {selectedMode === 'classic' && (
          <View style={styles.difficultySection}>
            <Text style={[styles.difficultyLabel, { color: colors.textMid }]}>{t('challenge.difficulty')}</Text>
            <View style={styles.difficultyRow}>
              {(Object.keys(DIFFICULTY_META) as ChallengeDifficulty[]).map((d) => {
                const meta = DIFFICULTY_META[d];
                const isActive = difficulty === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDifficulty(d)}
                    style={[
                      styles.difficultyCard,
                      {
                        backgroundColor: isActive ? meta.color + '15' : colors.card,
                        borderColor: isActive ? meta.color : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.difficultyName, { color: isActive ? meta.color : colors.text }]}>{meta.label}</Text>
                    <Text style={[styles.difficultyDesc, { color: isActive ? meta.color : colors.textMid }]} numberOfLines={2}>{meta.description}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textLight }]}>{t('challenge.exclusive_modes')}</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Exclusive modes grid */}
        <View style={styles.grid}>
          {EXCLUSIVE_MODES.map(id => {
            const mode = CHALLENGE_MODES[id];
            const isSelected = selectedMode === id;
            return (
              <Pressable
                key={id}
                style={[styles.modeCard, { backgroundColor: colors.card, borderWidth: 2.5, borderColor: isSelected ? mode.color : 'transparent' }]}
                onPress={() => setSelectedMode(id)}
              >
                <View style={[styles.modeIconBg, { backgroundColor: mode.color }]}>
                  <ModeIcon mode={id} size={20} />
                </View>
                <View style={[styles.exclusiveBadge, { backgroundColor: mode.color + '18' }]}>
                  <Text style={[styles.exclusiveBadgeText, { color: mode.color }]}>{t('challenge.exclusive')}</Text>
                </View>
                <Text style={[styles.modeName, { color: colors.text }]}>{mode.name}</Text>
                <Text style={[styles.modeDesc, { color: colors.textMid }]} numberOfLines={2}>{mode.description}</Text>
                <Text style={[styles.modeMeta, { color: colors.textLight }]}>{mode.roundLabel} · {mode.estimatedTime}</Text>
                {isSelected && <View style={[styles.modeCheck, { backgroundColor: mode.color }]}><Text style={styles.checkMark}>{'\u2713'}</Text></View>}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <View style={styles.bottomPreview}>
          <View style={[styles.bottomIconBg, { backgroundColor: selected.color }]}>
            <ModeIcon mode={selectedMode} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bottomName, { color: colors.text }]}>{selected.name}</Text>
            <Text style={[styles.bottomMeta, { color: colors.textMid }]}>{selected.roundLabel} · {selected.estimatedTime}</Text>
          </View>
          {/* Online indicator. Green pulse if ready for an instant
              invite, grey if we\u2019ll fall back to async. */}
          <View style={[styles.statusPill, { backgroundColor: friendOnline ? '#00B89420' : colors.surface }]}>
            <View style={[styles.statusDot, { backgroundColor: friendOnline ? '#00B894' : colors.textLight }]} />
            <Text style={[styles.statusText, { color: friendOnline ? '#00B894' : colors.textMid }]}>
              {friendOnline === null ? '\u2026' : friendOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <Pressable
          style={[styles.startBtn, { backgroundColor: selected.color, opacity: sending ? 0.6 : 1 }]}
          onPress={handleStart}
          disabled={sending}
          accessibilityRole="button"
          accessibilityLabel={friendOnline ? 'Send instant challenge invite' : 'Friend is offline — cannot challenge'}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.startBtnText}>
              {friendOnline ? 'Invite to 1v1' : 'Friend is offline'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default ChallengeSelectScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120 },

  // Classic card
  classicCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  classicRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  classicIconBg: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', marginBottom: 4 },
  originalBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  classicName: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  classicDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  classicMeta: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 10 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#FFF', fontSize: 14, fontWeight: '800' },

  // Difficulty picker
  difficultySection: { marginTop: 4, marginBottom: 8 },
  difficultyLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
  difficultyRow: { flexDirection: 'row', gap: 8 },
  difficultyCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 76,
    justifyContent: 'center',
  },
  difficultyName: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  difficultyDesc: { fontSize: 9, textAlign: 'center', lineHeight: 12 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  // Mode grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeCard: { flexBasis: '47%', flexGrow: 1, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, position: 'relative' },
  modeIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  exclusiveBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 4 },
  exclusiveBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  modeName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  modeDesc: { fontSize: 11, lineHeight: 14, marginBottom: 6 },
  modeMeta: { fontSize: 10, fontWeight: '600' },
  modeCheck: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  // Bottom bar
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, borderTopWidth: 1 },
  bottomPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  bottomIconBg: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bottomName: { fontSize: 14, fontWeight: '700' },
  bottomMeta: { fontSize: 11, marginTop: 1 },
  startBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  startBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
