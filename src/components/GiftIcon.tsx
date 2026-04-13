/**
 * Gift box icon — shown on milestone levels in the world map.
 * Purple box with gold ribbon. Small and non-intrusive.
 */
import React from 'react';
import Svg, { Rect, Circle } from 'react-native-svg';

export function GiftIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Box */}
      <Rect x={3} y={12} width={18} height={10} rx={2} fill="#6C5CE7" />
      {/* Lid */}
      <Rect x={2} y={8} width={20} height={5} rx={1.5} fill="#7E6EE8" />
      {/* Vertical ribbon */}
      <Rect x={10.5} y={8} width={3} height={14} fill="#D4A012" />
      {/* Horizontal ribbon */}
      <Rect x={2} y={9.5} width={20} height={2} fill="#D4A012" />
      {/* Bow */}
      <Circle cx={12} cy={7} r={2.5} fill="#D4A012" />
    </Svg>
  );
}
