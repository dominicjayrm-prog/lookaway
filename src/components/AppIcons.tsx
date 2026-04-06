/**
 * AppIcons — Premium SVG icon library.
 * Replaces emojis across the app for a clean, consistent look.
 * All icons accept `size` and `color` props.
 */
import React from 'react';
import Svg, { Path, Circle, Rect, Polygon, Line, G } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

// ── Game / Economy ────────────────────────────────────────────────────

export function GemIcon({ size = 20, color = '#6C5CE7' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3h12l4 7-10 12L2 10l4-7z" fill={color} opacity={0.2} />
      <Path d="M6 3h12l4 7-10 12L2 10l4-7z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M2 10h20M12 22L8 10l4-7 4 7-4 12z" stroke={color} strokeWidth={1.2} strokeLinejoin="round" opacity={0.5} />
    </Svg>
  );
}

export function HeartIcon({ size = 20, color = '#FF6B6B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} />
    </Svg>
  );
}

export function StarIcon({ size = 20, color = '#D4A012' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color} />
    </Svg>
  );
}

export function CrownIcon({ size = 20, color = '#D4A012' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 16L3 6l5 4 4-6 4 6 5-4-2 10H5z" fill={color} opacity={0.2} />
      <Path d="M5 16L3 6l5 4 4-6 4 6 5-4-2 10H5z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Rect x={4} y={16} width={16} height={3} rx={1} fill={color} />
    </Svg>
  );
}

export function FireIcon({ size = 20, color = '#FF6B6B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2c0 0-4.5 5-4.5 9.5C7.5 14.54 9.46 17 12 17s4.5-2.46 4.5-5.5C16.5 7 12 2 12 2z" fill={color} opacity={0.3} />
      <Path d="M12 2c0 0-4.5 5-4.5 9.5C7.5 14.54 9.46 17 12 17s4.5-2.46 4.5-5.5C16.5 7 12 2 12 2z" stroke={color} strokeWidth={1.8} />
      <Path d="M12 10c0 0-2 2.5-2 4.5C10 15.88 10.9 17 12 17s2-1.12 2-2.5c0-2-2-4.5-2-4.5z" fill={color} />
    </Svg>
  );
}

export function TargetIcon({ size = 20, color = '#0984E3' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={5.5} stroke={color} strokeWidth={1.5} />
      <Circle cx={12} cy={12} r={2} fill={color} />
    </Svg>
  );
}

// ── Power-ups ─────────────────────────────────────────────────────────

export function TimerIcon({ size = 20, color = '#0984E3' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={13} r={8} stroke={color} strokeWidth={1.8} />
      <Path d="M12 9v4l3 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={10} y1={3} x2={14} y2={3} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function EyeIcon({ size = 20, color = '#00B894' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke={color} strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={3} fill={color} />
    </Svg>
  );
}

export function ScissorsIcon({ size = 20, color = '#F9CA24' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={6} cy={6} r={3} stroke={color} strokeWidth={1.8} />
      <Circle cx={6} cy={18} r={3} stroke={color} strokeWidth={1.8} />
      <Line x1={8.59} y1={15.41} x2={20} y2={4} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={8.59} y1={8.59} x2={20} y2={20} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function BoltIcon({ size = 20, color = '#F9CA24' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} opacity={0.2} />
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

// ── Modes & Features ──────────────────────────────────────────────────

export function BrainIcon({ size = 20, color = '#6C5CE7' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C9 2 7 4 7 6.5c0 .8.2 1.5.5 2C5.5 9 4 11 4 13c0 2.5 1.5 4.5 4 5 .5 1.5 2 3 4 3s3.5-1.5 4-3c2.5-.5 4-2.5 4-5 0-2-1.5-4-3.5-4.5.3-.5.5-1.2.5-2C17 4 15 2 12 2z" fill={color} opacity={0.2} />
      <Path d="M12 2C9 2 7 4 7 6.5c0 .8.2 1.5.5 2C5.5 9 4 11 4 13c0 2.5 1.5 4.5 4 5 .5 1.5 2 3 4 3s3.5-1.5 4-3c2.5-.5 4-2.5 4-5 0-2-1.5-4-3.5-4.5.3-.5.5-1.2.5-2C17 4 15 2 12 2z" stroke={color} strokeWidth={1.8} />
      <Line x1={12} y1={6} x2={12} y2={21} stroke={color} strokeWidth={1} opacity={0.4} />
    </Svg>
  );
}

export function CalendarIcon({ size = 20, color = '#0984E3' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={18} rx={3} stroke={color} strokeWidth={1.8} />
      <Line x1={3} y1={10} x2={21} y2={10} stroke={color} strokeWidth={1.5} />
      <Line x1={8} y1={2} x2={8} y2={6} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Line x1={16} y1={2} x2={16} y2={6} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function SwordsIcon({ size = 20, color = '#E17055' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={4} x2={16} y2={16} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4 4l3-1 1 3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={20} y1={4} x2={8} y2={16} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M20 4l-3-1-1 3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1={14} y1={18} x2={18} y2={22} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={6} y1={18} x2={2} y2={22} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function FlexIcon({ size = 20, color = '#E17055' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 12.5C7 8 9 4 12 4s5 4 5 8.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M5 14c0 3.5 3 7 7 7s7-3.5 7-7" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={12} r={2} fill={color} />
    </Svg>
  );
}

export function GlobeIcon({ size = 20, color = '#0984E3' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path d="M2 12h20M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18" stroke={color} strokeWidth={1.2} />
    </Svg>
  );
}

export function GiftIcon({ size = 20, color = '#FF6B6B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={10} width={18} height={12} rx={2} stroke={color} strokeWidth={1.8} />
      <Rect x={2} y={7} width={20} height={5} rx={1.5} stroke={color} strokeWidth={1.8} />
      <Line x1={12} y1={7} x2={12} y2={22} stroke={color} strokeWidth={1.5} />
      <Path d="M12 7c0 0-2-4-5-4s-3 2-1 3 6 1 6 1" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M12 7c0 0 2-4 5-4s3 2 1 3-6 1-6 1" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function InfinityIcon({ size = 20, color = '#6C5CE7' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 12c0 0 3-4 3-4s0-4-3-4-4 3-6 4S8 4 5 4 2 8 2 8s3 4 3 4 0 4 3 4 4-3 6-4 4 4 4 4 3-4 0-4z" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function ChartIcon({ size = 20, color = '#00B894' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={14} width={4} height={7} rx={1} fill={color} opacity={0.3} />
      <Rect x={10} y={9} width={4} height={12} rx={1} fill={color} opacity={0.5} />
      <Rect x={17} y={4} width={4} height={17} rx={1} fill={color} opacity={0.7} />
      <Rect x={3} y={14} width={4} height={7} rx={1} stroke={color} strokeWidth={1.5} />
      <Rect x={10} y={9} width={4} height={12} rx={1} stroke={color} strokeWidth={1.5} />
      <Rect x={17} y={4} width={4} height={17} rx={1} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

export function NoAdsIcon({ size = 20, color = '#0984E3' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={14} rx={2} stroke={color} strokeWidth={1.8} />
      <Line x1={3} y1={3} x2={21} y2={21} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function BadgeIcon({ size = 20, color = '#D4A012' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={9} r={6} fill={color} opacity={0.2} />
      <Circle cx={12} cy={9} r={6} stroke={color} strokeWidth={1.8} />
      <Path d="M8 14l-2 8 6-3 6 3-2-8" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M12 6l1.2 2.4 2.6.4-1.9 1.8.4 2.6L12 12l-2.3 1.2.4-2.6L8.2 8.8l2.6-.4L12 6z" fill={color} />
    </Svg>
  );
}

export function CheckIcon({ size = 20, color = '#00B894' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l5 5L20 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SadFaceIcon({ size = 20, color = '#FF6B6B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Circle cx={9} cy={10} r={1.2} fill={color} />
      <Circle cx={15} cy={10} r={1.2} fill={color} />
      <Path d="M8 17c1.5-2 5.5-2 7 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function MuscleIcon({ size = 20, color = '#E17055' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 18l2-4c1-2 2-3 4-3h2c2 0 3 1 4 3l2 4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 14c-1-2-1-5 1-7s5-2 7 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M15 7c1-1 3-1 4 1s0 4-1 5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
