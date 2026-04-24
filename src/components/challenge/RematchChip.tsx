import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CHALLENGE_MODES } from '@/src/data/challengeModes';
import type { RecentFriendChallenge } from '@/src/utils/challengeFlow';
import { t } from '@/src/i18n';
import { ModeGlyph } from './ChallengeModeCard';

interface Props {
  recent: RecentFriendChallenge;
  onTap: () => void;
  onDismiss: () => void;
}

/** One-tap rematch chip shown at the top of the challenge-select
 *  screen when there's a completed match with this friend in the
 *  last 48 hours. Spring-entrance, shimmering subtle glow, tap to
 *  pre-fill the same mode and send, or long-press-style × to dismiss. */
export function RematchChip({ recent, onTap, onDismiss }: Props) {
  const mode = CHALLENGE_MODES[recent.mode] ?? CHALLENGE_MODES.classic;
  const outcomeColor = recent.outcome === 'won'
    ? 'rgba(255,255,255,0.95)'
    : recent.outcome === 'lost'
      ? 'rgba(255,255,255,0.85)'
      : 'rgba(255,255,255,0.9)';

  const enterScale = useSharedValue(0.92);
  const enterOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    enterOpacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    enterScale.value = withSpring(1, { damping: 14, stiffness: 180, mass: 0.9 });
    // Slow breathing glow under the chip — subtle enough that it
    // reads as "alive" rather than demanding attention.
    glowOpacity.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [enterOpacity, enterScale, glowOpacity]);

  const rootStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ scale: enterScale.value * pressScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handleTap = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onTap();
  };

  const handleDismiss = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onDismiss();
  };

  return (
    <Animated.View style={[st.wrap, rootStyle]}>
      {/* Mode-coloured glow halo behind the chip */}
      <Animated.View
        style={[
          st.glow,
          { backgroundColor: mode.color },
          glowStyle,
        ]}
        pointerEvents="none"
      />
      <Pressable
        onPress={handleTap}
        onPressIn={() => {
          pressScale.value = withSpring(0.98, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 12, stiffness: 240 });
        }}
        accessibilityRole="button"
        accessibilityLabel={`${t('challenge.rematch_title')} ${mode.name}. ${t('challenge.rematch_hint')}`}
      >
        <LinearGradient
          colors={[mode.color, mode.color + 'D8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={st.chip}
        >
          {/* Left: mode glyph on frosted circle */}
          <View style={st.iconWrap}>
            <ModeGlyph mode={recent.mode} size={20} color="#FFFFFF" />
          </View>

          {/* Middle: title + subtitle */}
          <View style={st.textBlock}>
            <View style={st.titleRow}>
              <Text style={st.title}>{t('challenge.rematch_title')}</Text>
              <OutcomeBadge outcome={recent.outcome} />
            </View>
            <Text style={st.subtitle} numberOfLines={1}>
              {mode.name} · {t('challenge.rematch_score', {
                mine: recent.myScore,
                theirs: recent.theirScore,
              })}
            </Text>
          </View>

          {/* Right: arrow pill */}
          <View style={st.arrowPill}>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </View>

          {/* Dismiss × overlay. Small hit target at top-right so it
           *  doesn't collide with the chip tap. */}
          <Pressable
            onPress={handleDismiss}
            hitSlop={10}
            style={st.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t('challenge.rematch_dismiss_aria')}
          >
            <Ionicons name="close" size={12} color={outcomeColor} />
          </Pressable>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function OutcomeBadge({ outcome }: { outcome: 'won' | 'lost' | 'draw' }) {
  const label = outcome === 'won'
    ? t('challenge.outcome_won')
    : outcome === 'lost'
      ? t('challenge.outcome_lost')
      : t('challenge.outcome_draw');
  const bg = outcome === 'won'
    ? 'rgba(255,255,255,0.28)'
    : outcome === 'lost'
      ? 'rgba(0,0,0,0.18)'
      : 'rgba(255,255,255,0.18)';
  return (
    <View style={[st.outcomeBadge, { backgroundColor: bg }]}>
      <Text style={st.outcomeText}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    marginBottom: 14,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: 4,
    left: 8,
    right: 8,
    bottom: -6,
    borderRadius: 20,
    opacity: 0.3,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '600',
  },
  outcomeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  outcomeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  arrowPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  closeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
    borderRadius: 999,
  },
});
