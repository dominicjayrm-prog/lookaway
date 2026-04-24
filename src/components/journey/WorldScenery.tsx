import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Polygon, Circle as SvgCircle, Defs, LinearGradient, Stop, Ellipse } from 'react-native-svg';
import type { WorldTheme } from '@/src/data/unifiedJourney';

interface Props {
  theme: WorldTheme;
  width: number;
  height: number;
}

/** Per-world ambient silhouettes that sit just above the gradient slab
 *  and just below the particles. Deliberately minimal — a few broad
 *  shapes in translucent white/black tones that suggest the setting
 *  (canopy, dunes, coral, peaks, lava) without competing for attention
 *  with the path. */
export function WorldScenery({ theme, width, height }: Props) {
  const shapes = SCENERY_BY_THEME[theme];
  return (
    <View
      style={{ position: 'absolute', width, height, overflow: 'hidden' }}
      pointerEvents="none"
    >
      {shapes(width, height)}
    </View>
  );
}

const SCENERY_BY_THEME: Record<WorldTheme, (w: number, h: number) => React.ReactNode> = {
  emerald_grove: (w, h) => (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="grove-canopy" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0F3D2B" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#0F3D2B" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {/* Far-left tree canopy */}
      <Path
        d={`M 0 ${h * 0.1} Q ${w * 0.15} ${h * 0.05} ${w * 0.3} ${h * 0.12} L ${w * 0.3} ${h * 0.3} L 0 ${h * 0.3} Z`}
        fill="url(#grove-canopy)"
      />
      {/* Right-side taller pines */}
      <Path
        d={`M ${w * 0.75} 0 L ${w} 0 L ${w} ${h * 0.22} Q ${w * 0.88} ${h * 0.2} ${w * 0.75} ${h * 0.15} Z`}
        fill="#0F3D2B"
        opacity={0.4}
      />
      {/* Misty ground band */}
      <Path
        d={`M 0 ${h * 0.82} Q ${w * 0.5} ${h * 0.78} ${w} ${h * 0.83} L ${w} ${h} L 0 ${h} Z`}
        fill="#0F3D2B"
        opacity={0.35}
      />
      {/* Scattered mushrooms / flowers */}
      {[0.15, 0.38, 0.62, 0.85].map((x, i) => (
        <SvgCircle key={i} cx={w * x} cy={h * 0.92} r={3} fill="#FFC8DD" opacity={0.5} />
      ))}
    </Svg>
  ),

  amber_dunes: (w, h) => (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="dune-shadow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7F5539" stopOpacity={0} />
          <Stop offset="1" stopColor="#7F5539" stopOpacity={0.5} />
        </LinearGradient>
      </Defs>
      {/* Rolling dune 1 */}
      <Path
        d={`M 0 ${h * 0.7} Q ${w * 0.25} ${h * 0.55} ${w * 0.55} ${h * 0.68} T ${w} ${h * 0.72} L ${w} ${h} L 0 ${h} Z`}
        fill="url(#dune-shadow)"
      />
      {/* Dune 2 taller */}
      <Path
        d={`M 0 ${h * 0.82} Q ${w * 0.4} ${h * 0.68} ${w * 0.75} ${h * 0.82} T ${w} ${h * 0.85} L ${w} ${h} L 0 ${h} Z`}
        fill="#7F5539"
        opacity={0.4}
      />
      {/* Ancient ruin silhouette */}
      <Path
        d={`M ${w * 0.6} ${h * 0.55} L ${w * 0.6} ${h * 0.42} L ${w * 0.63} ${h * 0.38} L ${w * 0.66} ${h * 0.42} L ${w * 0.66} ${h * 0.55} Z`}
        fill="#3D2817"
        opacity={0.55}
      />
      {/* Sun disc */}
      <SvgCircle cx={w * 0.82} cy={h * 0.22} r={h * 0.08} fill="#FFBA08" opacity={0.35} />
      <SvgCircle cx={w * 0.82} cy={h * 0.22} r={h * 0.06} fill="#FFE8A3" opacity={0.5} />
    </Svg>
  ),

  crystal_depths: (w, h) => (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      {/* Sun rays from top */}
      {[0.2, 0.5, 0.8].map((x, i) => (
        <Path
          key={i}
          d={`M ${w * x} 0 L ${w * (x - 0.08)} ${h} L ${w * (x + 0.08)} ${h} Z`}
          fill="#CAF0F8"
          opacity={0.08}
        />
      ))}
      {/* Jellyfish silhouettes */}
      {[{ x: 0.12, y: 0.25 }, { x: 0.85, y: 0.6 }].map((p, i) => (
        <React.Fragment key={i}>
          <Ellipse cx={w * p.x} cy={h * p.y} rx={14} ry={10} fill="#90E0EF" opacity={0.4} />
          {[0, 1, 2].map((j) => (
            <Path
              key={j}
              d={`M ${w * p.x + (j - 1) * 5} ${h * p.y + 5} Q ${w * p.x + (j - 1) * 5 - 2} ${h * p.y + 20} ${w * p.x + (j - 1) * 5 + 1} ${h * p.y + 35}`}
              stroke="#CAF0F8"
              strokeWidth={1.2}
              fill="none"
              opacity={0.35}
            />
          ))}
        </React.Fragment>
      ))}
      {/* Coral reef base */}
      <Path
        d={`M 0 ${h * 0.9} Q ${w * 0.3} ${h * 0.82} ${w * 0.6} ${h * 0.88} T ${w} ${h * 0.88} L ${w} ${h} L 0 ${h} Z`}
        fill="#0077B6"
        opacity={0.55}
      />
    </Svg>
  ),

  aurora_peaks: (w, h) => (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="aurora-band" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#A29BFE" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#00B894" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#A29BFE" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {/* Aurora band — waves of colour high in the sky */}
      <Path
        d={`M 0 ${h * 0.18} Q ${w * 0.3} ${h * 0.08} ${w * 0.6} ${h * 0.2} T ${w} ${h * 0.22} L ${w} ${h * 0.32} Q ${w * 0.7} ${h * 0.18} ${w * 0.4} ${h * 0.3} T 0 ${h * 0.28} Z`}
        fill="url(#aurora-band)"
      />
      {/* Mountain peaks */}
      <Polygon
        points={`0,${h * 0.7} ${w * 0.2},${h * 0.4} ${w * 0.38},${h * 0.65} ${w * 0.55},${h * 0.35} ${w * 0.75},${h * 0.55} ${w * 0.9},${h * 0.42} ${w},${h * 0.65} ${w},${h} 0,${h}`}
        fill="#1B2838"
        opacity={0.55}
      />
      {/* Snow caps */}
      <Polygon
        points={`${w * 0.18},${h * 0.43} ${w * 0.2},${h * 0.4} ${w * 0.22},${h * 0.43} ${w * 0.2},${h * 0.48}`}
        fill="#FFFFFF"
        opacity={0.55}
      />
      <Polygon
        points={`${w * 0.53},${h * 0.38} ${w * 0.55},${h * 0.35} ${w * 0.57},${h * 0.38} ${w * 0.55},${h * 0.44}`}
        fill="#FFFFFF"
        opacity={0.55}
      />
    </Svg>
  ),

  inferno_core: (w, h) => (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="lava-glow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFBA08" stopOpacity={0} />
          <Stop offset="1" stopColor="#FFBA08" stopOpacity={0.6} />
        </LinearGradient>
      </Defs>
      {/* Obsidian pillars */}
      <Polygon
        points={`${w * 0.1},${h * 0.6} ${w * 0.12},${h * 0.3} ${w * 0.14},${h * 0.58} ${w * 0.16},${h * 0.62}`}
        fill="#1A0A0A"
        opacity={0.8}
      />
      <Polygon
        points={`${w * 0.72},${h * 0.65} ${w * 0.74},${h * 0.35} ${w * 0.78},${h * 0.62}`}
        fill="#1A0A0A"
        opacity={0.8}
      />
      {/* Lava river at the bottom */}
      <Path
        d={`M 0 ${h * 0.88} Q ${w * 0.25} ${h * 0.82} ${w * 0.5} ${h * 0.9} T ${w} ${h * 0.88} L ${w} ${h} L 0 ${h} Z`}
        fill="url(#lava-glow)"
      />
      {/* Glowing cracks in the ground */}
      <Path
        d={`M ${w * 0.15} ${h * 0.95} L ${w * 0.22} ${h * 0.93} L ${w * 0.3} ${h * 0.96}`}
        stroke="#E85D04"
        strokeWidth={1.5}
        fill="none"
        opacity={0.7}
      />
      <Path
        d={`M ${w * 0.65} ${h * 0.97} L ${w * 0.7} ${h * 0.94} L ${w * 0.82} ${h * 0.96}`}
        stroke="#FFBA08"
        strokeWidth={1.5}
        fill="none"
        opacity={0.6}
      />
    </Svg>
  ),
};
