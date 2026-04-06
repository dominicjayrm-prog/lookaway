import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, FadeIn, Easing } from 'react-native-reanimated';
import Svg, { Path, Circle as SvgCircle, Rect as SvgRect, Line, Polygon, Ellipse } from 'react-native-svg';
import { Card } from './Card';
import { borderRadius } from '@/src/theme/spacing';
import type { SceneObject, ShapeType } from '@/src/types/game';
import { getGameObjectById } from '@/src/data/objectLibrary';

const isWeb = Platform.OS === 'web';

interface SceneRendererProps { objects: SceneObject[]; visible: boolean; viewTime?: number; }

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

const ShapeComponent = React.memo(function ShapeComponent({ object, index, viewTime }: { object: SceneObject; index: number; viewTime?: number }) {
  const opacity = useSharedValue(0);
  const hasMovement = object.endX != null && object.endY != null;
  const posX = useSharedValue(object.x);
  const posY = useSharedValue(object.y);

  useEffect(() => {
    opacity.value = withDelay(index * 50, withTiming(1, { duration: 200 }));
    // Animate movement if endX/endY are set (World 4+)
    if (hasMovement && viewTime) {
      posX.value = object.x;
      posY.value = object.y;
      const duration = viewTime * 1000;
      posX.value = withDelay(200, withTiming(object.endX!, { duration, easing: Easing.inOut(Easing.quad) }));
      posY.value = withDelay(200, withTiming(object.endY!, { duration, easing: Easing.inOut(Easing.quad) }));
    }
  }, [index, opacity, hasMovement, viewTime, object.x, object.y, object.endX, object.endY, posX, posY]);

  const animatedStyle = useAnimatedStyle(() => {
    if (hasMovement) {
      return { opacity: opacity.value, left: `${posX.value}%`, top: `${posY.value}%` };
    }
    return { opacity: opacity.value };
  });

  const resolved = resolveColor(object.color);
  const sizePx = object.size * 1.2;
  const shapeType = resolveShapeType(object.type);
  const label = resolveLabel(object.type, object.label);
  const content = object.content;
  const staticPos = hasMovement ? {} : { left: `${object.x}%`, top: `${object.y}%` };
  return (
    <Animated.View style={[styles.objectWrapper, staticPos, { zIndex: object.zIndex ?? 1, transform: [{ rotate: `${object.rotation ?? 0}deg` }] }, animatedStyle]}>
      <ShapeRenderer type={shapeType} color={resolved} size={sizePx} label={label} objectType={object.type} />
      {content && (
        <View style={[styles.contentOverlay, { width: sizePx, height: sizePx }]}>
          <Text style={[styles.contentText, { fontSize: Math.max(sizePx * 0.38, 12), textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]}>{content}</Text>
        </View>
      )}
    </Animated.View>
  );
});

/** Real-world object SVG renderers for World 5+ */
const OBJ_SVG: Record<string, (c: string) => React.ReactElement> = {
  car: (c) => <><SvgRect x={2} y={10} width={20} height={8} rx={2} fill={c} /><Path d="M5,10 L7,4 L17,4 L19,10" fill={c} /><SvgCircle cx={7} cy={18} r={2.5} fill="#333" /><SvgCircle cx={17} cy={18} r={2.5} fill="#333" /></>,
  house: (c) => <><Path d="M12,2 L22,10 L22,22 L2,22 L2,10Z" fill={c} /><SvgRect x={9} y={14} width={6} height={8} fill="rgba(255,255,255,0.4)" /></>,
  tree: (c) => <><SvgRect x={10} y={16} width={4} height={6} fill="#8B6914" /><Path d="M12,2 L20,16 L4,16Z" fill={c} /></>,
  key: (c) => <><SvgCircle cx={8} cy={8} r={5} fill="none" stroke={c} strokeWidth={2.5} /><Line x1={13} y1={8} x2={22} y2={8} stroke={c} strokeWidth={2.5} /><Line x1={18} y1={8} x2={18} y2={12} stroke={c} strokeWidth={2} /></>,
  book: (c) => <><SvgRect x={4} y={2} width={16} height={20} rx={2} fill={c} /><Line x1={8} y1={2} x2={8} y2={22} stroke="rgba(255,255,255,0.3)" strokeWidth={1} /></>,
  cup: (c) => <><Path d="M5,4 L5,18 C5,20 8,22 12,22 C16,22 19,20 19,18 L19,4Z" fill={c} /><Path d="M19,8 C22,8 23,11 22,14 C21,16 19,16 19,14" fill="none" stroke={c} strokeWidth={2} /></>,
  clock: (c) => <><SvgCircle cx={12} cy={12} r={10} fill={c} /><SvgCircle cx={12} cy={12} r={8.5} fill="rgba(255,255,255,0.3)" /><Line x1={12} y1={12} x2={12} y2={6} stroke="white" strokeWidth={1.5} /><Line x1={12} y1={12} x2={16} y2={14} stroke="white" strokeWidth={1.5} /></>,
  umbrella: (c) => <><Path d="M12,4 C6,4 2,8 2,12 L12,12 L22,12 C22,8 18,4 12,4Z" fill={c} /><Line x1={12} y1={12} x2={12} y2={21} stroke={c} strokeWidth={2} /></>,
  phone: (c) => <><SvgRect x={6} y={1} width={12} height={22} rx={3} fill={c} /><SvgRect x={8} y={4} width={8} height={13} rx={1} fill="rgba(255,255,255,0.3)" /></>,
  lightbulb: (c) => <><Path d="M12,2 C8,2 5,5 5,9 C5,12 7,14 8,15 L8,18 L16,18 L16,15 C17,14 19,12 19,9 C19,5 16,2 12,2Z" fill={c} /><SvgRect x={9} y={18} width={6} height={2} rx={1} fill={c} opacity={0.7} /></>,
  flower: (c) => <><SvgCircle cx={12} cy={10} r={3} fill={c} /><SvgCircle cx={8} cy={7} r={3} fill={c} opacity={0.8} /><SvgCircle cx={16} cy={7} r={3} fill={c} opacity={0.8} /><SvgCircle cx={8} cy={13} r={3} fill={c} opacity={0.8} /><SvgCircle cx={16} cy={13} r={3} fill={c} opacity={0.8} /><SvgCircle cx={12} cy={10} r={2} fill="#F9CA24" /><Line x1={12} y1={13} x2={12} y2={22} stroke="#00B894" strokeWidth={2} /></>,
  sun: (c) => <><SvgCircle cx={12} cy={12} r={5} fill={c} /><Line x1={12} y1={2} x2={12} y2={5} stroke={c} strokeWidth={2} /><Line x1={12} y1={19} x2={12} y2={22} stroke={c} strokeWidth={2} /><Line x1={2} y1={12} x2={5} y2={12} stroke={c} strokeWidth={2} /><Line x1={19} y1={12} x2={22} y2={12} stroke={c} strokeWidth={2} /></>,
  cloud: (c) => <><SvgCircle cx={10} cy={13} r={5} fill={c} /><SvgCircle cx={15} cy={11} r={6} fill={c} /><SvgCircle cx={20} cy={14} r={4} fill={c} /><SvgRect x={5} y={13} width={19} height={6} fill={c} /></>,
  cat: (c) => <><SvgCircle cx={12} cy={14} r={8} fill={c} /><Path d="M5,8 L4,2 L9,6Z" fill={c} /><Path d="M19,8 L20,2 L15,6Z" fill={c} /><SvgCircle cx={9} cy={12} r={1.5} fill="white" /><SvgCircle cx={15} cy={12} r={1.5} fill="white" /><Ellipse cx={12} cy={15} rx={1.5} ry={1} fill="#333" /></>,
  dog: (c) => <><SvgCircle cx={12} cy={13} r={8} fill={c} /><Ellipse cx={7} cy={6} rx={3} ry={5} fill={c} /><Ellipse cx={17} cy={6} rx={3} ry={5} fill={c} /><SvgCircle cx={9} cy={11} r={1.5} fill="white" /><SvgCircle cx={15} cy={11} r={1.5} fill="white" /><Ellipse cx={12} cy={15} rx={2.5} ry={2} fill="#333" /></>,
  fish: (c) => <><Ellipse cx={12} cy={12} rx={9} ry={6} fill={c} /><Path d="M21,12 L24,8 L24,16Z" fill={c} /><SvgCircle cx={8} cy={11} r={1.5} fill="white" /></>,
  bird: (c) => <><Ellipse cx={12} cy={12} rx={7} ry={5} fill={c} /><SvgCircle cx={7} cy={10} r={4} fill={c} /><Path d="M3,10 L1,9 L3,11Z" fill="#E17055" /><SvgCircle cx={6} cy={9} r={1} fill="white" /></>,
  butterfly: (c) => <><Ellipse cx={8} cy={9} rx={5} ry={6} fill={c} opacity={0.8} /><Ellipse cx={16} cy={9} rx={5} ry={6} fill={c} opacity={0.8} /><Ellipse cx={8} cy={16} rx={4} ry={5} fill={c} opacity={0.6} /><Ellipse cx={16} cy={16} rx={4} ry={5} fill={c} opacity={0.6} /><Line x1={12} y1={4} x2={12} y2={20} stroke="#333" strokeWidth={1.5} /></>,
  rabbit: (c) => <><SvgCircle cx={12} cy={15} r={7} fill={c} /><Ellipse cx={9} cy={4} rx={2.5} ry={7} fill={c} /><Ellipse cx={15} cy={4} rx={2.5} ry={7} fill={c} /><SvgCircle cx={10} cy={13} r={1} fill="white" /><SvgCircle cx={14} cy={13} r={1} fill="white" /></>,
  turtle: (c) => <><Ellipse cx={12} cy={14} rx={9} ry={6} fill={c} /><SvgCircle cx={4} cy={12} r={2.5} fill={c} /><SvgCircle cx={5} cy={18} r={2} fill={c} opacity={0.6} /><SvgCircle cx={19} cy={18} r={2} fill={c} opacity={0.6} /></>,
  frog: (c) => <><Ellipse cx={12} cy={14} rx={8} ry={6} fill={c} /><SvgCircle cx={7} cy={8} r={3.5} fill={c} /><SvgCircle cx={17} cy={8} r={3.5} fill={c} /><SvgCircle cx={7} cy={7} r={2} fill="white" /><SvgCircle cx={17} cy={7} r={2} fill="white" /></>,
  bee: (c) => <><Ellipse cx={12} cy={13} rx={6} ry={7} fill={c} /><SvgRect x={6} y={10} width={12} height={2.5} fill="#333" /><SvgRect x={6} y={15} width={12} height={2.5} fill="#333" /></>,
  ladybug: (c) => <><SvgCircle cx={12} cy={13} r={8} fill={c} /><Line x1={12} y1={5} x2={12} y2={21} stroke="#333" strokeWidth={1.5} /><SvgCircle cx={8} cy={10} r={1.5} fill="#333" /><SvgCircle cx={16} cy={10} r={1.5} fill="#333" /><SvgCircle cx={12} cy={5} r={3} fill="#333" /></>,
  pizza: (c) => <><Path d="M12,4 L22,20 L2,20Z" fill={c} /><SvgCircle cx={10} cy={14} r={1.5} fill="#E17055" /><SvgCircle cx={14} cy={16} r={1.5} fill="#E17055" /></>,
  cake: (c) => <><SvgRect x={4} y={10} width={16} height={12} rx={2} fill={c} /><SvgRect x={3} y={8} width={18} height={4} rx={2} fill={c} opacity={0.8} /><Line x1={12} y1={4} x2={12} y2={8} stroke="#8B6914" strokeWidth={1.5} /><SvgCircle cx={12} cy={3} r={1.5} fill="#FF9500" /></>,
  cookie: (c) => <><SvgCircle cx={12} cy={12} r={9} fill={c} /><SvgCircle cx={8} cy={9} r={1.5} fill="#5D4037" /><SvgCircle cx={14} cy={8} r={1} fill="#5D4037" /><SvgCircle cx={10} cy={14} r={1.5} fill="#5D4037" /></>,
  icecream: (c) => <><Path d="M12,22 L7,10 L17,10Z" fill="#F9CA24" /><SvgCircle cx={12} cy={8} r={5} fill={c} /></>,
  donut: (c) => <><SvgCircle cx={12} cy={12} r={9} fill={c} /><SvgCircle cx={12} cy={12} r={3.5} fill="white" /></>,
  watermelon: (c) => <><Path d="M2,14 Q12,0 22,14Z" fill={c} /><Path d="M4,14 Q12,3 20,14Z" fill="#FF6B6B" /></>,
  cherry: (c) => <><SvgCircle cx={8} cy={16} r={5} fill={c} /><SvgCircle cx={16} cy={16} r={5} fill={c} /><Path d="M8,11 Q10,4 12,3 Q14,4 16,11" fill="none" stroke="#00B894" strokeWidth={1.5} /></>,
  coffee: (c) => <><SvgRect x={5} y={8} width={12} height={14} rx={2} fill={c} /><Path d="M17,11 C20,11 21,14 20,16 C19,18 17,17 17,15" fill="none" stroke={c} strokeWidth={2} /></>,
  banana: (c) => <><Path d="M6,20 Q2,12 8,4 Q12,4 14,8 Q8,14 6,20Z" fill={c} /></>,
  lemon: (c) => <><Ellipse cx={12} cy={12} rx={8} ry={6} fill={c} /></>,
  apple: (c) => <><SvgCircle cx={12} cy={14} r={8} fill={c} /><Line x1={12} y1={6} x2={13} y2={3} stroke="#8B6914" strokeWidth={1.5} /><Path d="M13,4 Q16,2 15,5" fill="#00B894" /></>,
  moon_obj: (c) => <><Path d="M12,2 A10,10 0 1,0 12,22 A6,6 0 1,1 12,2Z" fill={c} /></>,
};

function ShapeRenderer({ type, color, size, label, objectType }: { type: ShapeType; color: string; size: number; label?: string; objectType?: string }) {
  // Real-world object SVG (World 5+)
  if (objectType && OBJ_SVG[objectType]) {
    return <Svg width={size} height={size} viewBox="0 0 24 24">{OBJ_SVG[objectType](color)}</Svg>;
  }
  switch (type) {
    case 'circle': return <View style={[styles.shape, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />;
    case 'square': return <View style={[styles.shape, { width: size, height: size, borderRadius: borderRadius.sm, backgroundColor: color }]} />;
    case 'triangle': return <View style={{ width: 0, height: 0, borderLeftWidth: size / 2, borderRightWidth: size / 2, borderBottomWidth: size, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color }} />;
    case 'star': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color} /></Svg>;
    case 'diamond': return <View style={[styles.shape, { width: size * 0.7, height: size * 0.7, backgroundColor: color, borderRadius: borderRadius.sm, transform: [{ rotate: '45deg' }] }]} />;
    case 'hexagon': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22,7 22,17 12,22 2,17 2,7" fill={color} /></Svg>;
    case 'pentagon': return <Svg width={size} height={size} viewBox="0 0 24 24"><Polygon points="12,2 22,9 19,21 5,21 2,9" fill={color} /></Svg>;
    case 'oval': return <View style={[styles.shape, { width: size, height: size * 0.65, borderRadius: size / 2, backgroundColor: color }]} />;
    case 'heart': return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} /></Svg>;
    case 'number': case 'letter': return <View style={[styles.labelShape, { width: size, height: size, borderRadius: type === 'letter' ? borderRadius.sm : size / 2, backgroundColor: color }]}><Text style={[styles.labelText, { fontSize: size * 0.45 }]}>{label ?? '?'}</Text></View>;
    default: return <View style={[styles.shape, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />;
  }
}

export const SceneRenderer = React.memo(function SceneRenderer({ objects, visible, viewTime }: SceneRendererProps) {
  if (!visible) return null;
  return (
    <Animated.View entering={isWeb ? undefined : FadeIn.duration(300)}>
      <Card style={styles.sceneCard} padded={false}>
        <View style={styles.canvas}>{objects.map((obj, i) => <ShapeComponent key={obj.id} object={obj} index={i} viewTime={viewTime} />)}</View>
      </Card>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sceneCard: { aspectRatio: 1, width: '100%', overflow: 'hidden' },
  canvas: { flex: 1, position: 'relative' },
  objectWrapper: { position: 'absolute', alignItems: 'center', justifyContent: 'center', marginLeft: -20, marginTop: -20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  shape: { alignItems: 'center', justifyContent: 'center' },
  labelShape: { alignItems: 'center', justifyContent: 'center' },
  labelText: { color: '#FFFFFF', fontWeight: '700' },
  contentOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  contentText: { color: '#FFFFFF', fontWeight: '800' },
});
