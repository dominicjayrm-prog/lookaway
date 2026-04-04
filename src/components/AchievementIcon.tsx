import React from 'react';
import Svg, { Circle, Rect, Path, Polygon, Line } from 'react-native-svg';

interface Props {
  name: string;
  color: string;
  size?: number;
}

export function AchievementIcon({ name, color, size = 22 }: Props) {
  const fn = ICONS[name];
  if (!fn) return null;
  return fn(color, size);
}

const ICONS: Record<string, (color: string, size: number) => React.ReactNode> = {
  globe: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none" />
      <Path d="M12 3C12 3 8 8 8 12C8 16 12 21 12 21" stroke={color} strokeWidth="1.2" fill="none" />
      <Path d="M12 3C12 3 16 8 16 12C16 16 12 21 12 21" stroke={color} strokeWidth="1.2" fill="none" />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="1.2" />
    </Svg>
  ),
  stars: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="12,2 14,8 20,8 15,12 17,18 12,14 7,18 9,12 4,8 10,8" fill={color} />
    </Svg>
  ),
  layers: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2 12L12 6L22 12L12 18Z" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
      <Path d="M2 16L12 10L22 16L12 22Z" stroke={color} strokeWidth="1.2" fill="none" />
    </Svg>
  ),
  brain: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2C8 2 5 5 5 9C5 11 6 13 7 14C8 15 8 17 8 19H16C16 17 16 15 17 14C18 13 19 11 19 9C19 5 16 2 12 2Z" stroke={color} strokeWidth="1.5" fill={`${color}15`} />
      <Line x1="12" y1="19" x2="12" y2="22" stroke={color} strokeWidth="1.5" />
    </Svg>
  ),
  calendar: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3" y="4" width="18" height="18" rx="3" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="1.2" />
      <Circle cx="12" cy="15" r="2" fill={color} />
    </Svg>
  ),
  users: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="9" cy="7" r="3" stroke={color} strokeWidth="1.5" fill="none" />
      <Path d="M3 20Q3 14 9 14Q15 14 15 20" stroke={color} strokeWidth="1.5" fill="none" />
      <Circle cx="17" cy="8" r="2.5" stroke={color} strokeWidth="1.2" fill="none" />
      <Path d="M15 20Q15 15 19 15Q22 15 22 19" stroke={color} strokeWidth="1.2" fill="none" />
    </Svg>
  ),
  trophy: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 2H16V10C16 13 14 14 12 14C10 14 8 13 8 10V2Z" stroke={color} strokeWidth="1.5" fill={`${color}15`} />
      <Path d="M8 4H5C5 4 4 4 4 6C4 8 6 9 8 9" stroke={color} strokeWidth="1.2" fill="none" />
      <Path d="M16 4H19C19 4 20 4 20 6C20 8 18 9 16 9" stroke={color} strokeWidth="1.2" fill="none" />
      <Line x1="12" y1="14" x2="12" y2="18" stroke={color} strokeWidth="1.5" />
      <Rect x="8" y="18" width="8" height="3" rx="1" stroke={color} strokeWidth="1.2" fill="none" />
    </Svg>
  ),
  heart: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 20C12 20 4 14 4 8.5C4 5.5 6.5 3 9 3C10.5 3 11.5 3.5 12 5C12.5 3.5 13.5 3 15 3C17.5 3 20 5.5 20 8.5C20 14 12 20 12 20Z" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
    </Svg>
  ),
  fire: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2C12 2 8 8 8 13C8 16 10 19 12 20C14 19 16 16 16 13C16 8 12 2 12 2Z" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
      <Path d="M12 12C12 12 10 14 10 16C10 17.5 11 19 12 19C13 19 14 17.5 14 16C14 14 12 12 12 12Z" fill={color} opacity="0.4" />
    </Svg>
  ),
  refresh: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 12C4 7.5 7.5 4 12 4C15 4 17.5 5.5 19 8" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M20 12C20 16.5 16.5 20 12 20C9 20 6.5 18.5 5 16" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M16 8H20V4" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 16H4V20" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  zap: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13 2L4 14H12L11 22L20 10H12L13 2Z" stroke={color} strokeWidth="1.5" fill={`${color}20`} strokeLinejoin="round" />
    </Svg>
  ),
  target: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none" />
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.2" fill="none" />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      <Line x1="12" y1="1" x2="12" y2="5" stroke={color} strokeWidth="1.2" />
      <Line x1="12" y1="19" x2="12" y2="23" stroke={color} strokeWidth="1.2" />
      <Line x1="1" y1="12" x2="5" y2="12" stroke={color} strokeWidth="1.2" />
      <Line x1="19" y1="12" x2="23" y2="12" stroke={color} strokeWidth="1.2" />
    </Svg>
  ),
  gem: (color, size) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon points="12,2 20,9 12,22 4,9" stroke={color} strokeWidth="1.5" fill={`${color}15`} strokeLinejoin="round" />
      <Line x1="4" y1="9" x2="20" y2="9" stroke={color} strokeWidth="1.2" />
      <Line x1="12" y1="2" x2="9" y2="9" stroke={color} strokeWidth="1" opacity="0.5" />
      <Line x1="12" y1="2" x2="15" y2="9" stroke={color} strokeWidth="1" opacity="0.5" />
    </Svg>
  ),
};
