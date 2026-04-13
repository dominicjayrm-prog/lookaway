/**
 * FloatingShapes — 40 drifting SVG shapes that fill the background of the
 * Memory Analytics screen with subtle atmospheric motion.
 *
 * Performance notes:
 *  - A single shared `clock` value drives all 40 shapes.
 *  - Each shape's `useAnimatedStyle` reads `clock.value` and computes its
 *     drift on the UI thread, so the whole field runs at 60fps without
 *     crossing the JS bridge every frame.
 *  - Shapes are generated once (memoised on `seed`) so their phases,
 *     colours and positions are stable across re-renders.
 */
import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Rect, Polygon, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

export type ShapeType = 'circle' | 'square' | 'triangle' | 'star' | 'diamond';

interface FloatingShape {
  type: ShapeType;
  color: string;
  size: number;
  startX: number;
  startY: number;
  speed: number;
  phaseA: number;
  phaseB: number;
  rotation: number;
}

const SHAPE_PALETTE = [
  '#6C5CE7', // accent
  '#A29BFE', // accentL
  '#FF6B6B', // coral
  '#00B894', // green
  '#D4A012', // gold
  '#0984E3', // blue
  '#FD79A8', // pink
  '#00CEC9', // teal
];

const SHAPE_TYPES: ShapeType[] = ['circle', 'square', 'triangle', 'star', 'diamond'];

// Deterministic PRNG so the field looks the same across renders for a given seed.
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateShapes(count: number, width: number, height: number, seed = 7): FloatingShape[] {
  const rand = mulberry32(seed);
  const out: FloatingShape[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      type: SHAPE_TYPES[Math.floor(rand() * SHAPE_TYPES.length)],
      color: SHAPE_PALETTE[Math.floor(rand() * SHAPE_PALETTE.length)],
      size: 12 + rand() * 28,
      startX: rand() * width,
      startY: rand() * height,
      speed: 0.3 + rand() * 0.6,
      phaseA: rand() * Math.PI * 2,
      phaseB: rand() * Math.PI * 2,
      rotation: rand() * 360,
    });
  }
  return out;
}

function StaticShape({ shape, opacity }: { shape: FloatingShape; opacity: number }) {
  const { type, color, size } = shape;
  if (type === 'circle') {
    return (
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={color} opacity={opacity} />
      </Svg>
    );
  }
  if (type === 'square') {
    return (
      <Svg width={size} height={size}>
        <Rect x={1} y={1} width={size - 2} height={size - 2} rx={size * 0.18} fill={color} opacity={opacity} />
      </Svg>
    );
  }
  if (type === 'triangle') {
    const points = `${size / 2},2 ${size - 2},${size - 2} 2,${size - 2}`;
    return (
      <Svg width={size} height={size}>
        <Polygon points={points} fill={color} opacity={opacity} />
      </Svg>
    );
  }
  if (type === 'diamond') {
    const points = `${size / 2},2 ${size - 2},${size / 2} ${size / 2},${size - 2} 2,${size / 2}`;
    return (
      <Svg width={size} height={size}>
        <Polygon points={points} fill={color} opacity={opacity} />
      </Svg>
    );
  }
  // star
  const cx = size / 2;
  const cy = size / 2;
  const rO = size / 2 - 1;
  const rI = rO * 0.42;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? rO : rI;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return (
    <Svg width={size} height={size}>
      <Polygon points={pts.join(' ')} fill={color} opacity={opacity} />
    </Svg>
  );
}

interface AnimatedShapeProps {
  shape: FloatingShape;
  clock: SharedValue<number>;
  opacity: number;
}

function AnimatedShape({ shape, clock, opacity }: AnimatedShapeProps) {
  const animatedStyle = useAnimatedStyle(() => {
    // clock value is in "seconds" thanks to the 600 over 600s timing above.
    const t = clock.value;
    const dx = Math.sin(t * shape.speed * 0.7 + shape.phaseA) * 30
             + Math.cos(t * shape.speed * 0.3 + shape.phaseB) * 15;
    const dy = Math.cos(t * shape.speed * 0.5 + shape.phaseA) * 25
             + Math.sin(t * shape.speed * 0.4 + shape.phaseB) * 10;
    return {
      transform: [
        { translateX: dx },
        { translateY: dy },
        { rotate: `${shape.rotation}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.shape,
        {
          left: shape.startX,
          top: shape.startY,
          width: shape.size,
          height: shape.size,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <StaticShape shape={shape} opacity={opacity} />
    </Animated.View>
  );
}

interface Props {
  /** 0-1 — opacity of each shape. Light theme uses ~0.06, dark ~0.08. */
  opacity?: number;
  /** Number of shapes — spec says 40. */
  count?: number;
  /** Optional explicit dimensions; defaults to screen dimensions. */
  width?: number;
  height?: number;
}

export function FloatingShapes({ opacity = 0.06, count = 40, width, height }: Props) {
  const dims = Dimensions.get('window');
  const w = width ?? dims.width;
  const h = height ?? dims.height;
  const shapes = useMemo(() => generateShapes(count, w, h), [count, w, h]);

  // Long-running linear clock — drives all shape drift. We deliberately use a
  // very long period (10 minutes) so a single withRepeat snap back to 0
  // happens well outside any realistic session on this screen; at 6-8%
  // opacity the shapes are near-invisible anyway.
  const clock = useSharedValue(0);
  useEffect(() => {
    clock.value = withRepeat(
      withTiming(600, { duration: 600000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [clock]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {shapes.map((shape, i) => (
        <AnimatedShape key={i} shape={shape} clock={clock} opacity={opacity} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shape: { position: 'absolute' },
});
