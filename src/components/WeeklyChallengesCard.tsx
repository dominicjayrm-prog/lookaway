/**
 * WeeklyChallengesCard — 3 rotating weekly goals with gem rewards.
 * Rendered on the Play tab home screen.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import {
  getWeeklyChallenges,
  claimWeeklyReward,
  getTimeUntilReset,
  type WeeklyChallengeState,
  type WeeklyGoal,
} from '@/src/utils/weeklyChallenges';

function WeeklyChallengesCard() {
  const { colors } = useTheme();
  const addGems = useGameStore(s => s.addGems);
  const [state, setState] = useState<WeeklyChallengeState | null>(null);
  const [resetTimer, setResetTimer] = useState('');

  const load = useCallback(async () => {
    const s = await getWeeklyChallenges();
    setState(s);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Update reset timer every minute
  useEffect(() => {
    function updateTimer() {
      const t = getTimeUntilReset();
      if (t.days > 0) setResetTimer(`${t.days}d ${t.hours}h`);
      else if (t.hours > 0) setResetTimer(`${t.hours}h ${t.minutes}m`);
      else setResetTimer(`${t.minutes}m`);
    }
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleClaim = useCallback(async (goalId: string) => {
    const gems = await claimWeeklyReward(goalId);
    if (gems > 0) {
      addGems(gems);
      load(); // Refresh state to show claimed status
    }
  }, [addGems, load]);

  if (!state) return null;

  const completedCount = state.goals.filter(g => {
    const progress = state.progress[g.trackingKey] ?? 0;
    return progress >= g.target;
  }).length;
  const allClaimed = state.goals.every(g => state.claimed[g.id]);

  return (
    <View style={[st.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <View style={[st.headerIconBg, { backgroundColor: colors.blueSoft }]}>
            <Ionicons name="trophy-outline" size={15} color={colors.blue} />
          </View>
          <View>
            <Text style={[st.headerTitle, { color: colors.text }]}>Weekly challenges</Text>
            <Text style={[st.headerSub, { color: colors.textMid }]}>
              {completedCount}/3 done {allClaimed ? '' : `\u00B7 Resets in ${resetTimer}`}
            </Text>
          </View>
        </View>
        {allClaimed && (
          <View style={[st.completedBadge, { backgroundColor: colors.correctSoft }]}>
            <Text style={[st.completedText, { color: colors.correct }]}>Done!</Text>
          </View>
        )}
      </View>

      {/* Goals */}
      {state.goals.map((goal, i) => (
        <GoalRow
          key={goal.id}
          goal={goal}
          progress={state.progress[goal.trackingKey] ?? 0}
          claimed={state.claimed[goal.id] ?? false}
          colors={colors}
          onClaim={handleClaim}
          isLast={i === state.goals.length - 1}
        />
      ))}
    </View>
  );
}

interface GoalRowProps {
  goal: WeeklyGoal;
  progress: number;
  claimed: boolean;
  colors: Record<string, string>;
  onClaim: (goalId: string) => void;
  isLast: boolean;
}

function GoalRow({ goal, progress, claimed, colors, onClaim, isLast }: GoalRowProps) {
  const clamped = Math.min(progress, goal.target);
  const pct = goal.target > 0 ? (clamped / goal.target) * 100 : 0;
  const isComplete = clamped >= goal.target;

  return (
    <View style={[st.goalRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={st.goalIcon}>{goal.icon}</Text>
      <View style={st.goalContent}>
        <View style={st.goalTitleRow}>
          <Text style={[st.goalTitle, { color: colors.text }]} numberOfLines={1}>{goal.description}</Text>
          <View style={st.rewardPill}>
            <Ionicons name="diamond" size={10} color={colors.gold} />
            <Text style={[st.rewardText, { color: colors.gold }]}>{goal.reward}</Text>
          </View>
        </View>
        {/* Progress bar */}
        <View style={[st.progressTrack, { backgroundColor: colors.surface }]}>
          <View style={[st.progressFill, {
            width: `${pct}%`,
            backgroundColor: isComplete ? colors.correct : colors.accent,
          }]} />
        </View>
        <View style={st.goalBottomRow}>
          <Text style={[st.progressText, { color: colors.textLight }]}>
            {clamped}/{goal.target}
          </Text>
          {isComplete && !claimed && (
            <Pressable
              style={({ pressed }) => [st.claimBtn, { backgroundColor: colors.correct }, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
              onPress={() => onClaim(goal.id)}
            >
              <Text style={st.claimBtnText}>Claim</Text>
            </Pressable>
          )}
          {claimed && (
            <View style={[st.claimedBadge, { backgroundColor: colors.correctSoft }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.correct} />
              <Text style={[st.claimedText, { color: colors.correct }]}>Claimed</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default WeeklyChallengesCard;

const st = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBg: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 11, marginTop: 1 },
  completedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  completedText: { fontSize: 11, fontWeight: '700' },

  goalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  goalIcon: { fontSize: 20, marginTop: 2 },
  goalContent: { flex: 1 },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  goalTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
  rewardPill: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 8 },
  rewardText: { fontSize: 11, fontWeight: '700' },

  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  goalBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  progressText: { fontSize: 10, fontWeight: '600' },

  claimBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999 },
  claimBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },

  claimedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  claimedText: { fontSize: 10, fontWeight: '700' },
});
