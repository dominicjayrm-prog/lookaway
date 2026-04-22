/**
 * Daily Login Reward popup — shows a 7-day calendar with today's reward highlighted.
 * Beautiful on-brand design with animations.
 */
import React
import { t } from '@/src/i18n';, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Animated as RNAnimated, Dimensions, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/providers/ThemeProvider';
import { useGameStore } from '@/src/store';
import { REWARDS, checkDailyReward, advanceLoginReward, pickCosmeticReward } from '@/src/utils/dailyLoginRewards';
import { getCosmeticById, type Cosmetic } from '@/src/data/cosmetics';
import { CosmeticCelebration } from '@/src/components/CosmeticCelebration';

var { width: SW } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

function DailyLoginReward({ visible, onDismiss }: Props) {
  var { colors } = useTheme();
  var addGems = useGameStore(s => s.addGems);
  var buyPowerUp = useGameStore(s => s.buyPowerUp);
  var unlockCosmetic = useGameStore(s => s.unlockCosmetic);
  var ownedCosmetics = useGameStore(s => s.ownedCosmetics);
  var loginReward = useGameStore(s => s.loginReward);
  var claimLoginReward = useGameStore(s => s.claimLoginReward);
  var [rewardDay, setRewardDay] = useState(1);
  var [streak, setStreak] = useState(0);
  var [claimed, setClaimed] = useState(false);
  var [claimedReward, setClaimedReward] = useState<typeof REWARDS[number] | null>(null);
  var [celebrationItem, setCelebrationItem] = useState<Cosmetic | null>(null);

  var backdrop = useRef(new RNAnimated.Value(0)).current;
  var cardScale = useRef(new RNAnimated.Value(0.8)).current;
  var cardOpacity = useRef(new RNAnimated.Value(0)).current;
  var claimScale = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    var check = checkDailyReward(loginReward);
    setRewardDay(check.currentDay);
    setStreak(check.streak);
    RNAnimated.parallel([
      RNAnimated.timing(backdrop, { toValue: 1, duration: 300, useNativeDriver: false }),
      RNAnimated.spring(cardScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: false }),
      RNAnimated.timing(cardOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
    ]).start();
  }, [visible, loginReward]);

  function handleClaim() {
    if (claimed) return;
    var check = checkDailyReward(loginReward);
    if (!check.available) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    var reward = { ...check.reward, streak: check.streak };
    claimLoginReward(advanceLoginReward(loginReward));
    setClaimed(true);
    setClaimedReward(reward);

    // Apply reward
    let unlockedCosmetic: Cosmetic | null = null;
    if (reward.type === 'gems') {
      addGems(reward.amount);
    } else if ((reward as any).type === 'powerup' && (reward as any).powerupId) {
      buyPowerUp((reward as any).powerupId, reward.amount, 0);
    } else if (reward.type === 'cosmetic' && (reward as any).cosmeticType) {
      const cosmeticId = pickCosmeticReward((reward as any).cosmeticType, ownedCosmetics);
      if (cosmeticId) {
        unlockCosmetic(cosmeticId);
        const item = getCosmeticById(cosmeticId);
        if (item) unlockedCosmetic = item as Cosmetic;
      } else {
        // All cosmetics of this type owned — give bonus gems instead
        addGems(10);
      }
    }

    // Day 7 mystery bonus
    if (reward.day === 7) {
      var mysteryGems = 5 + Math.floor(Math.random() * 16); // 5-20 bonus gems
      addGems(mysteryGems);
    }

    RNAnimated.spring(claimScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: false }).start();

    // Cosmetic rewards: auto-dismiss this modal and open the
    // celebration a beat later. Previously we set `celebrationItem`
    // while the DailyLoginReward modal was still up, which on iOS
    // means the CosmeticCelebration modal mounts BEHIND it and the
    // player never sees the confetti. Closing this modal first
    // makes the celebration the only surface on screen so the
    // "Random Expression Unlocked!" reveal actually shows.
    if (unlockedCosmetic) {
      setTimeout(() => {
        RNAnimated.parallel([
          RNAnimated.timing(cardOpacity, { toValue: 0, duration: 220, useNativeDriver: false }),
          RNAnimated.timing(backdrop, { toValue: 0, duration: 300, useNativeDriver: false }),
        ]).start(() => {
          setClaimed(false);
          setClaimedReward(null);
          claimScale.setValue(0);
          onDismiss();
          // Small defer so the reward modal's dismissal finishes
          // before the celebration modal requests presentation.
          setTimeout(() => setCelebrationItem(unlockedCosmetic), 80);
        });
      }, 500);
    }
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

  // IMPORTANT: we can't return null when `visible` flips false, because
  // cosmetic rewards schedule a CosmeticCelebration AFTER the parent
  // sets visible=false. If we unmounted here, the celebration modal
  // (which lives nested below) would get torn down and the user would
  // see no reveal at all — the exact "random banner didn't show me
  // which one I got" bug. Instead we keep the component mounted as
  // long as EITHER the daily modal is visible OR a celebration is
  // queued, and let the inner <Modal>'s own `visible` prop control
  // show/hide.
  if (!visible && !celebrationItem) return null;

  var todayReward = REWARDS[rewardDay - 1];

  return (
    <>
    {/* Gate the inner Modal on `visible` so when the daily reward
        dismisses the backdrop actually goes away, even though the
        outer component stays mounted until celebrationItem clears. */}
    <Modal visible={visible} transparent animationType="none">
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
            <Text style={st.headerLabel}>{t('celebrations.daily_reward_label')}</Text>
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
              <Text style={[st.todayTitle, { color: colors.text }]}>{t('celebrations.daily_today')}</Text>
              <Text style={[st.todayDesc, { color: colors.textMid }]}>{todayReward.label}{rewardDay === 7 ? ' + mystery bonus!' : ''}</Text>
            </View>
          </View>

          {/* Claim button or claimed confirmation */}
          {!claimed ? (
            <Pressable style={({ pressed }) => [st.claimBtn, pressed && { transform: [{ scale: 0.96 }] }]} onPress={handleClaim}>
              <Text style={st.claimText}>{t('celebrations.daily_claim')}</Text>
            </Pressable>
          ) : (
            <RNAnimated.View style={[st.claimedBox, { transform: [{ scale: claimScale }] }]}>
              <Text style={[st.claimedText, { color: colors.correct }]}>{'\u2713'} Claimed!</Text>
              <Pressable style={[st.doneBtn, { backgroundColor: colors.surface }]} onPress={handleDismiss}>
                <Text style={[st.doneText, { color: colors.textMid }]}>{t('celebrations.daily_done')}</Text>
              </Pressable>
            </RNAnimated.View>
          )}
        </RNAnimated.View>
      </View>
    </Modal>
    {/* Cosmetic reward celebration */}
    <CosmeticCelebration
      visible={!!celebrationItem}
      item={celebrationItem}
      onDismiss={() => setCelebrationItem(null)}
      message="Daily reward unlocked!"
    />
    </>
  );
}

export default DailyLoginReward;

var st = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, ...(Platform.OS === 'web' ? { maxWidth: 430, alignSelf: 'center', width: '100%' } : {}) },
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
