/**
 * Comeback Reward Modal — shown on app open when the player has been
 * away for 7+ days AND it's been 14+ days since their last claim.
 * Mirrors the gem reward advertised in the day-7 / day-14 win-back
 * push notifications, so a user who taps that push naturally lands
 * on a claimable modal.
 *
 * Design: full-screen dim backdrop, centred card with a sparkly gem
 * icon + reward amount + Claim button. Standard on-brand styling
 * (matches DailyLoginReward + StreakRewardToast).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated as RNAnimated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/providers/ThemeProvider';
import { t } from '@/src/i18n';
import { sounds } from '@/src/lib/sounds';
import { COMEBACK_REWARD_GEMS, claimComebackReward } from '@/src/lib/comebackReward';

interface Props {
  visible: boolean;
  /** Called after the user taps Claim AND the gems have been granted,
   *  OR after they dismiss the modal without claiming. */
  onClose: () => void;
}

export function ComebackRewardModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const [claimed, setClaimed] = useState(false);

  const backdrop = useRef(new RNAnimated.Value(0)).current;
  const cardScale = useRef(new RNAnimated.Value(0.85)).current;
  const cardOpacity = useRef(new RNAnimated.Value(0)).current;
  const sparkRotate = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setClaimed(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    RNAnimated.parallel([
      RNAnimated.timing(backdrop, { toValue: 1, duration: 280, useNativeDriver: false }),
      RNAnimated.spring(cardScale, { toValue: 1, friction: 6, tension: 110, useNativeDriver: false }),
      RNAnimated.timing(cardOpacity, { toValue: 1, duration: 280, useNativeDriver: false }),
    ]).start();
    // Slow continuous rotation on the spark behind the gem.
    RNAnimated.loop(
      RNAnimated.timing(sparkRotate, { toValue: 1, duration: 16_000, useNativeDriver: true }),
    ).start();
  }, [visible, backdrop, cardScale, cardOpacity, sparkRotate]);

  const handleClaim = async () => {
    if (claimed) return;
    setClaimed(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    sounds.play('gemClink');
    await claimComebackReward();
    // Hold for ~600ms so the user sees the gem-clink + the gem counter
    // animate up in the home header, then close.
    setTimeout(() => onClose(), 600);
  };

  const handleDismiss = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onClose();
  };

  const sparkRotation = sparkRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <RNAnimated.View
        style={[
          st.backdrop,
          {
            opacity: backdrop,
            backgroundColor: 'rgba(20, 14, 40, 0.72)',
          },
        ]}
      >
        <Pressable style={st.dismissArea} onPress={handleDismiss} />
        <RNAnimated.View
          style={[
            st.card,
            {
              backgroundColor: colors.card,
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          {/* Close button top right */}
          <Pressable
            style={st.closeBtn}
            onPress={handleDismiss}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('comeback_modal.dismiss_aria')}
          >
            <Ionicons name="close" size={20} color={colors.textMid} />
          </Pressable>

          {/* Spark + gem hero */}
          <View style={st.gemWrap}>
            <RNAnimated.View
              style={[
                st.sparkRing,
                { transform: [{ rotate: sparkRotation }] },
              ]}
            >
              {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                <View
                  key={i}
                  style={[
                    st.spark,
                    {
                      transform: [
                        { rotate: `${deg}deg` },
                        { translateY: -52 },
                      ],
                    },
                  ]}
                />
              ))}
            </RNAnimated.View>
            <View style={[st.gemBg, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="diamond" size={64} color={colors.accent} />
            </View>
          </View>

          <Text style={[st.title, { color: colors.text }]} allowFontScaling={false}>
            {t('comeback_modal.title')}
          </Text>
          <Text style={[st.subtitle, { color: colors.textMid }]}>
            {t('comeback_modal.subtitle')}
          </Text>

          <View style={[st.rewardPill, { backgroundColor: colors.accent }]}>
            <Ionicons name="diamond" size={18} color="#FFFFFF" />
            <Text style={st.rewardText} allowFontScaling={false}>
              {t('comeback_modal.reward_label', { gems: COMEBACK_REWARD_GEMS })}
            </Text>
          </View>

          <Pressable
            onPress={handleClaim}
            disabled={claimed}
            style={({ pressed }) => [
              st.claimBtn,
              {
                backgroundColor: claimed ? colors.correct : colors.accent,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('comeback_modal.claim_button_aria', { gems: COMEBACK_REWARD_GEMS })}
          >
            {claimed ? (
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
            ) : (
              <Text style={st.claimText} allowFontScaling={false}>
                {t('comeback_modal.claim_button')}
              </Text>
            )}
          </Pressable>
        </RNAnimated.View>
      </RNAnimated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gemWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sparkRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#FFD700',
    opacity: 0.7,
  },
  gemBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 22,
  },
  rewardText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  claimBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  claimText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
