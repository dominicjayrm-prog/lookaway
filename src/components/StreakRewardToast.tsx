/**
 * StreakRewardToast — slide-down notification shown when a streak
 * milestone is auto-claimed. Multiple claims at once stack with a 1s
 * delay between them so each one has its own moment.
 *
 * Tapping the toast navigates to the Streak Rewards screen. Auto-dismisses
 * after 3 seconds. Plays a soft "ding" haptic on appear.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { sounds } from '@/src/lib/sounds';
import { useTheme } from '@/src/providers/ThemeProvider';
import type { ClaimedMilestone } from '@/src/utils/streakRewards';

interface Props {
  /** Queue of milestones to surface, in order. The toast component owns
   *  consumption — when one finishes, it pops to the next after a 1s gap. */
  queue: ClaimedMilestone[];
  /** Called when the queue empties so the parent can clear it. */
  onDone: () => void;
}

const SHIELD_EMOJI = '\uD83D\uDEE1\uFE0F';
const FIRE_EMOJI = '\uD83D\uDD25';
const isWeb = Platform.OS === 'web';

export function StreakRewardToast({ queue, onDone }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const slide = useRef(new RNAnimated.Value(-200)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 1s breather between toasts. Tracked in a ref so unmount can cancel it
   *  — without this, the queue could wedge in a zombie state where the
   *  parent never gets the onDone() callback. */
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const current = queue[index];

  useEffect(() => {
    if (!current) {
      onDone();
      return;
    }

    // Slide in
    if (!isWeb) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    sounds.play('starPop');

    RNAnimated.parallel([
      RNAnimated.spring(slide, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss after 3s
    dismissTimer.current = setTimeout(() => dismiss(), 3000);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.day]);

  const dismiss = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    RNAnimated.parallel([
      RNAnimated.timing(slide, { toValue: -200, duration: 240, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => {
      if (!mountedRef.current) return;
      // Move to next or end the queue after a 1s breather between toasts
      if (index + 1 < queue.length) {
        advanceTimer.current = setTimeout(() => {
          if (!mountedRef.current) return;
          setIndex((i) => i + 1);
        }, 1000);
      } else {
        onDone();
      }
    });
  };

  if (!current) return null;

  return (
    <RNAnimated.View
      pointerEvents="box-none"
      style={[
        st.wrap,
        { paddingTop: insets.top + 8, opacity, transform: [{ translateY: slide }] },
      ]}
    >
      <Pressable
        onPress={() => {
          dismiss();
          // Slight delay so the dismiss animation runs before the route push
          setTimeout(() => router.push('/streak-rewards'), 200);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Day ${current.day} streak reward`}
        style={({ pressed }) => [
          st.card,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.92 : 1 },
        ]}
      >
        <Text style={st.fire}>{FIRE_EMOJI}</Text>
        <View style={st.body}>
          <Text style={[st.title, { color: colors.text }]} numberOfLines={1}>
            Day {current.day} Reward!
          </Text>
          <View style={st.pillRow}>
            <View style={[st.pill, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="diamond" size={10} color={colors.accent} />
              <Text style={[st.pillText, { color: colors.accent }]}>+{current.gems}</Text>
            </View>
            {current.shields > 0 && (
              <View style={[st.pill, { backgroundColor: colors.wrongSoft }]}>
                <Text style={st.shieldEmoji}>{SHIELD_EMOJI}</Text>
                <Text style={[st.pillText, { color: colors.wrong }]}>×{current.shields}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </RNAnimated.View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  fire: { fontSize: 20 },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  pillRow: { flexDirection: 'row', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillText: { fontSize: 11, fontWeight: '700' },
  shieldEmoji: { fontSize: 11 },
});
