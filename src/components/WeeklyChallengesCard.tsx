/**
 * WeeklyChallengesCard — 3 rotating weekly goals with gem rewards.
 * Rendered on the Play tab home screen.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { t } from '@/src/i18n';
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

/** Map a WeeklyGoal id to its translation keys. The goal records are
 *  persisted to AsyncStorage with their English title/description burned
 *  in, so we resolve localised copy at render time via this table. */
const WEEKLY_KEY_MAP: Record<string, { titleKey: string; descKey: string }> = {
  challenge_friend:     { titleKey: 'weekly.challenge_friend_title',    descKey: 'weekly.challenge_friend_desc' },
  play_5_days:          { titleKey: 'weekly.play_5_days_title',         descKey: 'weekly.play_5_days_desc' },
  play_every_day:       { titleKey: 'weekly.play_every_day_title',      descKey: 'weekly.play_every_day_desc' },
  play_3_modes:         { titleKey: 'weekly.three_modes_title',         descKey: 'weekly.three_modes_desc' },
  complete_15_levels:   { titleKey: 'weekly.complete_15_title',         descKey: 'weekly.complete_15_desc' },
  complete_25_levels:   { titleKey: 'weekly.complete_25_title',         descKey: 'weekly.complete_25_desc' },
  correct_streak_5:     { titleKey: 'weekly.streak_5_title',            descKey: 'weekly.streak_5_desc' },
  earn_25_stars:        { titleKey: 'weekly.earn_25_stars_title',       descKey: 'weekly.earn_25_stars_desc' },
  answer_75_correct:    { titleKey: 'weekly.answer_75_title',           descKey: 'weekly.answer_75_desc' },
  no_powerups_10:       { titleKey: 'weekly.no_powerups_title',         descKey: 'weekly.no_powerups_desc' },
  no_life_loss_5:       { titleKey: 'weekly.no_life_loss_title',        descKey: 'weekly.no_life_loss_desc' },
  perfect_3_levels:     { titleKey: 'weekly.perfect_3_title',           descKey: 'weekly.perfect_3_desc' },
  improve_5_stars:      { titleKey: 'weekly.improve_stars_5_title',     descKey: 'weekly.improve_stars_5_desc' },
  speed_accuracy_10:    { titleKey: 'weekly.fast_10_title',             descKey: 'weekly.fast_10_desc' },
  flawless_3:           { titleKey: 'weekly.flawless_3_title',          descKey: 'weekly.flawless_3_desc' },
  score_95_on_5:        { titleKey: 'weekly.score_95_5_title',          descKey: 'weekly.score_95_5_desc' },
  correct_streak_20:    { titleKey: 'weekly.streak_20_title',           descKey: 'weekly.streak_20_desc' },
  endurance_8:          { titleKey: 'weekly.endurance_8_title',         descKey: 'weekly.endurance_8_desc' },
};

function localisedTitle(goal: WeeklyGoal): string {
  const m = WEEKLY_KEY_MAP[goal.id];
  return m ? t(m.titleKey) : goal.title;
}

function WeeklyChallengesCard() {
  const { colors } = useTheme();
  const addGems = useGameStore(s => s.addGems);
  const levelProgress = useGameStore(s => s.levelProgress);
  const [state, setState] = useState<WeeklyChallengeState | null>(null);
  const [resetTimer, setResetTimer] = useState('');

  const load = useCallback(async () => {
    // Pass levelProgress so the selector can determine unlocked modes
    // when generating this week's challenges on a fresh rollover.
    const s = await getWeeklyChallenges(levelProgress);
    setState(s);
  }, [levelProgress]);

  useEffect(() => {
    load();
  }, [load]);

  // Update reset timer every minute
  useEffect(() => {
    function updateTimer() {
      const tm = getTimeUntilReset();
      if (tm.days > 0) setResetTimer(`${tm.days}${t('common.day_short')} ${tm.hours}${t('common.hour_short')}`);
      else if (tm.hours > 0) setResetTimer(`${tm.hours}${t('common.hour_short')} ${tm.minutes}${t('common.minute_short')}`);
      else setResetTimer(`${tm.minutes}${t('common.minute_short')}`);
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
            <Text style={[st.headerTitle, { color: colors.text }]}>{t('modals.weekly_challenges')}</Text>
            <Text style={[st.headerSub, { color: colors.textMid }]}>
              {t('common.done_count', { count: completedCount, total: 3 })}{allClaimed ? '' : ` \u00B7 ${t('common.resets_in', { time: resetTimer })}`}
            </Text>
          </View>
        </View>
        {allClaimed && (
          <View style={[st.completedBadge, { backgroundColor: colors.correctSoft }]}>
            <Text style={[st.completedText, { color: colors.correct }]}>{t('modals.weekly_done')}</Text>
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

/** Map a WeeklyGoal category to its accent colour. Used to tint the
 *  progress bar + the reward pill so the three difficulty tiers are
 *  visually distinct at a glance. */
function categoryColor(category: string | undefined, colors: Record<string, string>): string {
  if (category === 'engagement') return colors.blue;
  if (category === 'consistency') return colors.accent;
  if (category === 'skill') return colors.gold;
  return colors.accent;
}

function GoalRow({ goal, progress, claimed, colors, onClaim, isLast }: GoalRowProps) {
  const clamped = Math.min(progress, goal.target);
  const pct = goal.target > 0 ? (clamped / goal.target) * 100 : 0;
  const isComplete = clamped >= goal.target;
  const tint = categoryColor(goal.category, colors);

  return (
    <View style={[st.goalRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[st.goalIconWrap, { backgroundColor: tint + '15' }]}>
        <Text style={st.goalEmoji}>{goal.icon}</Text>
      </View>
      <View style={st.goalContent}>
        <View style={st.goalTitleRow}>
          <Text style={[st.goalTitle, { color: colors.text }]} numberOfLines={1}>{localisedTitle(goal)}</Text>
          <View style={[st.rewardPill, { backgroundColor: tint + '15' }]}>
            <Ionicons name="diamond" size={10} color={tint} />
            <Text style={[st.rewardText, { color: tint }]}>{goal.gems}</Text>
          </View>
        </View>
        {/* Progress bar — category-tinted */}
        <View style={[st.progressTrack, { backgroundColor: colors.surface }]}>
          <View style={[st.progressFill, {
            width: `${pct}%`,
            backgroundColor: isComplete ? colors.correct : tint,
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
              <Text style={st.claimBtnText}>{t('modals.claim')}</Text>
            </Pressable>
          )}
          {claimed && (
            <View style={[st.claimedBadge, { backgroundColor: colors.correctSoft }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.correct} />
              <Text style={[st.claimedText, { color: colors.correct }]}>{t('modals.claimed')}</Text>
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
  goalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  goalEmoji: { fontSize: 18 },
  goalContent: { flex: 1 },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  goalTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  rewardText: { fontSize: 11, fontWeight: '800' },

  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  goalBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  progressText: { fontSize: 10, fontWeight: '600' },

  claimBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999 },
  claimBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },

  claimedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  claimedText: { fontSize: 10, fontWeight: '700' },
});
