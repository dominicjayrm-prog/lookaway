import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Blink, type BlinkExpression } from '@/src/components/Blink';
import type { ModeId } from '@/src/data/unifiedJourney';

const EXPRESSION_BY_MODE: Record<ModeId, BlinkExpression> = {
  classic: 'memorise',
  speed_recall: 'normal',
  snap_match: 'thinking',
  sequence: 'normal',
  counting_blitz: 'streak',
  colour_chain: 'normal',
};

interface Props {
  mode: ModeId;
  size?: number;
}

/** Blink mascot that floats near the current level node. Mode drives
 *  the expression so the player's companion looks appropriate for the
 *  mode they're about to play. */
export function BlinkOnPath({ mode, size = 32 }: Props) {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withRepeat(
      withTiming(-3, {
        duration: 1500,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View style={style} pointerEvents="none">
      <Blink expression={EXPRESSION_BY_MODE[mode] ?? 'normal'} size={size} />
    </Animated.View>
  );
}
