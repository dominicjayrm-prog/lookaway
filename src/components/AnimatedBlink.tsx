import React, { useEffect, useRef } from 'react';
import { Animated as RNAnimated, ViewStyle } from 'react-native';
import { Blink } from './Blink';
import type { BlinkExpression } from './Blink';

type Entrance = 'spring' | 'fade' | 'bounce' | 'none';

interface AnimatedBlinkProps {
  expression?: BlinkExpression;
  size?: number;
  breathing?: boolean;
  entrance?: Entrance;
  entranceDelay?: number;
  style?: ViewStyle;
}

function AnimatedBlinkComponent({
  expression = 'normal',
  size = 120,
  breathing = true,
  entrance = 'none',
  entranceDelay = 0,
  style,
}: AnimatedBlinkProps) {
  // ─── Breathing (idle pulse) ──────────────────────────
  const breathScale = useRef(new RNAnimated.Value(1)).current;
  useEffect(() => {
    if (!breathing) return;
    const anim = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(breathScale, { toValue: 1.04, duration: 750, useNativeDriver: true }),
        RNAnimated.timing(breathScale, { toValue: 1, duration: 750, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [breathing, breathScale]);

  // ─── Entrance animation ──────────────────────────────
  const entranceScale = useRef(new RNAnimated.Value(entrance === 'spring' ? 0 : 1)).current;
  const entranceOpacity = useRef(new RNAnimated.Value(entrance === 'fade' ? 0 : 1)).current;
  const entranceTranslateY = useRef(new RNAnimated.Value(entrance === 'bounce' ? -20 : 0)).current;

  useEffect(() => {
    const delay = entranceDelay;
    if (entrance === 'spring') {
      const t = setTimeout(() => {
        RNAnimated.spring(entranceScale, { toValue: 1, tension: 60, friction: 5, useNativeDriver: true }).start();
      }, delay);
      return () => clearTimeout(t);
    }
    if (entrance === 'fade') {
      const t = setTimeout(() => {
        RNAnimated.timing(entranceOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }, delay);
      return () => clearTimeout(t);
    }
    if (entrance === 'bounce') {
      const t = setTimeout(() => {
        RNAnimated.spring(entranceTranslateY, { toValue: 0, tension: 120, friction: 6, useNativeDriver: true }).start();
      }, delay);
      return () => clearTimeout(t);
    }
  }, [entrance, entranceDelay, entranceScale, entranceOpacity, entranceTranslateY]);

  // ─── Expression transition squish ────────────────────
  const squishY = useRef(new RNAnimated.Value(1)).current;
  const prevExpression = useRef(expression);
  useEffect(() => {
    if (prevExpression.current !== expression) {
      prevExpression.current = expression;
      RNAnimated.sequence([
        RNAnimated.timing(squishY, { toValue: 0.85, duration: 100, useNativeDriver: true }),
        RNAnimated.spring(squishY, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [expression, squishY]);

  return (
    <RNAnimated.View
      style={[
        {
          opacity: entranceOpacity,
          transform: [
            { scale: RNAnimated.multiply(breathScale, entranceScale) },
            { scaleY: squishY },
            { translateY: entranceTranslateY },
          ],
        },
        style,
      ]}
    >
      <Blink expression={expression} size={size} />
    </RNAnimated.View>
  );
}

export const AnimatedBlink = React.memo(AnimatedBlinkComponent);
export type { BlinkExpression };
