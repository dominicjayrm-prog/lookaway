import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  /** Secondary colour for the completed-segment gradient. When omitted,
   *  a subtly lighter variant of `color` is used. */
  endColor?: string;
  opacity?: number;
  dashed?: boolean;
  width?: number;
  /** Adds a wider, lower-opacity halo line underneath — gives completed
   *  segments the "glow" you'd see on a premium map screen. */
  glow?: boolean;
  /** Unique id for the gradient def so two connectors in the same SVG
   *  tree don't clobber each other. */
  keyId?: string | number;
}

/** Quadratic-bezier connector between two node centers. Used twice per
 *  segment on the journey — once for the glow halo (wide, soft, low
 *  opacity) and once for the line itself. Keeping the two passes in one
 *  component simplifies the parent render. */
export function PathConnector({
  x1,
  y1,
  x2,
  y2,
  color,
  endColor,
  opacity = 1,
  dashed = false,
  width = 4,
  glow = false,
  keyId,
}: Props) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const curveAmount = Math.min(len * 0.22, 34);
  const cx = mx + (-dy / len) * curveAmount;
  const cy = my + (dx / len) * curveAmount;

  const minX = Math.min(x1, x2, cx) - width - (glow ? 8 : 0);
  const minY = Math.min(y1, y2, cy) - width - (glow ? 8 : 0);
  const maxX = Math.max(x1, x2, cx) + width + (glow ? 8 : 0);
  const maxY = Math.max(y1, y2, cy) + width + (glow ? 8 : 0);
  const svgWidth = maxX - minX;
  const svgHeight = maxY - minY;

  const d = `M ${x1 - minX} ${y1 - minY} Q ${cx - minX} ${cy - minY} ${x2 - minX} ${y2 - minY}`;
  const gradId = `pc-${keyId ?? `${Math.round(x1)}-${Math.round(y1)}`}`;
  const finalEndColor = endColor ?? color;

  return (
    <Svg
      width={svgWidth}
      height={svgHeight}
      style={{ position: 'absolute', left: minX, top: minY }}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
          <Stop offset="100%" stopColor={finalEndColor} stopOpacity={opacity} />
        </LinearGradient>
      </Defs>
      {/* Glow halo — wide soft line underneath. Only drawn on completed
          segments so locked path stays quiet. */}
      {glow && (
        <Path
          d={d}
          stroke={color}
          strokeWidth={width + 10}
          strokeLinecap="round"
          fill="none"
          opacity={0.22}
        />
      )}
      <Path
        d={d}
        stroke={dashed ? color : `url(#${gradId})`}
        strokeWidth={width}
        strokeLinecap="round"
        fill="none"
        opacity={dashed ? opacity : 1}
        strokeDasharray={dashed ? '6,10' : undefined}
      />
    </Svg>
  );
}
