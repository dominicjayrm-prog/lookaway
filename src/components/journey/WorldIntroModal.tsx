import React, { useEffect } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Platform } from 'react-native';
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
import { WORLD_THEMES, WORLD_THEME_ORDER, type WorldTheme } from '@/src/data/unifiedJourney';
import { WORLD_VISUALS } from './worldVisuals';
import { WorldParticles } from './WorldParticles';
import { t } from '@/src/i18n';
import { localizedWorldName, localizedWorldAtmosphere } from './worldI18n';
import { Blink } from '@/src/components/Blink';
import { useEquippedBlinkExpression } from '@/src/hooks/useEquippedBlink';

interface Props {
  world: WorldTheme | null;
  onClose: () => void;
}

/** Full-screen "Welcome to <World>" celebration shown once per world when
 *  the player crosses into a new theme. Entrance animation: overlay
 *  fades in, card springs up + scales in, content staggers. */
export function WorldIntroModal({ world, onClose }: Props) {
  const visible = !!world;
  if (!world) {
    return <Modal visible={false} transparent onRequestClose={onClose} />;
  }
  return <WorldIntroBody world={world} onClose={onClose} />;
}

function WorldIntroBody({ world, onClose }: { world: WorldTheme; onClose: () => void }) {
  const meta = WORLD_THEMES[world];
  const visuals = WORLD_VISUALS[world];
  const [start, end] = meta.range;
  const blinkExpression = useEquippedBlinkExpression();

  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const blinkFloat = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    cardScale.value = withSpring(1, { damping: 14, stiffness: 180, mass: 0.9 });
    textOpacity.value = withDelay(180, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    blinkFloat.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [cardOpacity, cardScale, textOpacity, blinkFloat]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const blinkStyle = useAnimatedStyle(() => ({ transform: [{ translateY: blinkFloat.value }] }));

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <View style={st.overlay}>
        <Animated.View style={[st.cardShadow, cardStyle]}>
          <LinearGradient
            colors={visuals.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.card}
          >
            {/* Ambient particles inside the card — matches the world */}
            <View style={st.particleLayer} pointerEvents="none">
              <WorldParticles
                type={visuals.particleType}
                color={visuals.particleColor}
                width={320}
                height={440}
                density={18}
              />
            </View>

            <Animated.View style={[st.blinkWrap, blinkStyle]}>
              <Blink expression={blinkExpression} size={100} />
            </Animated.View>

            <Animated.View style={[st.content, textStyle]}>
              <Text style={st.eyebrow}>
                {t('journey.world_intro_eyebrow', {
                  num: meta.worldNumber,
                  total: WORLD_THEME_ORDER.length,
                })}
              </Text>
              <Text style={st.title}>{localizedWorldName(world)}</Text>
              <View style={st.rangeBadge}>
                <Text style={st.range}>
                  {t('journey.world_intro_range', { start, end })}
                </Text>
              </View>
              <Text style={st.atmosphere}>
                {localizedWorldAtmosphere(world, visuals.atmosphere)}
              </Text>

              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [
                  st.cta,
                  { backgroundColor: '#FFFFFF', opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('journey.world_intro_aria', {
                  name: localizedWorldName(world),
                })}
              >
                <Text style={[st.ctaText, { color: meta.color }]}>
                  {t('journey.world_intro_cta')}
                </Text>
              </Pressable>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardShadow: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  card: {
    width: '100%',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 440,
  },
  particleLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blinkWrap: {
    marginTop: 8,
    marginBottom: 16,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  rangeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 18,
  },
  range: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  atmosphere: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  cta: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
