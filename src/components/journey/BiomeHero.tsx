import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  G,
} from 'react-native-svg';
import type { HeroElement } from './worldVisuals';

interface Props {
  /** Which signature graphic to draw. Maps 1:1 to a biome. */
  hero: HeroElement;
  /** Container width — biomes draw responsively to fit. */
  width: number;
  /** Container height — typically a fixed vertical slot at the top of
   *  the slab (around 700-900px). The hero uses this to scale itself
   *  into the upper region of the world. */
  height: number;
}

/** A single signature graphic per biome, drawn as crisp vector SVG.
 *  Each one sits at the TOP of its biome slab (the world's "entry
 *  point" — the moment the player crosses into a new biome).
 *  Replaces the previous AI-PNG approach: vectors scale cleanly to
 *  any size, never distort, and cost ~zero memory. */
export function BiomeHero({ hero, width, height }: Props) {
  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, width, height }}
      pointerEvents="none"
    >
      {hero === 'tree' && <GroveHero w={width} h={height} />}
      {hero === 'sun' && <DunesHero w={width} h={height} />}
      {hero === 'kelp' && <DepthsHero w={width} h={height} />}
      {hero === 'moon' && <PeaksHero w={width} h={height} />}
      {hero === 'eruption' && <InfernoHero w={width} h={height} />}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────
// Emerald Grove — large hero tree silhouette (oak) with billowing
// canopy + a couple of distant tree silhouettes for depth.
// ────────────────────────────────────────────────────────────────────
function GroveHero({ w, h }: { w: number; h: number }) {
  const cx = w * 0.5;
  const trunkBaseY = h * 0.95;
  const canopyCenterY = h * 0.5;
  const canopyR = w * 0.32;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <RadialGradient id="grove-canopy-glow" cx="50%" cy="40%" r="60%">
          <Stop offset="0" stopColor="#52B788" stopOpacity={0.95} />
          <Stop offset="0.6" stopColor="#2D6A4F" stopOpacity={0.85} />
          <Stop offset="1" stopColor="#0F2A1B" stopOpacity={0.7} />
        </RadialGradient>
      </Defs>
      {/* Distant tree silhouettes — far back, low opacity */}
      <Ellipse cx={w * 0.15} cy={h * 0.65} rx={w * 0.12} ry={h * 0.18} fill="#1B4332" opacity={0.35} />
      <Ellipse cx={w * 0.85} cy={h * 0.7} rx={w * 0.13} ry={h * 0.16} fill="#1B4332" opacity={0.35} />
      <Ellipse cx={w * 0.05} cy={h * 0.78} rx={w * 0.1} ry={h * 0.14} fill="#0F2A1B" opacity={0.45} />
      <Ellipse cx={w * 0.95} cy={h * 0.82} rx={w * 0.1} ry={h * 0.13} fill="#0F2A1B" opacity={0.45} />
      {/* Hero tree trunk + branches */}
      <Path
        d={`M ${cx - w * 0.025} ${trunkBaseY} Q ${cx} ${trunkBaseY - h * 0.15} ${cx + w * 0.02} ${trunkBaseY - h * 0.35} L ${cx + w * 0.04} ${canopyCenterY + canopyR * 0.4} L ${cx - w * 0.05} ${canopyCenterY + canopyR * 0.4} Z`}
        fill="#2B1810"
      />
      {/* Bark detail line */}
      <Path
        d={`M ${cx - w * 0.015} ${trunkBaseY - h * 0.05} Q ${cx - w * 0.01} ${trunkBaseY - h * 0.2} ${cx + w * 0.01} ${trunkBaseY - h * 0.4}`}
        stroke="#180A06"
        strokeWidth={1.5}
        fill="none"
      />
      {/* Canopy — three layered ellipses for billowing volume */}
      <Ellipse cx={cx} cy={canopyCenterY + canopyR * 0.1} rx={canopyR * 1.05} ry={canopyR * 0.8} fill="url(#grove-canopy-glow)" />
      <Ellipse cx={cx + canopyR * 0.2} cy={canopyCenterY - canopyR * 0.2} rx={canopyR * 0.85} ry={canopyR * 0.7} fill="#1B4332" opacity={0.95} />
      <Ellipse cx={cx - canopyR * 0.18} cy={canopyCenterY - canopyR * 0.45} rx={canopyR * 0.65} ry={canopyR * 0.55} fill="#2D6A4F" />
      {/* Highlight pop */}
      <Ellipse cx={cx - canopyR * 0.3} cy={canopyCenterY - canopyR * 0.55} rx={canopyR * 0.18} ry={canopyR * 0.14} fill="#7DCE9A" opacity={0.8} />
      {/* Soft warm dappling */}
      <Circle cx={cx + canopyR * 0.25} cy={canopyCenterY - canopyR * 0.1} r={canopyR * 0.06} fill="#FFF6C4" opacity={0.5} />
      <Circle cx={cx - canopyR * 0.05} cy={canopyCenterY - canopyR * 0.2} r={canopyR * 0.05} fill="#FFF6C4" opacity={0.4} />
    </Svg>
  );
}

// ────────────────────────────────────────────────────────────────────
// Amber Dunes — golden setting sun with halo + crisp ray pattern.
// ────────────────────────────────────────────────────────────────────
function DunesHero({ w, h }: { w: number; h: number }) {
  const cx = w * 0.5;
  const cy = h * 0.42;
  const sunR = Math.min(w * 0.18, h * 0.22);
  return (
    <Svg width={w} height={h}>
      <Defs>
        <RadialGradient id="dunes-sun-halo" cx="50%" cy="50%" r="60%">
          <Stop offset="0" stopColor="#FFE8A3" stopOpacity={0.85} />
          <Stop offset="0.5" stopColor="#FFBA08" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#FFBA08" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="dunes-sun-core" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
          <Stop offset="0.6" stopColor="#FFE8A3" stopOpacity={1} />
          <Stop offset="1" stopColor="#FFCA3A" stopOpacity={1} />
        </RadialGradient>
      </Defs>
      {/* Wide halo */}
      <Circle cx={cx} cy={cy} r={sunR * 2.4} fill="url(#dunes-sun-halo)" />
      {/* Inner halo */}
      <Circle cx={cx} cy={cy} r={sunR * 1.4} fill="#FFE8A3" opacity={0.4} />
      {/* Sun rays — 16 evenly-spaced */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const r1 = sunR * 1.2;
        const r2 = sunR * 1.95;
        const x1 = cx + Math.cos(angle) * r1;
        const y1 = cy + Math.sin(angle) * r1;
        const x2 = cx + Math.cos(angle) * r2;
        const y2 = cy + Math.sin(angle) * r2;
        return (
          <Path
            key={i}
            d={`M ${x1} ${y1} L ${x2} ${y2}`}
            stroke="#FFE8A3"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.65}
          />
        );
      })}
      {/* Sun core */}
      <Circle cx={cx} cy={cy} r={sunR} fill="url(#dunes-sun-core)" />
      {/* Heat shimmer above the sun */}
      <Path
        d={`M ${cx - sunR * 1.4} ${cy + sunR * 1.5} Q ${cx - sunR * 0.7} ${cy + sunR * 1.4} ${cx} ${cy + sunR * 1.5} T ${cx + sunR * 1.4} ${cy + sunR * 1.5}`}
        stroke="#FFE8A3"
        strokeWidth={1.5}
        fill="none"
        opacity={0.4}
      />
    </Svg>
  );
}

// ────────────────────────────────────────────────────────────────────
// Crystal Depths — coral tower with branches + a couple of jellyfish
// drifting through.
// ────────────────────────────────────────────────────────────────────
function DepthsHero({ w, h }: { w: number; h: number }) {
  const cx = w * 0.5;
  const towerBaseY = h * 0.95;
  const towerH = h * 0.7;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgLinearGradient id="depths-coral" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF8FAB" stopOpacity={0.9} />
          <Stop offset="0.5" stopColor="#FF6B6B" stopOpacity={0.95} />
          <Stop offset="1" stopColor="#C77DFF" stopOpacity={0.85} />
        </SvgLinearGradient>
        <RadialGradient id="depths-jelly-pink" cx="50%" cy="40%" r="60%">
          <Stop offset="0" stopColor="#FFC8DD" stopOpacity={0.95} />
          <Stop offset="1" stopColor="#C77DFF" stopOpacity={0.4} />
        </RadialGradient>
        <RadialGradient id="depths-jelly-blue" cx="50%" cy="40%" r="60%">
          <Stop offset="0" stopColor="#CAF0F8" stopOpacity={0.95} />
          <Stop offset="1" stopColor="#48CAE4" stopOpacity={0.4} />
        </RadialGradient>
      </Defs>
      {/* Distant background coral silhouettes */}
      <Path
        d={`M ${w * 0.12} ${towerBaseY} L ${w * 0.13} ${towerBaseY - h * 0.4} M ${w * 0.13} ${towerBaseY - h * 0.2} L ${w * 0.08} ${towerBaseY - h * 0.32} M ${w * 0.13} ${towerBaseY - h * 0.28} L ${w * 0.18} ${towerBaseY - h * 0.4}`}
        stroke="#023E8A"
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
        opacity={0.5}
      />
      <Path
        d={`M ${w * 0.88} ${towerBaseY} L ${w * 0.86} ${towerBaseY - h * 0.45} M ${w * 0.86} ${towerBaseY - h * 0.25} L ${w * 0.92} ${towerBaseY - h * 0.36} M ${w * 0.86} ${towerBaseY - h * 0.32} L ${w * 0.81} ${towerBaseY - h * 0.42}`}
        stroke="#023E8A"
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
        opacity={0.5}
      />
      {/* Hero coral tower — central, branching */}
      <Path
        d={`M ${cx} ${towerBaseY} L ${cx} ${towerBaseY - towerH * 0.95}
            M ${cx} ${towerBaseY - towerH * 0.4} L ${cx - w * 0.12} ${towerBaseY - towerH * 0.7}
            M ${cx - w * 0.12} ${towerBaseY - towerH * 0.7} L ${cx - w * 0.18} ${towerBaseY - towerH * 0.85}
            M ${cx} ${towerBaseY - towerH * 0.55} L ${cx + w * 0.13} ${towerBaseY - towerH * 0.78}
            M ${cx + w * 0.13} ${towerBaseY - towerH * 0.78} L ${cx + w * 0.16} ${towerBaseY - towerH * 0.92}
            M ${cx - w * 0.05} ${towerBaseY - towerH * 0.2} L ${cx - w * 0.13} ${towerBaseY - towerH * 0.32}
            M ${cx + w * 0.05} ${towerBaseY - towerH * 0.25} L ${cx + w * 0.12} ${towerBaseY - towerH * 0.4}`}
        stroke="url(#depths-coral)"
        strokeWidth={Math.min(w, h) * 0.025}
        strokeLinecap="round"
        fill="none"
      />
      {/* Coral tip dots */}
      <Circle cx={cx} cy={towerBaseY - towerH * 0.95} r={Math.min(w, h) * 0.018} fill="#FFE8A3" opacity={0.95} />
      <Circle cx={cx - w * 0.18} cy={towerBaseY - towerH * 0.85} r={Math.min(w, h) * 0.014} fill="#FFE8A3" opacity={0.9} />
      <Circle cx={cx + w * 0.16} cy={towerBaseY - towerH * 0.92} r={Math.min(w, h) * 0.014} fill="#FFE8A3" opacity={0.9} />
      {/* Jellyfish 1 — pink, top-left */}
      <G opacity={0.85}>
        <Ellipse cx={w * 0.22} cy={h * 0.25} rx={w * 0.06} ry={h * 0.04} fill="url(#depths-jelly-pink)" />
        {[0, 1, 2, 3].map((i) => {
          const tx = w * 0.22 + (i - 1.5) * w * 0.025;
          return (
            <Path
              key={i}
              d={`M ${tx} ${h * 0.27} Q ${tx + (i % 2 === 0 ? 3 : -3)} ${h * 0.32} ${tx + (i % 2 === 0 ? -2 : 2)} ${h * 0.36}`}
              stroke="#FFC8DD"
              strokeWidth={1.4}
              fill="none"
              opacity={0.7}
            />
          );
        })}
      </G>
      {/* Jellyfish 2 — blue, top-right, smaller */}
      <G opacity={0.85}>
        <Ellipse cx={w * 0.78} cy={h * 0.18} rx={w * 0.05} ry={h * 0.032} fill="url(#depths-jelly-blue)" />
        {[0, 1, 2].map((i) => {
          const tx = w * 0.78 + (i - 1) * w * 0.022;
          return (
            <Path
              key={i}
              d={`M ${tx} ${h * 0.2} Q ${tx + (i % 2 === 0 ? 2 : -2)} ${h * 0.24} ${tx + (i % 2 === 0 ? -1 : 1)} ${h * 0.28}`}
              stroke="#CAF0F8"
              strokeWidth={1.2}
              fill="none"
              opacity={0.7}
            />
          );
        })}
      </G>
    </Svg>
  );
}

// ────────────────────────────────────────────────────────────────────
// Aurora Peaks — full moon with halo + crater detail + a sweep of
// scattered stars.
// ────────────────────────────────────────────────────────────────────
function PeaksHero({ w, h }: { w: number; h: number }) {
  const cx = w * 0.5;
  const cy = h * 0.45;
  const moonR = Math.min(w * 0.18, h * 0.2);
  return (
    <Svg width={w} height={h}>
      <Defs>
        <RadialGradient id="peaks-moon-halo" cx="50%" cy="50%" r="60%">
          <Stop offset="0" stopColor="#F1F0FF" stopOpacity={0.6} />
          <Stop offset="0.4" stopColor="#A29BFE" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#A29BFE" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="peaks-moon-body" cx="40%" cy="35%" r="65%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
          <Stop offset="1" stopColor="#CFD0E8" stopOpacity={1} />
        </RadialGradient>
      </Defs>
      {/* Stars — scattered around the upper half */}
      {[
        { x: 0.1, y: 0.12 },
        { x: 0.18, y: 0.22 },
        { x: 0.25, y: 0.08 },
        { x: 0.32, y: 0.25 },
        { x: 0.7, y: 0.15 },
        { x: 0.78, y: 0.08 },
        { x: 0.85, y: 0.2 },
        { x: 0.92, y: 0.28 },
        { x: 0.05, y: 0.32 },
        { x: 0.95, y: 0.42 },
      ].map((s, i) => {
        const sx = w * s.x;
        const sy = h * s.y;
        const r = i % 3 === 0 ? 1.8 : 1.2;
        return (
          <G key={i} opacity={0.85}>
            <Circle cx={sx} cy={sy} r={r} fill="#FFFFFF" />
            {i % 3 === 0 && (
              <>
                <Path d={`M ${sx - 4} ${sy} L ${sx + 4} ${sy}`} stroke="#FFFFFF" strokeWidth={0.5} opacity={0.7} />
                <Path d={`M ${sx} ${sy - 4} L ${sx} ${sy + 4}`} stroke="#FFFFFF" strokeWidth={0.5} opacity={0.7} />
              </>
            )}
          </G>
        );
      })}
      {/* Moon halo */}
      <Circle cx={cx} cy={cy} r={moonR * 2.2} fill="url(#peaks-moon-halo)" />
      {/* Moon body */}
      <Circle cx={cx} cy={cy} r={moonR} fill="url(#peaks-moon-body)" />
      {/* Craters */}
      <Circle cx={cx + moonR * 0.3} cy={cy - moonR * 0.2} r={moonR * 0.13} fill="#A8A8B3" opacity={0.55} />
      <Circle cx={cx - moonR * 0.25} cy={cy + moonR * 0.1} r={moonR * 0.09} fill="#A8A8B3" opacity={0.5} />
      <Circle cx={cx + moonR * 0.1} cy={cy + moonR * 0.4} r={moonR * 0.07} fill="#A8A8B3" opacity={0.5} />
    </Svg>
  );
}

// ────────────────────────────────────────────────────────────────────
// Inferno Core — distant volcanic eruption with lava plume + glowing
// crown + smoke pillars.
// ────────────────────────────────────────────────────────────────────
function InfernoHero({ w, h }: { w: number; h: number }) {
  const cx = w * 0.5;
  const baseY = h * 0.85;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <RadialGradient id="inferno-eruption-glow" cx="50%" cy="100%" r="80%">
          <Stop offset="0" stopColor="#FFE8A3" stopOpacity={0.9} />
          <Stop offset="0.3" stopColor="#FF8C42" stopOpacity={0.7} />
          <Stop offset="0.7" stopColor="#E85D04" stopOpacity={0.4} />
          <Stop offset="1" stopColor="#E85D04" stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="inferno-smoke" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1A0000" stopOpacity={0} />
          <Stop offset="0.6" stopColor="#2B1010" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#1A0000" stopOpacity={0.7} />
        </SvgLinearGradient>
        <SvgLinearGradient id="inferno-lava-spurt" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE8A3" stopOpacity={1} />
          <Stop offset="1" stopColor="#E85D04" stopOpacity={0.9} />
        </SvgLinearGradient>
      </Defs>
      {/* Smoke pillars rising into the sky */}
      <G opacity={0.55}>
        <Ellipse cx={cx - w * 0.12} cy={h * 0.1} rx={w * 0.18} ry={h * 0.18} fill="url(#inferno-smoke)" />
        <Ellipse cx={cx + w * 0.1} cy={h * 0.06} rx={w * 0.2} ry={h * 0.16} fill="url(#inferno-smoke)" />
        <Ellipse cx={cx} cy={h * 0.25} rx={w * 0.28} ry={h * 0.18} fill="url(#inferno-smoke)" />
      </G>
      {/* Distant volcano silhouette — jagged */}
      <Polygon
        points={`${w * 0.18},${baseY} ${w * 0.32},${baseY - h * 0.32} ${w * 0.4},${baseY - h * 0.42} ${w * 0.5},${baseY - h * 0.58} ${w * 0.6},${baseY - h * 0.42} ${w * 0.68},${baseY - h * 0.32} ${w * 0.82},${baseY}`}
        fill="#0A0000"
        opacity={0.95}
      />
      {/* Eruption glow */}
      <Circle cx={cx} cy={baseY - h * 0.58} r={Math.min(w, h) * 0.18} fill="url(#inferno-eruption-glow)" />
      {/* Lava spurts shooting up from the crater */}
      {[-0.06, -0.025, 0, 0.025, 0.06].map((dx, i) => {
        const baseX = cx + dx * w;
        const reach = h * (0.15 - Math.abs(dx) * 0.7);
        return (
          <Path
            key={i}
            d={`M ${baseX} ${baseY - h * 0.55} Q ${baseX + dx * w * 1.4} ${baseY - h * 0.55 - reach} ${baseX + dx * w * 0.6} ${baseY - h * 0.55 - reach * 1.6}`}
            stroke="url(#inferno-lava-spurt)"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            opacity={0.85 - Math.abs(dx) * 5}
          />
        );
      })}
      {/* Lava-glow crown along the crater rim */}
      <Path
        d={`M ${cx - w * 0.06} ${baseY - h * 0.56} Q ${cx} ${baseY - h * 0.62} ${cx + w * 0.06} ${baseY - h * 0.56}`}
        stroke="#FFE8A3"
        strokeWidth={3}
        fill="none"
        opacity={0.85}
        strokeLinecap="round"
      />
      {/* Lava spilling down the side */}
      <Path
        d={`M ${cx + w * 0.06} ${baseY - h * 0.55} Q ${cx + w * 0.1} ${baseY - h * 0.45} ${cx + w * 0.13} ${baseY - h * 0.32} L ${cx + w * 0.18} ${baseY - h * 0.05}`}
        stroke="#FF8C42"
        strokeWidth={3}
        fill="none"
        opacity={0.7}
        strokeLinecap="round"
      />
      {/* Smaller spires nearby */}
      <Polygon
        points={`${w * 0.08},${baseY} ${w * 0.13},${baseY - h * 0.2} ${w * 0.18},${baseY}`}
        fill="#1A0000"
        opacity={0.85}
      />
      <Polygon
        points={`${w * 0.82},${baseY} ${w * 0.87},${baseY - h * 0.25} ${w * 0.92},${baseY}`}
        fill="#1A0000"
        opacity={0.85}
      />
    </Svg>
  );
}
