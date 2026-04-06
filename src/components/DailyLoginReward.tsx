/**
 * Daily Login Reward popup — shows a 7-day calendar with today's reward highlighted.
 * Beautiful on-brand design with animations.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated as RNAnimated, Dimensions } from 'react-native';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { REWARDS, checkDailyReward, claimDailyReward } from '@/src/utils/dailyLoginRewards';

var { width: SW } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

function DailyLoginReward({ visible, onDismiss }: Props) {
  var { colors } = useTheme();
  var addGems = useGameStore(s => s.addGems);
  var buyPowerUp = useGameStore(s => s.buyPowerUp);
  var [rewardDay, setRewardDay] = useState(1);
  var [streak, setStreak] = useState(0);
  var [claimed, setClaimed] = useState(false);
  var [claimedReward, setClaimedReward] = useState<typeof REWARDS[number] | null>(null);

  var backdrop = useRef(new RNAnimated.Value(0)).current;
  var cardScale = useRef(new RNAnimated.Value(0.8)).current;
  var cardOpacity = useRef(new RNAnimated.Value(0)).current;
  var claimScale = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    checkDailyReward().then(check => {
      if (check) {
        setRewardDay(check.currentDay);
        setStreak(check.streak);
      }
    });
    RNAnimated.parallel([
      RNAnimated.timing(backdrop, { toValue: 1, duration: 300, useNativeDriver: false }),
      RNAnimated.spring(cardScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: false }),
      RNAnimated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
    ]).start();
  }, [visible]);

  async function handleClaim() {
    if (claimed) return;
    try {
      var reward = await claimDailyReward();
      setClaimed(true);
      setClaimedReward(reward);

      // Apply reward
      if (reward.type === 'gems') {
        addGems(reward.amount);
      } else if (reward.type === 'powerup' && reward.powerupId) {
        buyPowerUp(reward.powerupId, reward.amount, 0); // free power-up (cost=0)
      }

      // Day 7 mystery bonus
      if (reward.day === 7) {
        var mysteryGems = 5 + Math.floor(Math.random() * 16); // 5-20 bonus gems
        addGems(mysteryGems);
      }

      RNAnimated.spring(claimScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: false }).start();
    } catch {}
  }

  function handleDismiss() {
    RNAnimated.parallel([
      RNAnimated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      RNAnimated.timing(backdrop, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start(() => {
      setClaimed(false);
      setClaimedReward(null);
      claimScale.setValue(0);
      onDismiss();
    });
  }

  if (!visible) return null;

  var todayReward = REWARDS[rewardDay - 1];

  return (
    <Modal visible transparent animationType="none">
      <View style={st.container}>
        <RNAnimated.View style={[StyleSheet.absoluteFill, {
          backgroundColor: backdrop.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)'] }),
        }]} />

        <RNAnimated.View style={[st.card, {
          backgroundColor: colors.card,
          opacity: cardOpacity,
          transform: [{ scale: cardScale }],
          maxWidth: Math.min(SW - 40, 360),
        }]}>
          {/* Header */}
          <View style={[st.header, { backgroundColor: '#6C5CE7' }]}>
            <Text style={st.headerLabel}>DAILY REWARD</Text>
            <Text style={st.headerTitle}>Day {rewardDay} of 7</Text>
            {streak > 1 && <Text style={st.headerStreak}>{'\uD83D\uDD25'} {streak}-day login streak</Text>}
          </View>

          {/* 7-day grid */}
          <View style={st.grid}>
            {REWARDS.map((r, i) => {
              var isToday = i + 1 === rewardDay;
              var isPast = i + 1 < rewardDay;
              var isFuture = i + 1 > rewardDay;
              return (
                <View key={i} style={[st.dayCell, {
                  backgroundColor: isToday ? '#6C5CE7' + '15' : isPast ? colors.correctSoft : colors.surface,
                  borderWidth: isToday ? 2 : 1,
                  borderColor: isToday ? '#6C5CE7' : isPast ? colors.correct + '30' : colors.border,
                  opacity: isFuture ? 0.5 : 1,
                }]}>
                  <Text style={[st.dayNumber, { color: isToday ? '#6C5CE7' : isPast ? colors.correct : colors.textMid }]}>
                    {isPast ? '\u2713' : `D${i + 1}`}
                  </Text>
                  <Text style={[st.dayIcon, { opacity: isFuture ? 0.4 : 1 }]}>{r.icon}</Text>
                </View>
              );
            })}
          </View>

          {/* Today's reward highlight */}
          <View style={[st.todayBox, { backgroundColor: '#6C5CE7' + '08', borderColor: '#6C5CE7' + '20' }]}>
            <Text style={st.todayIcon}>{todayReward.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[st.todayTitle, { color: colors.text }]}>Today's reward</Text>
              <Text style={[st.todayDesc, { color: colors.textMid }]}>{todayReward.label}{rewardDay === 7 ? ' + mystery bonus!' : ''}</Text>
            </View>
          </View>

          {/* Claim button or claimed confirmation */}
          {!claimed ? (
            <Pressable style={({ pressed }) => [st.claimBtn, pressed && { transform: [{ scale: 0.96 }] }]} onPress={handleClaim}>
              <Text style={st.claimText}>Claim reward</Text>
            </Pressable>
          ) : (
            <RNAnimated.View style={[st.claimedBox, { transform: [{ scale: claimScale }] }]}>
              <Text style={[st.claimedText, { color: colors.correct }]}>{'\u2713'} Claimed!</Text>
              <Pressable style={[st.doneBtn, { backgroundColor: colors.surface }]} onPress={handleDismiss}>
                <Text style={[st.doneText, { color: colors.textMid }]}>Done</Text>
              </Pressable>
            </RNAnimated.View>
          )}
        </RNAnimated.View>
      </View>
    </Modal>
  );
}

export default DailyLoginReward;

var st = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 16 },
  header: { paddingVertical: 20, paddingHorizontal: 24, alignItems: 'center' },
  headerLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  headerStreak: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 8, justifyContent: 'center' },
  dayCell: { width: '13%', minWidth: 42, aspectRatio: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 3, padding: 4 },
  dayNumber: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  dayIcon: { fontSize: 18 },
  todayBox: { marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayIcon: { fontSize: 28 },
  todayTitle: { fontSize: 15, fontWeight: '700' },
  todayDesc: { fontSize: 12, marginTop: 2 },
  claimBtn: { marginHorizontal: 16, marginBottom: 20, backgroundColor: '#6C5CE7', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  claimText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  claimedBox: { marginHorizontal: 16, marginBottom: 20, alignItems: 'center', gap: 10 },
  claimedText: { fontSize: 18, fontWeight: '800' },
  doneBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12 },
  doneText: { fontSize: 14, fontWeight: '600' },
});
