import React from 'react';
import Svg, { Path } from 'react-native-svg';

export interface ConnectorSegment {
  position: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  completed: boolean;
}

interface Props {
  segments: ConnectorSegment[];
  width: number;
  height: number;
}

/** Draws every visible path segment as Paths inside a SINGLE Svg
 *  element instead of 80 individual <Svg>s (one per segment, the old
 *  PathConnector pattern). One native Svg view + 80-160 cheap Path
 *  children scrolls way faster on both iOS and Android — fewer view
 *  hierarchy operations, fewer Defs/Stops, less reconciliation cost
 *  on every viewport-window change.
 *
 *  Each completed segment gets two Paths: a wide low-opacity halo
 *  underneath + the stroke on top, so the line reads as a soft glow.
 *  Locked segments get a single dashed stroke.
 *
 *  Curve: a quadratic-bezier control point offset perpendicular to
 *  the segment, scaled by length. Same algorithm the old
 *  PathConnector used. */
export function JourneyPathSvg({ segments, width, height }: Props) {
  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {/* First pass — glow halos under completed segments only. Drawn
       *  before the strokes so they sit underneath. */}
      {segments.map((s) => {
        if (!s.completed) return null;
        const d = bezierPath(s);
        return (
          <Path
            key={`glow-${s.position}`}
            d={d}
            stroke="#FFFFFF"
            strokeWidth={15}
            strokeLinecap="round"
            fill="none"
            opacity={0.22}
          />
        );
      })}
      {/* Second pass — the actual stroke for every segment. */}
      {segments.map((s) => {
        const d = bezierPath(s);
        return (
          <Path
            key={`line-${s.position}`}
            d={d}
            stroke={s.completed ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}
            strokeWidth={s.completed ? 5 : 3}
            strokeLinecap="round"
            fill="none"
            opacity={s.completed ? 0.95 : 0.5}
            strokeDasharray={s.completed ? undefined : '6,10'}
          />
        );
      })}
    </Svg>
  );
}

function bezierPath(s: ConnectorSegment): string {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const mx = (s.x1 + s.x2) / 2;
  const my = (s.y1 + s.y2) / 2;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const curveAmount = Math.min(len * 0.22, 34);
  const cx = mx + (-dy / len) * curveAmount;
  const cy = my + (dx / len) * curveAmount;
  return `M ${s.x1} ${s.y1} Q ${cx} ${cy} ${s.x2} ${s.y2}`;
}
