import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Card } from './Card';
import { borderRadius } from '@/src/theme/spacing';
import type { SceneObject, ShapeType } from '@/src/types/game';
import { getGameObjectById } from '@/src/data/objectLibrary';

interface SceneRendererProps { objects: SceneObject[]; visible: boolean; }

const SHAPE_COLORS: Record<string, string> = { red:'#FF6B6B', blue:'#0984E3', green:'#00B894', yellow:'#FDCB6E', purple:'#6C5CE7', orange:'#E17055', pink:'#FD79A8', teal:'#00CEC9', brown:'#8B6914', grey:'#636E72', gray:'#636E72', black:'#1A1A18', white:'#FFFFFF' };
function resolveColor(color: string): string { return SHAPE_COLORS[color.toLowerCase()] ?? color; }

/** Resolve the object type to a renderable shape type using the library */
function resolveShapeType(type: string): ShapeType {
  const libItem = getGameObjectById(type);
  if (libItem) return libItem.shapeType as ShapeType;
  return type as ShapeType;
}

/** Resolve the label for number/letter objects using the library */
function resolveLabel(type: string, label?: string): string | undefined {
  if (label) return label;
  const libItem = getGameObjectById(type);
  return libItem?.label;
}

const ShapeComponent = React.memo(function ShapeComponent({ object, index }: { object: SceneObject; index: number }) {
  const opacity = useSharedValue(0);
  useEffect(() => { opacity.value = withDelay(index * 50, withTiming(1, { duration: 200 })); }, [index, opacity]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const resolved = resolveColor(object.color);
  const sizePx = object.size * 1.2;
  const shapeType = resolveShapeType(object.type);
  const label = resolveLabel(object.type, object.label);
  return (
    <Animated.View style={[styles.objectWrapper, { left: `${object.x}%`, top: `${object.y}%`, zIndex: object.zIndex ?? 1, transform: [{ rotate: `${object.rotation ?? 0}deg` }] }, animatedStyle]}>
      <ShapeRenderer type={shapeType} color={resolved} size={sizePx} label={label} />
    </Animated.View>
  );
});

function ShapeRenderer({ type, color, size, label }: { type: ShapeType; color: string; size: number; label?: string }) {
  switch (type) {
    case 'circle': return <View style={[styles.shape, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />;
    case 'square': return <View style={[styles.shape, { width: size, height: size, borderRadius: borderRadius.sm, backgroundColor: color }]} />;
    case 'triangle': return <View style={{ width: 0, height: 0, borderLeftWidth: size / 2, borderRightWidth: size / 2, borderBottomWidth: size, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }} />;
    case 'star': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color} /></Svg>;
    case 'diamond': return <View style={[styles.shape, { width: size * 0.7, height: size * 0.7, backgroundColor: color, borderRadius: borderRadius.sm, transform: [{ rotate: '45deg' }] }]} />;
    case 'hexagon': return <View style={[styles.shape, { width: size, height: size * 0.85, borderRadius: size * 0.15, backgroundColor: color }]} />;
    case 'heart': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} /></Svg>;
    case 'number': case 'letter': return <View style={[styles.labelShape, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}><Text style={[styles.labelText, { fontSize: size * 0.45 }]}>{label ?? '?'}</Text></View>;
    default: return <View style={[styles.shape, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />;
  }
}

export const SceneRenderer = React.memo(function SceneRenderer({ objects, visible }: SceneRendererProps) {
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <Card style={styles.sceneCard} padded={false}>
        <View style={styles.canvas}>{objects.map((obj, i) => <ShapeComponent key={obj.id} object={obj} index={i} />)}</View>
      </Card>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sceneCard: { aspectRatio: 1, width: '100%', overflow: 'hidden' },
  canvas: { flex: 1, position: 'relative' },
  objectWrapper: { position: 'absolute', alignItems: 'center', justifyContent: 'center', marginLeft: -20, marginTop: -20 },
  shape: { alignItems: 'center', justifyContent: 'center' },
  labelShape: { alignItems: 'center', justifyContent: 'center' },
  labelText: { color: '#FFFFFF', fontWeight: '700' },
});
