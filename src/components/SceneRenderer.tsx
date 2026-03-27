import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { Card } from './Card';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';
import { borderRadius } from '@/src/theme/spacing';
import type { SceneObject, ShapeType } from '@/src/types/game';

interface SceneRendererProps {
  objects: SceneObject[];
  visible: boolean;
}

const SHAPE_COLORS: Record<string, string> = {
  red: '#FF6B6B',
  blue: '#0984E3',
  green: '#00B894',
  yellow: '#FDCB6E',
  purple: '#6C5CE7',
  orange: '#E17055',
  pink: '#FD79A8',
  teal: '#00CEC9',
  brown: '#8B6914',
  grey: '#636E72',
  gray: '#636E72',
  black: '#1A1A18',
  white: '#FFFFFF',
};

function resolveColor(color: string): string {
  return SHAPE_COLORS[color.toLowerCase()] ?? color;
}

interface ShapeProps {
  object: SceneObject;
  index: number;
}

const ShapeComponent = React.memo(function ShapeComponent({
  object,
  index,
}: ShapeProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 200 }));
  }, [index, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const resolved = resolveColor(object.color);
  const sizePx = object.size * 1.2;

  return (
    <Animated.View
      style={[
        styles.objectWrapper,
        {
          left: `${object.x}%`,
          top: `${object.y}%`,
          zIndex: object.zIndex ?? 1,
          transform: [{ rotate: `${object.rotation ?? 0}deg` }],
        },
        animatedStyle,
      ]}
    >
      <ShapeRenderer
        type={object.type}
        color={resolved}
        size={sizePx}
        label={object.label}
      />
    </Animated.View>
  );
});

function ShapeRenderer({
  type,
  color,
  size,
  label,
}: {
  type: ShapeType;
  color: string;
  size: number;
  label?: string;
}) {
  switch (type) {
    case 'circle':
      return (
        <View
          style={[
            styles.shape,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
          ]}
        />
      );
    case 'square':
      return (
        <View
          style={[
            styles.shape,
            {
              width: size,
              height: size,
              borderRadius: borderRadius.sm,
              backgroundColor: color,
            },
          ]}
        />
      );
    case 'triangle':
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: size / 2,
            borderRightWidth: size / 2,
            borderBottomWidth: size,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
          }}
        />
      );
    case 'star':
      return (
        <Text style={{ fontSize: size * 0.8, color, lineHeight: size }}>
          \u2605
        </Text>
      );
    case 'diamond':
      return (
        <View
          style={[
            styles.shape,
            {
              width: size * 0.7,
              height: size * 0.7,
              backgroundColor: color,
              borderRadius: borderRadius.sm,
              transform: [{ rotate: '45deg' }],
            },
          ]}
        />
      );
    case 'hexagon':
      return (
        <View
          style={[
            styles.shape,
            {
              width: size,
              height: size * 0.85,
              borderRadius: size * 0.15,
              backgroundColor: color,
            },
          ]}
        />
      );
    case 'heart':
      return (
        <Text style={{ fontSize: size * 0.7, color, lineHeight: size }}>
          \u2665
        </Text>
      );
    case 'number':
    case 'letter':
      return (
        <View
          style={[
            styles.labelShape,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
          ]}
        >
          <Text style={[styles.labelText, { fontSize: size * 0.45 }]}>
            {label ?? '?'}
          </Text>
        </View>
      );
    default:
      return (
        <View
          style={[
            styles.shape,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
          ]}
        />
      );
  }
}

export const SceneRenderer = React.memo(function SceneRenderer({
  objects,
  visible,
}: SceneRendererProps) {
  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Card style={styles.sceneCard} padded={false}>
        <View style={styles.canvas}>
          {objects.map((obj, i) => (
            <ShapeComponent key={obj.id} object={obj} index={i} />
          ))}
        </View>
      </Card>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sceneCard: {
    aspectRatio: 1,
    width: '100%',
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  objectWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -20,
    marginTop: -20,
  },
  shape: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelShape: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
