/**
 * BrainRadarChart — 6-axis spider chart for the Memory Analytics screen.
 *
 * - 4 concentric reference polygons at 25%, 50%, 75%, 100%
 * - 6 axis lines radiating from the centre
 * - Filled data polygon with stroke
 * - Labelled vertices + numeric value callouts
 *
 * Pure SVG, no animation — the chart fades into view via the parent's
 * staggered layout animation.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Polygon, G } from 'react-native-svg';
import type { BrainProfile, BrainProfileKey } from '@/src/utils/memoryAnalytics';

interface Theme {
  title: string;
  muted: string;
  radarGrid: string;
  radarAxis: string;
  radarFill: string;
  radarLabel: string;
}

interface Props {
  profile: BrainProfile;
  size?: number;
  accent?: string;
  theme: Theme;
}

const DIMENSIONS: { key: BrainProfileKey; label: string }[] = [
  { key: 'visual',      label: 'Visual' },
  { key: 'spatial',     label: 'Spatial' },
  { key: 'sequence',    label: 'Sequence' },
  { key: 'speed',       label: 'Speed' },
  { key: 'focus',       label: 'Focus' },
  { key: 'consistency', label: 'Consistency' },
];

export function BrainRadarChart({ profile, size = 260, accent = '#6C5CE7', theme }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  // Leave room around the chart for the outer labels.
  const chartRadius = size * 0.36;
  const labelRadius = size * 0.46;
  const valueRadius = chartRadius * 1.08;

  // Vertex at top (-90deg), then clockwise.
  const axisAngle = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI) / DIMENSIONS.length;

  const gridLevels = [0.25, 0.5, 0.75, 1];

  const dataPoints = DIMENSIONS.map((dim, i) => {
    const value = profile[dim.key] / 100;
    const r = chartRadius * value;
    const a = axisAngle(i);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  const polygonPoints = (scale: number) =>
    DIMENSIONS.map((_, i) => {
      const a = axisAngle(i);
      return `${cx + chartRadius * scale * Math.cos(a)},${cy + chartRadius * scale * Math.sin(a)}`;
    }).join(' ');

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.heading, { color: theme.muted }]}>BRAIN PROFILE</Text>
      <View style={{ width: size, height: size, alignSelf: 'center' }}>
        <Svg width={size} height={size}>
          {/* Grid polygons */}
          {gridLevels.map((lvl) => (
            <Polygon
              key={lvl}
              points={polygonPoints(lvl)}
              fill="none"
              stroke={theme.radarGrid}
              strokeWidth={1}
            />
          ))}

          {/* Axis lines */}
          <G>
            {DIMENSIONS.map((_, i) => {
              const a = axisAngle(i);
              return (
                <Line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={cx + chartRadius * Math.cos(a)}
                  y2={cy + chartRadius * Math.sin(a)}
                  stroke={theme.radarAxis}
                  strokeWidth={1}
                />
              );
            })}
          </G>

          {/* Data polygon */}
          <Polygon
            points={dataPolygon}
            fill={theme.radarFill}
            stroke={accent}
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Vertex dots */}
          {dataPoints.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={accent}
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          ))}
        </Svg>

        {/* Absolutely-positioned labels around the chart, anchored at their */}
        {/* angle. We rely on fixed-width containers so the text stays centred */}
        {/* on its vertex regardless of label length. */}
        {DIMENSIONS.map((dim, i) => {
          const a = axisAngle(i);
          const lx = cx + labelRadius * Math.cos(a);
          const ly = cy + labelRadius * Math.sin(a);
          return (
            <View
              key={dim.key}
              style={[
                styles.labelAnchor,
                { left: lx - LABEL_HALF, top: ly - 8 },
              ]}
              pointerEvents="none"
            >
              <Text style={[styles.label, { color: theme.radarLabel }]} numberOfLines={1}>
                {dim.label}
              </Text>
            </View>
          );
        })}

        {/* Numeric value callouts, placed just outside each data vertex along */}
        {/* the same axis so long values never overlap the polygon. */}
        {DIMENSIONS.map((dim, i) => {
          const a = axisAngle(i);
          const vx = cx + valueRadius * Math.cos(a) + (profile[dim.key] / 100) * chartRadius * 0.08 * Math.cos(a);
          const vy = cy + valueRadius * Math.sin(a) + (profile[dim.key] / 100) * chartRadius * 0.08 * Math.sin(a);
          return (
            <View
              key={`v-${dim.key}`}
              style={[styles.valueAnchor, { left: vx - 14, top: vy - 7 }]}
              pointerEvents="none"
            >
              <Text style={[styles.valueText, { color: accent }]}>{profile[dim.key]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const LABEL_WIDTH = 72;
const LABEL_HALF = LABEL_WIDTH / 2;

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', width: '100%', marginTop: 24 },
  heading: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  labelAnchor: {
    position: 'absolute',
    width: LABEL_WIDTH,
    alignItems: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  valueAnchor: {
    position: 'absolute',
    width: 28,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 8,
    fontWeight: '800',
  },
});
