/**
 * Visual flash effects when a power-up is activated.
 * Shows a brief full-screen tint + icon animation.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';

type PowerUpType = 'slowTime' | 'peek' | 'fiftyFifty' | 'skip';

const CONFIGS: Record<PowerUpType, { color: string; icon: string; label: string }> = {
  slowTime: { color: '#0984E3', icon: '\u23F1\uFE0F', label: '+3s' },
  peek: { color: '#6C5CE7', icon: '\uD83D\uDC41', label: 'Peek!' },
  fiftyFifty: { color: '#00B894', icon: '\u2702\uFE0F', label: '50/50' },
  skip: { color: '#D4A012', icon: '\u23ED\uFE0F', label: 'Skip!' },
};

interface Props {
  type: PowerUpType | null;
  onDone: () => void;
}

function PowerUpFlash({ type, onDone }: Props) {
  const tintOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);

  useEffect(() => {
    if (!type) return;
    const config = CONFIGS[type];
    if (!config) { onDone(); return; }

    // Screen tint flash
    tintOpacity.value = withSequence(
      withTiming(0.2, { duration: 150 }),
      withTiming(0, { duration: 400 }),
    );

    // Icon pops in then fades out
    iconOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withDelay(400, withTiming(0, { duration: 300 })),
    );
    iconScale.value = withSequence(
      withSpring(1, { damping: 4, stiffness: 250 }),
      withDelay(400, withTiming(1.5, { duration: 300 })),
    );

    // Label fades in then out
    labelOpacity.value = withSequence(
      withDelay(100, withTiming(1, { duration: 200 })),
      withDelay(300, withTiming(0, { duration: 200 })),
    );

    // Fire onDone after total animation (~1s)
    const timeout = setTimeout(() => {
      iconScale.value = 0;
      iconOpacity.value = 0;
      labelOpacity.value = 0;
      onDone();
    }, 1050);

    return () => clearTimeout(timeout);
  }, [type]);

  const tintStyle = useAnimatedStyle(() => ({
    opacity: tintOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  if (!type) return null;
  const config = CONFIGS[type];
  if (!config) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: config.color }, tintStyle]} />
      <View style={st.center}>
        <Animated.View style={iconStyle}>
          <Text style={st.icon}>{config.icon}</Text>
        </Animated.View>
        <Animated.View style={[{ marginTop: 8 }, labelStyle]}>
          <View style={[st.labelPill, { backgroundColor: config.color }]}>
            <Text style={st.labelText}>{config.label}</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

export default PowerUpFlash;

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 48 },
  labelPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  labelText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
});
