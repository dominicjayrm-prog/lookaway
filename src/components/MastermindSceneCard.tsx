/**
 * Renders a Mastermind stage's shapes on a white card canvas.
 *
 * Uses the same percentage-based positioning as the main SceneRenderer
 * (x/y in 0-100 range) but renders simpler shape primitives since
 * Mastermind uses a fixed set of shapes without labels or content.
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Rect, Polygon, Path } from 'react-native-svg';
import type { MastermindShape } from '@/src/data/mastermindLevels';

const CARD_SIZE = Math.min(Dimensions.get('window').width - 48, 360);
const SHAPE_SIZE = 32;

function renderShape(shape: MastermindShape, cardW: number, cardH: number) {
  const cx = (shape.position.x / 100) * cardW;
  const cy = (shape.position.y / 100) * cardH;
  const r = SHAPE_SIZE / 2;

  switch (shape.type) {
    case 'circle':
      return <Circle key={shape.id} cx={cx} cy={cy} r={r} fill={shape.colour} />;
    case 'square':
      return <Rect key={shape.id} x={cx - r} y={cy - r} width={SHAPE_SIZE} height={SHAPE_SIZE} rx={4} fill={shape.colour} />;
    case 'triangle': {
      const pts = `${cx},${cy - r} ${cx - r},${cy + r * 0.8} ${cx + r},${cy + r * 0.8}`;
      return <Polygon key={shape.id} points={pts} fill={shape.colour} />;
    }
    case 'star': {
      const points: string[] = [];
      for (let i = 0; i < 5; i++) {
        const oa = (i * 72 - 90) * Math.PI / 180;
        const ia = ((i * 72) + 36 - 90) * Math.PI / 180;
        points.push(`${cx + r * Math.cos(oa)},${cy + r * Math.sin(oa)}`);
        points.push(`${cx + r * 0.4 * Math.cos(ia)},${cy + r * 0.4 * Math.sin(ia)}`);
      }
      return <Polygon key={shape.id} points={points.join(' ')} fill={shape.colour} />;
    }
    case 'diamond': {
      const d = `M${cx},${cy - r} L${cx + r * 0.7},${cy} L${cx},${cy + r} L${cx - r * 0.7},${cy} Z`;
      return <Path key={shape.id} d={d} fill={shape.colour} />;
    }
    default:
      return <Circle key={shape.id} cx={cx} cy={cy} r={r} fill={shape.colour} />;
  }
}

interface Props {
  shapes: MastermindShape[];
  opacity?: number;
}

export function MastermindSceneCard({ shapes, opacity = 1 }: Props) {
  return (
    <View style={[st.card, { opacity }]}>
      <Svg width={CARD_SIZE} height={CARD_SIZE * 0.7} viewBox={`0 0 ${CARD_SIZE} ${CARD_SIZE * 0.7}`}>
        {shapes.map((s) => renderShape(s, CARD_SIZE, CARD_SIZE * 0.7))}
      </Svg>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE * 0.7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
});
