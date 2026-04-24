import React, { useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import type { ParticleType } from './worldVisuals';

interface Props {
  type: ParticleType;
  color: string;
  width: number;
  height: number;
  /** Lower = fewer particles. Default 14. */
  density?: number;
}

/** Drives a single particle. Runs entirely on the Reanimated worklet
 *  thread so the main JS thread is free. */
function Particle({
  type,
  color,
  xInit,
  yInit,
  containerWidth,
  containerHeight,
  delay,
  size,
}: {
  type: ParticleType;
  color: string;
  xInit: number;
  yInit: number;
  containerWidth: number;
  containerHeight: number;
  delay: number;
  size: number;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration: type === 'bubble' || type === 'ember' ? 6000 : 8000,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [delay, progress, opacity, type]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    let dx = 0;
    let dy = 0;
    if (type === 'bubble' || type === 'ember') {
      dy = -progress.value * (containerHeight + 80);
      dx = Math.sin(progress.value * Math.PI * 2) * 14;
    } else if (type === 'snow') {
      dy = progress.value * (containerHeight + 80);
      dx = Math.sin(progress.value * Math.PI * 3) * 18;
    } else if (type === 'sand') {
      dx = progress.value * (containerWidth + 40);
      dy = Math.sin(progress.value * Math.PI * 2) * 12;
    } else {
      // firefly — slow horizontal drift + subtle vertical bob
      dx = Math.sin(progress.value * Math.PI * 2) * 28;
      dy = Math.cos(progress.value * Math.PI * 2) * 18;
    }
    return {
      transform: [{ translateX: dx }, { translateY: dy }],
      opacity: opacity.value * 0.8,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: xInit,
          top: yInit,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

export function WorldParticles({ type, color, width, height, density = 14 }: Props) {
  const seeds = useMemo(() => {
    const out: Array<{ x: number; y: number; delay: number; size: number }> = [];
    for (let i = 0; i < density; i++) {
      out.push({
        x: Math.random() * width,
        y: Math.random() * height,
        delay: Math.random() * 4000,
        size: 2 + Math.random() * (type === 'ember' || type === 'firefly' ? 3 : 2),
      });
    }
    return out;
  }, [density, width, height, type]);

  return (
    <View
      style={{ position: 'absolute', width, height, overflow: 'hidden' }}
      pointerEvents="none"
    >
      {seeds.map((s, i) => (
        <Particle
          key={i}
          type={type}
          color={color}
          xInit={s.x}
          yInit={s.y}
          containerWidth={width}
          containerHeight={height}
          delay={s.delay}
          size={s.size}
        />
      ))}
    </View>
  );
}
