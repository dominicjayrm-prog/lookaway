import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Share, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Blink } from '@/src/components/Blink';
import { useGameStore } from '@/src/store';
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';
import { t } from '@/src/i18n';
import { TOTAL_POSITIONS } from '@/src/data/unifiedJourney';
import { useEquippedBlinkExpression } from '@/src/hooks/useEquippedBlink';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const CONFETTI_PIECES = 36;

/** Endgame 20 completion celebration. Fires once when the player
 *  clears Position 400 (Mastermind L55 = Grand Master Trial). Distinct
 *  from BrainMasterCelebration in palette + copy: BrainMaster is
 *  gold-on-warm (the rite-of-passage at 380), GrandMaster is
 *  platinum-purple (the ascended tier — beyond the main campaign).
 *  Pattern + structure intentionally mirror BrainMaster so both
 *  celebrations feel like part of the same family of moments. */
export function GrandMasterCelebration({ visible, onClose }: Props) {
  if (!visible) return <Modal visible={false} transparent onRequestClose={onClose} />;
  return <GrandMasterBody onClose={onClose} />;
}

function GrandMasterBody({ onClose }: { onClose: () => void }) {
  const { totalStars, streakCount } = useGameStore();
  const blinkExpression = useEquippedBlinkExpression();
  // Real Grand Master count from Supabase. Mirrors the same query
  // BrainMaster uses but filtered to position === 400. If the query
  // fails we fall back to the generic blurb — never fabricate a stat.
  const [rank, setRank] = useState<number | null>(null);
  const [totalMasters, setTotalMasters] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const myId = session?.user?.id;
        if (!myId) return;
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('updated_at')
          .eq('id', myId)
          .single();

        const [{ count: countAhead }, { count: totalCount }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('unified_position', 400)
            .lt('updated_at', myProfile?.updated_at ?? new Date().toISOString()),
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('unified_position', 400),
        ]);
        if (typeof countAhead === 'number') setRank(countAhead + 1);
        if (typeof totalCount === 'number') setTotalMasters(totalCount);
      } catch (e) {
        log.error('journey', 'grand master rank fetch failed', e);
      }
    })();
  }, []);

  const cardScale = useSharedValue(0.6);
  const cardOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const titleOpacity = useSharedValue(0);
  const blinkScale = useSharedValue(0.5);
  const statsOpacity = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    cardScale.value = withSpring(1, { damping: 12, stiffness: 140 });
    blinkScale.value = withDelay(250, withSpring(1, { damping: 10, stiffness: 150 }));
    titleY.value = withDelay(500, withSpring(0, { damping: 14, stiffness: 180 }));
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    statsOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 500);
    }
  }, [cardOpacity, cardScale, blinkScale, titleY, titleOpacity, statsOpacity]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));
  const blinkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: blinkScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const statsStyle = useAnimatedStyle(() => ({ opacity: statsOpacity.value }));

  const share = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    try {
      await Share.share({
        message: t('journey.grand_master.share_message', {
          total: TOTAL_POSITIONS,
          stars: totalStars,
          streak: streakCount,
        }),
      });
    } catch {}
  };

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      {/* Platinum-violet gradient — distinct from BrainMaster's gold so
       *  the two celebrations don't feel like the same moment. The
       *  dark violet at the bottom anchors the white-platinum top. */}
      <LinearGradient
        colors={['#F4F0FF', '#A29BFE', '#4A3BBF']}
        style={st.overlay}
      >
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {Array.from({ length: CONFETTI_PIECES }).map((_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}
        </View>

        <Animated.View style={[st.contentShadow, cardStyle]}>
          <View style={st.content}>
            <Animated.View style={[st.blinkWrap, blinkStyle]}>
              <Blink expression={blinkExpression} size={180} />
            </Animated.View>

            <Animated.View style={titleStyle}>
              <Text style={st.eyebrow}>
                {t('journey.grand_master.eyebrow', { total: TOTAL_POSITIONS })}
              </Text>
              <Text style={st.title}>{t('journey.grand_master.title')}</Text>
            </Animated.View>

            <Animated.View style={statsStyle}>
              <Text style={st.blurb}>
                {rank !== null
                  ? t('journey.grand_master.rank_blurb', { rank })
                  : t('journey.grand_master.blurb')}
              </Text>

              <View style={st.statsRow}>
                <StatBubble value={totalStars} label={t('journey.grand_master.stars_label')} />
                <StatBubble value={TOTAL_POSITIONS} label={t('journey.grand_master.levels_label')} />
                <StatBubble value={streakCount} label={t('journey.grand_master.day_streak_label')} />
              </View>

              <Pressable
                onPress={share}
                style={({ pressed }) => [
                  st.shareBtn,
                  { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('journey.grand_master.share_aria')}
              >
                <Text style={st.shareText}>{t('journey.grand_master.share_cta')}</Text>
              </Pressable>

              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [
                  st.closeBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('journey.grand_master.close_aria')}
              >
                <Text style={st.closeText}>{t('journey.grand_master.done_cta')}</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
}

function StatBubble({ value, label }: { value: number; label: string }) {
  return (
    <View style={st.stat}>
      <Text style={st.statValue}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

function ConfettiPiece({ index }: { index: number }) {
  const y = useSharedValue(-40);
  const x = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = (index * 80) % 1600;
    const startX = (index * 37) % 360 - 20;
    const endX = startX + ((index % 3) - 1) * 20;
    const fallDuration = 2400 + (index % 5) * 300;
    x.value = startX;
    y.value = withDelay(delay, withTiming(700, { duration: fallDuration, easing: Easing.in(Easing.quad) }));
    x.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(endX + 8, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(endX - 8, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: 1600 + (index % 7) * 200, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, [index, x, y, rotate, opacity]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    top: y.value,
    left: x.value,
    opacity: opacity.value,
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  // Platinum + lavender + violet confetti — palette mirrors the
  // overlay gradient so the celebration reads as a single cohesive
  // visual moment.
  const colors = ['#FFFFFF', '#E8E0FF', '#A29BFE', '#6C5CE7'];
  const bg = colors[index % colors.length];
  const isRectangle = index % 2 === 0;
  return (
    <Animated.View
      style={[
        style,
        {
          width: isRectangle ? 8 : 6,
          height: isRectangle ? 4 : 6,
          borderRadius: isRectangle ? 1 : 3,
          backgroundColor: bg,
        },
      ]}
    />
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  contentShadow: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  content: {
    alignItems: 'center',
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -1.2,
    textShadowColor: 'rgba(74,59,191,0.45)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  blinkWrap: {
    marginBottom: 16,
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.6,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
  },
  blurb: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
    justifyContent: 'center',
  },
  stat: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minWidth: 84,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  shareBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 999,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  shareText: {
    color: '#4A3BBF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  closeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignSelf: 'center',
  },
  closeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
  },
});
