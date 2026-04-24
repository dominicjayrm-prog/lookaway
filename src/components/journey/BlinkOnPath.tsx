import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Blink } from '@/src/components/Blink';
import { useEquippedBlinkExpression } from '@/src/hooks/useEquippedBlink';

interface Props {
  size?: number;
  /** Optional horizontal offset cycle amplitude — passed through to
   *  animated style so Blink can drift along the path when the player
   *  pauses. Defaults to a subtle 2px. */
  driftAmplitude?: number;
}

/** Blink mascot that floats beside the current level node. Always uses
 *  the player's equipped expression (never a hardcoded mode-driven face)
 *  so the cosmetic the player paid for is visible across the whole app,
 *  not just on the home screen. */
export function BlinkOnPath({ size = 36, driftAmplitude = 2 }: Props) {
  const expression = useEquippedBlinkExpression();
  const y = useSharedValue(0);
  const x = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Gentle vertical bob — mimics breathing. Shorter cycle than before
    // (1200ms vs 1500ms) gives a slightly more "alive" feel without
    // looking jittery.
    y.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    // Subtle horizontal drift so he doesn't feel locked to one spot.
    x.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(driftAmplitude, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(-driftAmplitude, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
    // Occasional "blink" squash — scale Y briefly so it reads as a real
    // blink every few seconds. Delay offsets it from the bob cycle.
    scale.value = withDelay(
      2000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(1.04, { duration: 180, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 180, easing: Easing.in(Easing.quad) }),
          withTiming(1, { duration: 3600 }),
        ),
        -1,
        false,
      ),
    );
  }, [y, x, scale, driftAmplitude]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { translateX: x.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={style} pointerEvents="none">
      <Blink expression={expression} size={size} />
    </Animated.View>
  );
}
