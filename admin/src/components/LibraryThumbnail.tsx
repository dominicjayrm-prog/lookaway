'use client';

import type { LibraryObject } from '@/data/objectLibrary';

interface Props {
  item: LibraryObject;
  size?: number;
  color?: string;
}

export default function LibraryThumbnail({ item, size = 36, color = '#90A4AE' }: Props) {
  const { svgPath, viewBox, label } = item;

  if (svgPath === 'CIRCLE') {
    return (
      <svg width={size} height={size} viewBox={viewBox}>
        <circle cx="50" cy="50" r="44" fill={color} />
      </svg>
    );
  }

  if (svgPath === 'RECT') {
    return (
      <svg width={size} height={size} viewBox={viewBox}>
        <rect x="8" y="8" width="84" height="84" rx="6" fill={color} />
      </svg>
    );
  }

  if (svgPath === 'OVAL') {
    return (
      <svg width={size} height={size} viewBox={viewBox}>
        <ellipse cx="50" cy="50" rx="44" ry="30" fill={color} />
      </svg>
    );
  }

  if (svgPath === 'RING') {
    return (
      <svg width={size} height={size} viewBox={viewBox}>
        <circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="10" />
      </svg>
    );
  }

  if (svgPath === 'NUMBER' && label) {
    return (
      <svg width={size} height={size} viewBox={viewBox}>
        <circle cx="50" cy="50" r="44" fill={color} />
        <text x="50" y="62" textAnchor="middle" fill="white" fontSize="44" fontWeight="bold" fontFamily="sans-serif">{label}</text>
      </svg>
    );
  }

  // Default: render the SVG path
  return (
    <svg width={size} height={size} viewBox={viewBox}>
      <path d={svgPath} fill={color} />
    </svg>
  );
}
