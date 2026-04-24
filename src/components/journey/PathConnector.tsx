import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  opacity?: number;
  dashed?: boolean;
  width?: number;
}

/** Draws a quadratic-bezier curved line between two node centers. The
 *  control point is offset perpendicular to the direct line so the path
 *  feels organic rather than geometric. */
export function PathConnector({
  x1,
  y1,
  x2,
  y2,
  color,
  opacity = 1,
  dashed = false,
  width = 4,
}: Props) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Perpendicular offset gives the curve its bend.
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const curveAmount = Math.min(len * 0.2, 30);
  const cx = mx + (-dy / len) * curveAmount;
  const cy = my + (dx / len) * curveAmount;

  const minX = Math.min(x1, x2, cx) - width;
  const minY = Math.min(y1, y2, cy) - width;
  const maxX = Math.max(x1, x2, cx) + width;
  const maxY = Math.max(y1, y2, cy) + width;
  const svgWidth = maxX - minX;
  const svgHeight = maxY - minY;

  const d = `M ${x1 - minX} ${y1 - minY} Q ${cx - minX} ${cy - minY} ${x2 - minX} ${y2 - minY}`;

  return (
    <Svg
      width={svgWidth}
      height={svgHeight}
      style={{ position: 'absolute', left: minX, top: minY }}
      pointerEvents="none"
    >
      <Path
        d={d}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        fill="none"
        opacity={opacity}
        strokeDasharray={dashed ? '6,8' : undefined}
      />
    </Svg>
  );
}
