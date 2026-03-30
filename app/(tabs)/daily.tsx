import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TabTransition } from '@/src/components/TabTransition';
import { useGameStore } from '@/src/store';
import { useTheme } from '@/src/providers/ThemeProvider';
import { spacing, borderRadius } from '@/src/theme/spacing';
import { getTodayMode, MODE_INFO, getWeekSchedule } from '@/src/types/daily';
import type { DailyMode } from '@/src/types/daily';
import Svg, { Rect, Path, Circle, Line, Polygon } from 'react-native-svg';

const MILESTONES = [
  { days: 3, gems: 5, label: '5 gems' },
  { days: 7, gems: 15, label: '15 gems' },
  { days: 14, gems: 30, label: '30 gems' },
  { days: 30, gems: 50, label: '50 gems' },
  { days: 60, gems: 100, label: '100 gems' },
  { days: 100, gems: 200, label: '200 gems' },
];
const MODE_ROUTES: Record<DailyMode, string> = { classic: '/game/daily', speed: '/game/speed', spot_the_change: '/game/spot' };
const MODE_SCENE_TEXT: Record<DailyMode, string> = { classic: '5 scenes', speed: '10 scenes', spot_the_change: '5 rounds' };
const FIRE = '\u{1F525}';
const GEM = '\u{1F48E}';

// Mode SVG icons
function ClassicIcon({ size = 18, color = '#6C5CE7' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={4} y={4} width={7} height={7} rx={2} fill={color} /><Rect x={13} y={4} width={7} height={7} rx={2} fill={color} opacity={0.6} /><Rect x={4} y={13} width={7} height={7} rx={2} fill={color} opacity={0.6} /><Rect x={13} y={13} width={7} height={7} rx={2} fill={color} opacity={0.4} /></Svg>;
}
function SpeedIcon({ size = 18, color = '#F9A825' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M13,2 L4,14 H11 L10,22 L20,10 H13 Z" fill={color} /></Svg>;
}
function SpotIcon({ size = 18, color = '#0984E3' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle cx={10} cy={10} r={7} fill="none" stroke={color} strokeWidth={2.5} /><Line x1={15} y1={15} x2={21} y2={21} stroke={color} strokeWidth={2.5} strokeLinecap="round" /></Svg>;
}
function getModeIcon(mode: DailyMode, size = 18) {
  if (mode === 'classic') return <ClassicIcon size={size} />;
  if (mode === 'speed') return <SpeedIcon size={size} />;
  return <SpotIcon size={size} />;
}

function LockIcon({ size = 14, color = '#B2BEC3' }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Rect x={5} y={11} width={14} height={11} rx={2} fill={color} /><Path d="M8,11 V8 A4,4 0 0,1 16,8 V11" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
}

export default function DailyTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { streakCount } = useGameStore();
  const todayMode = getTodayMode();
  const modeInfo = MODE_INFO[todayMode];
  const weekSchedule = getWeekSchedule();
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <TabTransition>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: colors.text }]}>Daily Challenge</Text>
            <Text style={[styles.date, { color: colors.textMid }]}>{todayFormatted}</Text>
          </View>
          <View style={[styles.streakPill, { backgroundColor: colors.goldSoft }]}>
            <Text style={styles.streakIcon}>{FIRE}</Text>
            <Text style={[styles.streakCount, { color: streakCount > 0 ? colors.gold : colors.textLight }]}>{streakCount}</Text>
          </View>
        </View>

        {/* Mode card */}
        <View style={[styles.modeCard, { backgroundColor: colors.card }]}>
          <View style={styles.modeRow}>
            <View style={[styles.modeIconBg, { backgroundColor: colors.accentSoft }]}>
              {getModeIcon(todayMode, 24)}
            </View>
            <View style={styles.modeTextContainer}>
              <Text style={[styles.modeName, { color: colors.text }]}>{modeInfo.name}</Text>
              <Text style={[styles.modeDescription, { color: colors.textMid }]}>{modeInfo.description}</Text>
            </View>
          </View>
        </View>

        {/* Start button with scene count */}
        <Pressable
          style={[styles.startButton, { backgroundColor: colors.accent }]}
          onPress={() => router.push(MODE_ROUTES[todayMode] as any)}
        >
          <Text style={styles.startButtonText}>Start {modeInfo.name} — {MODE_SCENE_TEXT[todayMode]}</Text>
        </Pressable>

        {/* This week */}
        <View style={styles.weekSection}>
          <Text style={[styles.weekTitle, { color: colors.text }]}>This week</Text>
          <View style={styles.weekRow}>
            {weekSchedule.map((day) => {
              const isPast = day.date < today && !day.isToday;
              const isFuture = day.date > today;
              return (
                <View key={day.dayShort} style={[
                  styles.dayCard,
                  { backgroundColor: colors.card },
                  day.isToday && { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft },
                  isPast && { opacity: 0.45 },
                  isFuture && { opacity: 0.55 },
                ]}>
                  <Text style={[styles.dayName, { color: colors.textMid }, day.isToday && { color: colors.accent }]}>{day.dayShort}</Text>
                  <View style={{ marginTop: 2 }}>
                    {getModeIcon(day.mode, 16)}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Streak milestones */}
        <View style={[styles.milestonesCard, { backgroundColor: colors.card }]}>
          <View style={styles.milestonesTitleRow}>
            <Text style={[styles.milestonesTitle, { color: colors.text }]}>Streak milestones</Text>
            <View style={styles.milestonesStreakMini}>
              <Text style={{ fontSize: 12 }}>{FIRE}</Text>
              <Text style={[styles.milestonesStreakMiniText, { color: colors.textMid }]}>{streakCount} / {MILESTONES.length}</Text>
            </View>
          </View>
          {MILESTONES.map((m, i) => {
            const done = streakCount >= m.days;
            const progressToThis = Math.min(streakCount / m.days, 1);
            return (
              <React.Fragment key={m.days}>
                {i > 0 && (
                  <View style={styles.connectorContainer}>
                    <View style={[styles.connectorTrack, { backgroundColor: colors.border }]}>
                      <View style={[styles.connectorFill, { width: `${Math.round(progressToThis * 100)}%`, backgroundColor: done ? colors.correct : colors.accent }]} />
                    </View>
                  </View>
                )}
                <View style={styles.milestoneRow}>
                  <View style={styles.milestoneDaysContainer}>
                    <Text style={[styles.milestoneDays, { color: done ? colors.correct : colors.text, fontWeight: done ? '800' : '700' }]}>{m.days}</Text>
                    <Text style={[styles.milestoneDaysLabel, { color: colors.textMid }]}>days</Text>
                  </View>
                  <View style={styles.milestoneRewardContainer}>
                    <Text style={{ fontSize: 16, opacity: done ? 1 : 0.4 }}>{GEM}</Text>
                    <Text style={[styles.milestoneReward, { color: done ? colors.gold : colors.textLight }]}>{m.label}</Text>
                  </View>
                  {done ? (
                    <View style={[styles.completedBadge, { backgroundColor: colors.correctSoft }]}>
                      <Ionicons name="checkmark" size={14} color={colors.correct} />
                    </View>
                  ) : (
                    <View style={styles.lockedBadge}><LockIcon size={14} color={colors.textLight} /></View>
                  )}
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
    </TabTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 20, paddingBottom: 24 },
  headerLeft: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  date: { fontSize: 14, marginTop: 6 },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 2 },
  streakIcon: { fontSize: 16 },
  streakCount: { fontSize: 16, fontWeight: '700' },

  modeCard: { borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  modeIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modeTextContainer: { flex: 1 },
  modeName: { fontSize: 18, fontWeight: '700' },
  modeDescription: { fontSize: 13, marginTop: 2 },

  startButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 24, shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 4 },
  startButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  weekSection: { marginBottom: 24 },
  weekTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  dayCard: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  dayName: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },

  milestonesCard: { borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  milestonesTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  milestonesTitle: { fontSize: 16, fontWeight: '700' },
  milestonesStreakMini: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  milestonesStreakMiniText: { fontSize: 12, fontWeight: '600' },

  connectorContainer: { paddingHorizontal: 20, marginVertical: 2 },
  connectorTrack: { height: 2, borderRadius: 1, overflow: 'hidden' },
  connectorFill: { height: '100%', borderRadius: 1 },

  milestoneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  milestoneDaysContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4, width: 80 },
  milestoneDays: { fontSize: 24 },
  milestoneDaysLabel: { fontSize: 12, fontWeight: '500' },
  milestoneRewardContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  milestoneReward: { fontSize: 14, fontWeight: '600' },
  completedBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  lockedBadge: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
});
