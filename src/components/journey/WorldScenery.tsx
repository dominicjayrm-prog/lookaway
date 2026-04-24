import React from 'react';
import { View } from 'react-native';
import Svg, {
  Path,
  Polygon,
  Circle as SvgCircle,
  Defs,
  LinearGradient,
  Stop,
  Ellipse,
  Rect,
  G,
  RadialGradient,
} from 'react-native-svg';
import type { WorldTheme } from '@/src/data/unifiedJourney';

interface Props {
  theme: WorldTheme;
  width: number;
  height: number;
}

/** Per-world ambient scenery. Each biome renders a layered SVG
 *  composition anchored to the slab so there's visual detail at every
 *  scroll depth — trees, corals, peaks, spires scatter throughout the
 *  ~6,500px world slab rather than clustering at the top. All static,
 *  so the SVG rasterises once and costs nothing as you scroll. */
export function WorldScenery({ theme, width, height }: Props) {
  const render = SCENERY_BY_THEME[theme];
  return (
    <View
      style={{ position: 'absolute', width, height, overflow: 'hidden' }}
      pointerEvents="none"
    >
      {render(width, height)}
    </View>
  );
}

/** Tiny deterministic PRNG so scattering looks "natural" without the
 *  layout reshuffling on every render. Same theme + same slab size
 *  produces the same arrangement every time. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// --------------------------------------------------------------------
// Emerald Grove — dense forest: canopy silhouettes, repeating tree
// clusters down both sides, hanging vines, mushrooms on the ground,
// soft sunbeams filtering through. Bottom of slab is the forest floor
// (Level 1); top bleeds into Amber Dunes.
// --------------------------------------------------------------------
function emeraldGrove(w: number, h: number): React.ReactNode {
  const rand = seeded(1);
  const trees: Array<{ x: number; y: number; size: number; side: 'l' | 'r' }> = [];
  // 14 tree clusters, alternating sides, roughly evenly distributed
  // down the slab with jitter so they don't line up.
  const count = 14;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const jitter = (rand() - 0.5) * (h / count) * 0.6;
    const y = h * 0.08 + t * h * 0.86 + jitter;
    const side: 'l' | 'r' = i % 2 === 0 ? 'l' : 'r';
    const size = 42 + rand() * 22;
    const x = side === 'l' ? rand() * (w * 0.22) : w - rand() * (w * 0.22);
    trees.push({ x, y, size, side });
  }
  const mushrooms: Array<{ x: number; y: number; r: number; color: string }> = [];
  const mushroomCount = 12;
  for (let i = 0; i < mushroomCount; i++) {
    mushrooms.push({
      x: (i / mushroomCount) * w + rand() * 18,
      y: h - 10 - rand() * 28,
      r: 2 + rand() * 3,
      color: rand() > 0.5 ? '#FFC8DD' : '#FFE8A3',
    });
  }
  const sunbeamX = [0.18, 0.46, 0.72];

  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="grove-canopy-top" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0F3D2B" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#0F3D2B" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="grove-ground" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0F3D2B" stopOpacity={0} />
          <Stop offset="1" stopColor="#0B2E1F" stopOpacity={0.6} />
        </LinearGradient>
        <LinearGradient id="grove-sunbeam" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFF6C4" stopOpacity={0.18} />
          <Stop offset="1" stopColor="#FFF6C4" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* Soft sunbeams filtering through the canopy — repeating down the
       *  slab so every screenful has at least one visible. */}
      {sunbeamX.map((xRatio, i) => {
        const x = w * xRatio;
        const bandCount = 4;
        return (
          <G key={`sun-${i}`}>
            {Array.from({ length: bandCount }).map((_, b) => {
              const bandY = (b / bandCount) * h;
              const bandH = h / bandCount + 120;
              return (
                <Path
                  key={b}
                  d={`M ${x - 20} ${bandY} L ${x - 80} ${bandY + bandH} L ${x + 80} ${bandY + bandH} L ${x + 20} ${bandY} Z`}
                  fill="url(#grove-sunbeam)"
                />
              );
            })}
          </G>
        );
      })}

      {/* Top-edge canopy silhouette — bleeds out of the top of the slab
       *  so it feels like the forest extends upward past the viewport. */}
      <Path
        d={`M 0 0 L 0 ${h * 0.08} Q ${w * 0.15} ${h * 0.03} ${w * 0.32} ${h * 0.07} Q ${w * 0.52} ${h * 0.11} ${w * 0.72} ${h * 0.05} Q ${w * 0.88} ${h * 0.02} ${w} ${h * 0.08} L ${w} 0 Z`}
        fill="#0F3D2B"
        opacity={0.35}
      />
      <Path
        d={`M 0 ${h * 0.04} Q ${w * 0.25} 0 ${w * 0.5} ${h * 0.05} Q ${w * 0.75} ${h * 0.1} ${w} ${h * 0.03} L ${w} 0 L 0 0 Z`}
        fill="url(#grove-canopy-top)"
      />

      {/* Tree clusters. Each tree: tall dark trunk + rounded canopy
       *  above. Side trees only — we leave the centre clear for the
       *  path. */}
      {trees.map((t, i) => {
        const trunkW = t.size * 0.18;
        const trunkH = t.size * 1.2;
        const canopyR = t.size * 0.55;
        return (
          <G key={`tree-${i}`} opacity={0.6}>
            {/* Trunk */}
            <Rect
              x={t.x - trunkW / 2}
              y={t.y}
              width={trunkW}
              height={trunkH}
              fill="#3D2817"
              rx={1}
            />
            {/* Layered conical canopy — three stacked ellipses. */}
            <Ellipse
              cx={t.x}
              cy={t.y - canopyR * 0.2}
              rx={canopyR * 1.1}
              ry={canopyR * 0.85}
              fill="#0F3D2B"
              opacity={0.85}
            />
            <Ellipse
              cx={t.x}
              cy={t.y - canopyR * 0.7}
              rx={canopyR * 0.85}
              ry={canopyR * 0.7}
              fill="#1B4332"
              opacity={0.9}
            />
            <Ellipse
              cx={t.x}
              cy={t.y - canopyR * 1.1}
              rx={canopyR * 0.55}
              ry={canopyR * 0.5}
              fill="#2D6A4F"
            />
            {/* Hanging vine from the side of the canopy. */}
            {t.side === 'l' ? (
              <Path
                d={`M ${t.x - canopyR * 0.9} ${t.y - canopyR * 0.2} Q ${t.x - canopyR * 1.1} ${t.y + canopyR * 0.6} ${t.x - canopyR * 0.8} ${t.y + canopyR * 1.3}`}
                stroke="#52B788"
                strokeWidth={1.2}
                fill="none"
                opacity={0.55}
              />
            ) : (
              <Path
                d={`M ${t.x + canopyR * 0.9} ${t.y - canopyR * 0.2} Q ${t.x + canopyR * 1.1} ${t.y + canopyR * 0.6} ${t.x + canopyR * 0.8} ${t.y + canopyR * 1.3}`}
                stroke="#52B788"
                strokeWidth={1.2}
                fill="none"
                opacity={0.55}
              />
            )}
          </G>
        );
      })}

      {/* Ground band + mushroom cluster along the forest floor. */}
      <Path
        d={`M 0 ${h * 0.88} Q ${w * 0.5} ${h * 0.84} ${w} ${h * 0.89} L ${w} ${h} L 0 ${h} Z`}
        fill="url(#grove-ground)"
      />
      {mushrooms.map((m, i) => (
        <G key={`mushroom-${i}`}>
          <Ellipse
            cx={m.x}
            cy={m.y}
            rx={m.r * 1.3}
            ry={m.r * 0.7}
            fill={m.color}
            opacity={0.7}
          />
          <Rect
            x={m.x - m.r * 0.25}
            y={m.y}
            width={m.r * 0.5}
            height={m.r * 1.1}
            fill="#F5E6D3"
            opacity={0.5}
          />
        </G>
      ))}
      {/* Ground-level fern tufts on alternating sides. */}
      {Array.from({ length: 6 }).map((_, i) => {
        const fx = i % 2 === 0 ? w * 0.06 : w * 0.94;
        const fy = h - 18 - (i * 30) % h;
        return (
          <G key={`fern-${i}`} opacity={0.5}>
            {[-10, -4, 2, 8].map((dx, j) => (
              <Path
                key={j}
                d={`M ${fx + dx} ${fy} Q ${fx + dx + (dx > 0 ? 4 : -4)} ${fy - 10} ${fx + dx + (dx > 0 ? 2 : -2)} ${fy - 18}`}
                stroke="#52B788"
                strokeWidth={1.2}
                fill="none"
              />
            ))}
          </G>
        );
      })}
    </Svg>
  );
}

// --------------------------------------------------------------------
// Amber Dunes — desert at dusk: giant sun disc with a ray halo near
// the top, three receding dune ridges stacked down the slab, scattered
// cacti, pyramid silhouettes, and stone obelisks. Bottom of the slab
// is the deepest dune shadow.
// --------------------------------------------------------------------
function amberDunes(w: number, h: number): React.ReactNode {
  const rand = seeded(2);
  // Cacti scattered in the mid band, alternating sides so the path
  // stays clear.
  const cacti: Array<{ x: number; y: number; size: number }> = [];
  const cactusCount = 9;
  for (let i = 0; i < cactusCount; i++) {
    const side = i % 2 === 0 ? rand() * 0.22 : 0.78 + rand() * 0.2;
    cacti.push({
      x: w * side,
      y: h * 0.2 + (i / cactusCount) * h * 0.7,
      size: 18 + rand() * 12,
    });
  }
  // Obelisks — ancient stone pillars poking out of the dunes.
  const obelisks: Array<{ x: number; y: number; height: number }> = [];
  for (let i = 0; i < 5; i++) {
    obelisks.push({
      x: w * (0.08 + rand() * 0.84),
      y: h * (0.18 + rand() * 0.7),
      height: 28 + rand() * 22,
    });
  }
  // Pyramid silhouettes — two at different sizes, far apart.
  const pyramids = [
    { cx: w * 0.28, baseY: h * 0.45, w: 120, h: 70 },
    { cx: w * 0.72, baseY: h * 0.72, w: 180, h: 100 },
  ];

  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="dune-shadow-a" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7F5539" stopOpacity={0} />
          <Stop offset="1" stopColor="#7F5539" stopOpacity={0.55} />
        </LinearGradient>
        <LinearGradient id="dune-shadow-b" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5A3A22" stopOpacity={0} />
          <Stop offset="1" stopColor="#5A3A22" stopOpacity={0.5} />
        </LinearGradient>
        <RadialGradient id="sun-halo" cx="50%" cy="50%" r="60%">
          <Stop offset="0" stopColor="#FFE8A3" stopOpacity={0.7} />
          <Stop offset="0.5" stopColor="#FFBA08" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#FFBA08" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="heat-haze" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FEFAE0" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#FEFAE0" stopOpacity={0.18} />
          <Stop offset="1" stopColor="#FEFAE0" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* Giant setting sun near the top of the slab with a soft halo. */}
      <SvgCircle cx={w * 0.78} cy={h * 0.08} r={h * 0.11} fill="url(#sun-halo)" />
      <SvgCircle cx={w * 0.78} cy={h * 0.08} r={h * 0.05} fill="#FFE8A3" opacity={0.9} />
      <SvgCircle cx={w * 0.78} cy={h * 0.08} r={h * 0.028} fill="#FFFFFF" opacity={0.85} />
      {/* Sun rays — thin wedges radiating out. */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const r1 = h * 0.055;
        const r2 = h * 0.12;
        const cx = w * 0.78;
        const cy = h * 0.08;
        const x1 = cx + Math.cos(angle) * r1;
        const y1 = cy + Math.sin(angle) * r1;
        const x2 = cx + Math.cos(angle) * r2;
        const y2 = cy + Math.sin(angle) * r2;
        return (
          <Path
            key={i}
            d={`M ${x1} ${y1} L ${x2} ${y2}`}
            stroke="#FFE8A3"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.45}
          />
        );
      })}

      {/* Pyramid silhouettes in the background. */}
      {pyramids.map((p, i) => (
        <Polygon
          key={`pyr-${i}`}
          points={`${p.cx - p.w / 2},${p.baseY} ${p.cx},${p.baseY - p.h} ${p.cx + p.w / 2},${p.baseY}`}
          fill="#5A3A22"
          opacity={0.45}
        />
      ))}

      {/* Three receding dune ridges. The topmost is lightest; each
       *  subsequent ridge darker + taller to create depth. Repeat
       *  throughout the slab so the landscape keeps flowing. */}
      {Array.from({ length: 5 }).map((_, i) => {
        const y = h * (0.22 + i * 0.17);
        const opacity = 0.25 + i * 0.08;
        return (
          <Path
            key={`dune-a-${i}`}
            d={`M 0 ${y} Q ${w * 0.2} ${y - 20} ${w * 0.45} ${y - 4} T ${w * 0.9} ${y - 10} L ${w} ${y + 2} L ${w} ${y + 80} L 0 ${y + 80} Z`}
            fill="url(#dune-shadow-a)"
            opacity={opacity}
          />
        );
      })}
      {Array.from({ length: 4 }).map((_, i) => {
        const y = h * (0.32 + i * 0.2);
        return (
          <Path
            key={`dune-b-${i}`}
            d={`M 0 ${y} Q ${w * 0.35} ${y - 30} ${w * 0.65} ${y - 8} T ${w} ${y} L ${w} ${y + 120} L 0 ${y + 120} Z`}
            fill="url(#dune-shadow-b)"
            opacity={0.45 + i * 0.05}
          />
        );
      })}

      {/* Obelisks scattered throughout. */}
      {obelisks.map((o, i) => (
        <G key={`obelisk-${i}`} opacity={0.6}>
          <Polygon
            points={`${o.x - 3},${o.y} ${o.x + 3},${o.y} ${o.x + 3},${o.y - o.height + 6} ${o.x},${o.y - o.height} ${o.x - 3},${o.y - o.height + 6}`}
            fill="#3D2817"
          />
          {/* Small carved band near the top. */}
          <Rect x={o.x - 3} y={o.y - o.height + 14} width={6} height={2} fill="#2B1B10" />
        </G>
      ))}

      {/* Cacti — saguaro silhouettes, two arms. */}
      {cacti.map((c, i) => (
        <G key={`cactus-${i}`} opacity={0.55}>
          <Rect
            x={c.x - c.size * 0.12}
            y={c.y - c.size}
            width={c.size * 0.24}
            height={c.size}
            rx={c.size * 0.12}
            fill="#2D5A3D"
          />
          {/* Left arm */}
          <Path
            d={`M ${c.x - c.size * 0.12} ${c.y - c.size * 0.5} L ${c.x - c.size * 0.45} ${c.y - c.size * 0.5} L ${c.x - c.size * 0.45} ${c.y - c.size * 0.8}`}
            stroke="#2D5A3D"
            strokeWidth={c.size * 0.16}
            strokeLinecap="round"
            fill="none"
          />
          {/* Right arm */}
          <Path
            d={`M ${c.x + c.size * 0.12} ${c.y - c.size * 0.65} L ${c.x + c.size * 0.4} ${c.y - c.size * 0.65} L ${c.x + c.size * 0.4} ${c.y - c.size * 0.9}`}
            stroke="#2D5A3D"
            strokeWidth={c.size * 0.16}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      ))}

      {/* Foreground dune — deepest shadow at the very bottom of the
       *  slab, i.e. the start of the world where the player arrives. */}
      <Path
        d={`M 0 ${h * 0.9} Q ${w * 0.3} ${h * 0.84} ${w * 0.55} ${h * 0.9} T ${w} ${h * 0.92} L ${w} ${h} L 0 ${h} Z`}
        fill="#5A3A22"
        opacity={0.55}
      />

      {/* Heat haze bands near the horizon — subtle horizontal streaks. */}
      {[0.14, 0.19, 0.24].map((yRatio, i) => (
        <Rect
          key={`haze-${i}`}
          x={w * 0.1}
          y={h * yRatio}
          width={w * 0.8}
          height={2}
          fill="url(#heat-haze)"
          opacity={0.6}
        />
      ))}

      {/* Scattered dune-grass tufts dotted along the ridges. */}
      {Array.from({ length: 10 }).map((_, i) => {
        const gx = (i / 10) * w + rand() * 30;
        const gy = h * 0.78 + (rand() - 0.5) * 40;
        return (
          <G key={`grass-${i}`} opacity={0.5}>
            {[-3, 0, 3].map((dx, j) => (
              <Path
                key={j}
                d={`M ${gx + dx} ${gy} L ${gx + dx + (dx > 0 ? 1 : -1)} ${gy - 6}`}
                stroke="#8B7355"
                strokeWidth={1}
                fill="none"
              />
            ))}
          </G>
        );
      })}
    </Svg>
  );
}

// --------------------------------------------------------------------
// Crystal Depths — underwater: sun rays slanting from above, drifting
// jellyfish with trailing tentacles at many depths, diverse coral
// reef along the seafloor, branching + tower + fan corals at mid
// depths, small fish silhouettes in schools, kelp forests rising
// from the floor.
// --------------------------------------------------------------------
function crystalDepths(w: number, h: number): React.ReactNode {
  const rand = seeded(3);
  // Jellyfish scattered at random depths. Each is a rounded dome with
  // 4-5 trailing tentacle curves.
  const jellies: Array<{ x: number; y: number; size: number }> = [];
  for (let i = 0; i < 9; i++) {
    jellies.push({
      x: w * (0.08 + rand() * 0.84),
      y: h * (0.1 + rand() * 0.8),
      size: 14 + rand() * 18,
    });
  }
  // Coral clusters along the full slab — mostly on the sides.
  const corals: Array<{ x: number; y: number; type: 'branch' | 'tower' | 'fan'; size: number }> = [];
  for (let i = 0; i < 14; i++) {
    const side = i % 2 === 0 ? rand() * 0.18 : 0.82 + rand() * 0.18;
    const typeRoll = rand();
    const type = typeRoll < 0.4 ? 'branch' : typeRoll < 0.75 ? 'tower' : 'fan';
    corals.push({
      x: w * side,
      y: h * (0.15 + (i / 14) * 0.82),
      type,
      size: 20 + rand() * 18,
    });
  }
  // Small fish — three schools.
  const fishSchools: Array<{ cx: number; cy: number }> = [];
  for (let i = 0; i < 4; i++) {
    fishSchools.push({
      cx: w * (0.2 + rand() * 0.6),
      cy: h * (0.1 + rand() * 0.8),
    });
  }
  // Kelp strands rising from the floor.
  const kelpX = [0.08, 0.22, 0.78, 0.9];

  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="depth-ray" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#CAF0F8" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#CAF0F8" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="depth-floor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#023E8A" stopOpacity={0} />
          <Stop offset="1" stopColor="#001A33" stopOpacity={0.75} />
        </LinearGradient>
        <RadialGradient id="jelly-body" cx="50%" cy="40%" r="60%">
          <Stop offset="0" stopColor="#CAF0F8" stopOpacity={0.75} />
          <Stop offset="1" stopColor="#48CAE4" stopOpacity={0.25} />
        </RadialGradient>
      </Defs>

      {/* God-rays angling down from the surface. 5 across the top, long
       *  enough to reach roughly the top 60% of the slab. */}
      {[0.12, 0.3, 0.5, 0.72, 0.9].map((xRatio, i) => {
        const top = w * xRatio;
        const bottomOffset = (i % 2 === 0 ? -1 : 1) * w * 0.06;
        return (
          <Path
            key={`ray-${i}`}
            d={`M ${top - 10} 0 L ${top + bottomOffset - 40} ${h * 0.7} L ${top + bottomOffset + 40} ${h * 0.7} L ${top + 10} 0 Z`}
            fill="url(#depth-ray)"
          />
        );
      })}

      {/* Surface bubbles streaming upward from random x-positions at
       *  the top — suggests we're deep and the world extends above. */}
      {Array.from({ length: 12 }).map((_, i) => (
        <SvgCircle
          key={`bub-${i}`}
          cx={w * (0.08 + (i / 12) * 0.85)}
          cy={h * 0.02 + rand() * 30}
          r={1.5 + rand() * 2.5}
          fill="#CAF0F8"
          opacity={0.35 + rand() * 0.3}
        />
      ))}

      {/* Kelp — wavy vertical strands anchored at the floor. */}
      {kelpX.map((xRatio, i) => {
        const kx = w * xRatio;
        const ky = h * 0.95;
        const kh = 120 + (i % 2) * 40;
        return (
          <Path
            key={`kelp-${i}`}
            d={`M ${kx} ${ky} Q ${kx + 14} ${ky - kh * 0.3} ${kx - 6} ${ky - kh * 0.6} T ${kx + 4} ${ky - kh}`}
            stroke="#2D5A3D"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            opacity={0.55}
          />
        );
      })}

      {/* Coral formations — varied shapes along the sides. */}
      {corals.map((c, i) => {
        if (c.type === 'branch') {
          return (
            <G key={`coral-${i}`} opacity={0.6}>
              <Path
                d={`M ${c.x} ${c.y} L ${c.x} ${c.y - c.size * 0.9}
                    M ${c.x} ${c.y - c.size * 0.4} L ${c.x - c.size * 0.4} ${c.y - c.size * 0.7}
                    M ${c.x} ${c.y - c.size * 0.5} L ${c.x + c.size * 0.4} ${c.y - c.size * 0.8}
                    M ${c.x - c.size * 0.2} ${c.y - c.size * 0.2} L ${c.x - c.size * 0.4} ${c.y - c.size * 0.35}`}
                stroke="#FF6B6B"
                strokeWidth={c.size * 0.16}
                strokeLinecap="round"
                fill="none"
              />
            </G>
          );
        }
        if (c.type === 'tower') {
          return (
            <G key={`coral-${i}`} opacity={0.55}>
              <Rect
                x={c.x - c.size * 0.18}
                y={c.y - c.size}
                width={c.size * 0.36}
                height={c.size}
                rx={c.size * 0.1}
                fill="#E85D04"
              />
              <SvgCircle cx={c.x} cy={c.y - c.size} r={c.size * 0.22} fill="#FFBA08" />
            </G>
          );
        }
        // fan
        return (
          <G key={`coral-${i}`} opacity={0.55}>
            <Path
              d={`M ${c.x} ${c.y} Q ${c.x - c.size * 0.6} ${c.y - c.size * 0.3} ${c.x - c.size * 0.5} ${c.y - c.size * 0.9}
                  M ${c.x} ${c.y} Q ${c.x - c.size * 0.3} ${c.y - c.size * 0.5} ${c.x - c.size * 0.2} ${c.y - c.size * 1.0}
                  M ${c.x} ${c.y} Q ${c.x} ${c.y - c.size * 0.5} ${c.x + c.size * 0.1} ${c.y - c.size * 1.0}
                  M ${c.x} ${c.y} Q ${c.x + c.size * 0.3} ${c.y - c.size * 0.5} ${c.x + c.size * 0.4} ${c.y - c.size * 0.95}
                  M ${c.x} ${c.y} Q ${c.x + c.size * 0.6} ${c.y - c.size * 0.3} ${c.x + c.size * 0.55} ${c.y - c.size * 0.8}`}
              stroke="#C77DFF"
              strokeWidth={c.size * 0.1}
              strokeLinecap="round"
              fill="none"
            />
          </G>
        );
      })}

      {/* Jellyfish — translucent bell + trailing tentacles. */}
      {jellies.map((j, i) => {
        const tentacles = 5;
        return (
          <G key={`jelly-${i}`}>
            <Ellipse
              cx={j.x}
              cy={j.y}
              rx={j.size}
              ry={j.size * 0.7}
              fill="url(#jelly-body)"
            />
            {/* Bell lower rim — a thin arc to anchor the tentacles. */}
            <Path
              d={`M ${j.x - j.size} ${j.y + j.size * 0.3} Q ${j.x} ${j.y + j.size * 0.8} ${j.x + j.size} ${j.y + j.size * 0.3}`}
              stroke="#CAF0F8"
              strokeWidth={1.4}
              fill="none"
              opacity={0.55}
            />
            {Array.from({ length: tentacles }).map((_, tI) => {
              const tx = j.x - j.size * 0.7 + (tI / (tentacles - 1)) * j.size * 1.4;
              const drop = j.size * (2 + (tI % 2) * 0.6);
              return (
                <Path
                  key={tI}
                  d={`M ${tx} ${j.y + j.size * 0.5} Q ${tx + (tI % 2 === 0 ? 4 : -4)} ${j.y + j.size + drop * 0.5} ${tx + (tI % 2 === 0 ? -2 : 2)} ${j.y + j.size + drop}`}
                  stroke="#CAF0F8"
                  strokeWidth={1}
                  fill="none"
                  opacity={0.45}
                />
              );
            })}
          </G>
        );
      })}

      {/* Fish schools — simple silhouettes, 5 fish per school arranged
       *  in a loose chevron. */}
      {fishSchools.map((s, i) => (
        <G key={`school-${i}`} opacity={0.55}>
          {[
            { dx: 0, dy: 0 },
            { dx: -8, dy: -4 },
            { dx: -16, dy: 0 },
            { dx: -8, dy: 4 },
            { dx: -20, dy: -6 },
          ].map((p, j) => (
            <G key={j}>
              <Ellipse
                cx={s.cx + p.dx}
                cy={s.cy + p.dy}
                rx={4}
                ry={2}
                fill="#03045E"
              />
              <Polygon
                points={`${s.cx + p.dx - 4},${s.cy + p.dy} ${s.cx + p.dx - 7},${s.cy + p.dy - 2} ${s.cx + p.dx - 7},${s.cy + p.dy + 2}`}
                fill="#03045E"
              />
            </G>
          ))}
        </G>
      ))}

      {/* Seafloor at the bottom of the slab — deeper, darker, with a
       *  rippled surface. */}
      <Path
        d={`M 0 ${h * 0.88} Q ${w * 0.2} ${h * 0.82} ${w * 0.4} ${h * 0.86} T ${w * 0.75} ${h * 0.86} T ${w} ${h * 0.87} L ${w} ${h} L 0 ${h} Z`}
        fill="url(#depth-floor)"
      />
      {/* Sand ripples on the floor. */}
      {[0.92, 0.94, 0.96].map((yRatio, i) => (
        <Path
          key={`ripple-${i}`}
          d={`M 0 ${h * yRatio} Q ${w * 0.3} ${h * (yRatio - 0.005)} ${w * 0.6} ${h * yRatio} T ${w} ${h * yRatio}`}
          stroke="#001A33"
          strokeWidth={1}
          fill="none"
          opacity={0.45}
        />
      ))}
    </Svg>
  );
}

// --------------------------------------------------------------------
// Aurora Peaks — night-time mountain range under a dancing aurora:
// moon + scattered stars near the top, 2-3 aurora wave bands low in
// the sky, multiple receding mountain silhouettes (darker = closer)
// with pine trees on the foreground peaks, snow caps on summits, and
// a soft snow drift at the very bottom.
// --------------------------------------------------------------------
function auroraPeaks(w: number, h: number): React.ReactNode {
  const rand = seeded(4);
  // Stars scattered across the top third — tiny dots of varying
  // brightness.
  const stars: Array<{ x: number; y: number; r: number; opacity: number }> = [];
  for (let i = 0; i < 40; i++) {
    stars.push({
      x: w * rand(),
      y: h * 0.02 + rand() * h * 0.45,
      r: 0.8 + rand() * 1.4,
      opacity: 0.4 + rand() * 0.5,
    });
  }
  // Three mountain layers — back (lightest) to front (darkest). Each
  // layer is built from a polyline of peaks at varying heights.
  function mountainLayer(
    color: string,
    opacity: number,
    baseY: number,
    peakY: number,
    peakCount: number,
    jitter: number,
    seed: number,
  ) {
    const r = seeded(seed);
    const pts: string[] = [`0,${baseY}`];
    for (let i = 0; i <= peakCount; i++) {
      const x = (i / peakCount) * w;
      const y = peakY + r() * jitter;
      pts.push(`${x},${y}`);
    }
    pts.push(`${w},${baseY}`, `${w},${h}`, `0,${h}`);
    return <Polygon points={pts.join(' ')} fill={color} opacity={opacity} />;
  }

  // Pine trees on the foreground layer — scattered clusters.
  const pines: Array<{ x: number; y: number; size: number }> = [];
  for (let i = 0; i < 20; i++) {
    pines.push({
      x: w * (0.04 + rand() * 0.92),
      y: h * (0.65 + rand() * 0.3),
      size: 10 + rand() * 10,
    });
  }

  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="aurora-1" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#A29BFE" stopOpacity={0} />
          <Stop offset="0.4" stopColor="#00B894" stopOpacity={0.4} />
          <Stop offset="0.7" stopColor="#6C5CE7" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#A29BFE" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="aurora-2" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FD79A8" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#A29BFE" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#74B9FF" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="snow-drift" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.35} />
        </LinearGradient>
        <RadialGradient id="moon-glow" cx="50%" cy="50%" r="60%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.7} />
          <Stop offset="0.4" stopColor="#E8E8F5" stopOpacity={0.25} />
          <Stop offset="1" stopColor="#E8E8F5" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Moon with halo glow */}
      <SvgCircle cx={w * 0.82} cy={h * 0.07} r={h * 0.07} fill="url(#moon-glow)" />
      <SvgCircle cx={w * 0.82} cy={h * 0.07} r={h * 0.035} fill="#F1F0FF" opacity={0.92} />
      <SvgCircle cx={w * 0.85} cy={h * 0.055} r={h * 0.012} fill="#CFD0E8" opacity={0.5} />
      <SvgCircle cx={w * 0.795} cy={h * 0.083} r={h * 0.008} fill="#CFD0E8" opacity={0.6} />

      {/* Stars — tiny dots, some with a cross-glint */}
      {stars.map((s, i) => (
        <G key={`star-${i}`}>
          <SvgCircle cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.opacity} />
          {s.r > 1.5 && (
            <G opacity={s.opacity * 0.6}>
              <Path
                d={`M ${s.x - 3} ${s.y} L ${s.x + 3} ${s.y}`}
                stroke="#FFFFFF"
                strokeWidth={0.6}
              />
              <Path
                d={`M ${s.x} ${s.y - 3} L ${s.x} ${s.y + 3}`}
                stroke="#FFFFFF"
                strokeWidth={0.6}
              />
            </G>
          )}
        </G>
      ))}

      {/* Aurora bands — multiple ribbons at varying heights. Each a
       *  flowing wave painted with the aurora gradient. */}
      {[0.15, 0.25, 0.38].map((yRatio, i) => {
        const gradient = i % 2 === 0 ? 'aurora-1' : 'aurora-2';
        const amp = 18 + i * 6;
        return (
          <Path
            key={`aurora-${i}`}
            d={`M 0 ${h * yRatio} Q ${w * 0.25} ${h * yRatio - amp} ${w * 0.5} ${h * yRatio} T ${w} ${h * yRatio + amp * 0.4} L ${w} ${h * yRatio + 32} Q ${w * 0.7} ${h * yRatio + 8} ${w * 0.4} ${h * yRatio + 28} T 0 ${h * yRatio + 18} Z`}
            fill={`url(#${gradient})`}
          />
        );
      })}

      {/* Mountain layers — back to front. Each layer gets darker + its
       *  peaks reach lower down the slab. */}
      {mountainLayer('#4A5580', 0.35, h * 0.72, h * 0.52, 10, 40, 501)}
      {mountainLayer('#2B3658', 0.55, h * 0.8, h * 0.58, 9, 50, 502)}
      {mountainLayer('#1B2838', 0.8, h * 0.88, h * 0.64, 8, 60, 503)}

      {/* Snow caps — triangular white hats on a handful of the
       *  front-layer peaks. */}
      {[0.14, 0.35, 0.58, 0.78].map((xRatio, i) => {
        const peakX = w * xRatio;
        const peakY = h * (0.55 + (i % 2) * 0.04);
        return (
          <Polygon
            key={`cap-${i}`}
            points={`${peakX - 10},${peakY + 12} ${peakX},${peakY} ${peakX + 10},${peakY + 12} ${peakX + 3},${peakY + 18} ${peakX - 3},${peakY + 18}`}
            fill="#FFFFFF"
            opacity={0.65}
          />
        );
      })}

      {/* Pine trees dotted on the foreground mountain layer. Simple
       *  stacked triangles for the classic pine silhouette. */}
      {pines.map((p, i) => (
        <G key={`pine-${i}`} opacity={0.75}>
          <Rect
            x={p.x - p.size * 0.08}
            y={p.y}
            width={p.size * 0.16}
            height={p.size * 0.35}
            fill="#0B1628"
          />
          <Polygon
            points={`${p.x - p.size * 0.4},${p.y} ${p.x},${p.y - p.size * 0.5} ${p.x + p.size * 0.4},${p.y}`}
            fill="#0B1628"
          />
          <Polygon
            points={`${p.x - p.size * 0.32},${p.y - p.size * 0.3} ${p.x},${p.y - p.size * 0.8} ${p.x + p.size * 0.32},${p.y - p.size * 0.3}`}
            fill="#0B1628"
          />
          <Polygon
            points={`${p.x - p.size * 0.22},${p.y - p.size * 0.6} ${p.x},${p.y - p.size * 1.05} ${p.x + p.size * 0.22},${p.y - p.size * 0.6}`}
            fill="#0B1628"
          />
        </G>
      ))}

      {/* Snow drift at the bottom — soft gradient + a couple of
       *  humped snowbanks. */}
      <Path
        d={`M 0 ${h * 0.92} Q ${w * 0.25} ${h * 0.88} ${w * 0.5} ${h * 0.92} T ${w} ${h * 0.92} L ${w} ${h} L 0 ${h} Z`}
        fill="url(#snow-drift)"
      />
      {/* A few snowflake specks in the foreground. */}
      {Array.from({ length: 18 }).map((_, i) => (
        <SvgCircle
          key={`flake-${i}`}
          cx={w * rand()}
          cy={h * (0.6 + rand() * 0.4)}
          r={1 + rand()}
          fill="#FFFFFF"
          opacity={0.4 + rand() * 0.4}
        />
      ))}
    </Svg>
  );
}

// --------------------------------------------------------------------
// Inferno Core — the final world. Smoke plumes rising at the top,
// a distant volcanic eruption silhouette, 6 obsidian spires at varied
// heights repeating down the slab, bubbling lava pools at many depths,
// hot glowing ground cracks, and a molten lava river at the very
// bottom (where the player arrived — Level 301).
// --------------------------------------------------------------------
function infernoCore(w: number, h: number): React.ReactNode {
  const rand = seeded(5);
  // Six obsidian spires of differing heights, alternating sides so
  // the path stays unobstructed.
  const spires: Array<{ x: number; baseY: number; height: number; width: number }> = [];
  for (let i = 0; i < 10; i++) {
    const side = i % 2 === 0 ? 0.04 + rand() * 0.2 : 0.76 + rand() * 0.2;
    spires.push({
      x: w * side,
      baseY: h * (0.15 + (i / 10) * 0.8),
      height: 55 + rand() * 90,
      width: 20 + rand() * 18,
    });
  }
  // Lava pools scattered throughout.
  const lavaPools: Array<{ cx: number; cy: number; rx: number; ry: number }> = [];
  for (let i = 0; i < 8; i++) {
    lavaPools.push({
      cx: w * (0.12 + rand() * 0.76),
      cy: h * (0.22 + (i / 8) * 0.72),
      rx: 20 + rand() * 30,
      ry: 5 + rand() * 8,
    });
  }
  // Ground cracks — short zigzags of hot glow.
  const cracks: Array<{ points: string }> = [];
  for (let i = 0; i < 14; i++) {
    const sx = w * rand();
    const sy = h * (0.3 + rand() * 0.65);
    const pts = [`${sx},${sy}`];
    let cx = sx;
    let cy = sy;
    const segs = 3 + Math.floor(rand() * 3);
    for (let j = 0; j < segs; j++) {
      cx += (rand() - 0.5) * 60;
      cy += (rand() - 0.2) * 20;
      pts.push(`${cx},${cy}`);
    }
    cracks.push({ points: pts.join(' L ').replace(/^/, 'M ') });
  }
  // Smoke plumes rising from lava pools near the top of the slab.
  const plumes = [
    { x: w * 0.22, baseY: h * 0.28 },
    { x: w * 0.55, baseY: h * 0.18 },
    { x: w * 0.82, baseY: h * 0.34 },
  ];

  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="lava-top" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFBA08" stopOpacity={0.85} />
          <Stop offset="1" stopColor="#E85D04" stopOpacity={0.9} />
        </LinearGradient>
        <LinearGradient id="lava-river" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFBA08" stopOpacity={0} />
          <Stop offset="0.3" stopColor="#E85D04" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#9D0208" stopOpacity={0.85} />
        </LinearGradient>
        <LinearGradient id="smoke-plume" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1A0A0A" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#2B1B1B" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#1A0A0A" stopOpacity={0.7} />
        </LinearGradient>
        <LinearGradient id="spire-face" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#1A0A0A" stopOpacity={0.95} />
          <Stop offset="0.5" stopColor="#3A1010" stopOpacity={0.9} />
          <Stop offset="1" stopColor="#1A0A0A" stopOpacity={0.95} />
        </LinearGradient>
        <RadialGradient id="ember-glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFBA08" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#FFBA08" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Distant volcanic eruption silhouette peeking at the top. */}
      <Polygon
        points={`${w * 0.3},${h * 0.12} ${w * 0.42},${h * 0.02} ${w * 0.5},${h * 0.05} ${w * 0.58},${h * 0.02} ${w * 0.68},${h * 0.12}`}
        fill="#1A0A0A"
        opacity={0.75}
      />
      {/* Eruption glow crown */}
      <Path
        d={`M ${w * 0.45} ${h * 0.05} Q ${w * 0.5} ${h * 0.01} ${w * 0.55} ${h * 0.05}`}
        stroke="#FFBA08"
        strokeWidth={3}
        fill="none"
        opacity={0.65}
      />
      <SvgCircle cx={w * 0.5} cy={h * 0.04} r={h * 0.045} fill="url(#ember-glow)" />

      {/* Rising smoke plumes — wide soft billows that fade upward. */}
      {plumes.map((p, i) => (
        <G key={`plume-${i}`} opacity={0.6}>
          <Ellipse cx={p.x} cy={p.baseY} rx={30} ry={14} fill="url(#smoke-plume)" />
          <Ellipse cx={p.x + 6} cy={p.baseY - 20} rx={22} ry={12} fill="url(#smoke-plume)" />
          <Ellipse cx={p.x - 8} cy={p.baseY - 40} rx={18} ry={10} fill="url(#smoke-plume)" />
          <Ellipse cx={p.x + 4} cy={p.baseY - 58} rx={14} ry={8} fill="url(#smoke-plume)" />
        </G>
      ))}

      {/* Obsidian spires — sharp faceted triangles with darker side
       *  face for depth. */}
      {spires.map((s, i) => {
        const { x, baseY, height, width } = s;
        const apexY = baseY - height;
        const leftX = x - width / 2;
        const rightX = x + width / 2;
        return (
          <G key={`spire-${i}`}>
            {/* Main facet */}
            <Polygon
              points={`${leftX},${baseY} ${x},${apexY} ${rightX},${baseY}`}
              fill="url(#spire-face)"
            />
            {/* Darker shadow facet on one side */}
            <Polygon
              points={`${leftX},${baseY} ${x},${apexY} ${x - width * 0.1},${baseY - height * 0.5}`}
              fill="#0A0000"
              opacity={0.55}
            />
            {/* Thin glowing fissure line climbing the spire */}
            <Path
              d={`M ${x - width * 0.1} ${baseY - 4} L ${x - width * 0.05} ${baseY - height * 0.4} L ${x + width * 0.05} ${baseY - height * 0.7}`}
              stroke="#FFBA08"
              strokeWidth={0.8}
              fill="none"
              opacity={0.45}
            />
          </G>
        );
      })}

      {/* Lava pools — glowing ovals with a hot inner core. */}
      {lavaPools.map((p, i) => (
        <G key={`pool-${i}`}>
          <Ellipse
            cx={p.cx}
            cy={p.cy + 6}
            rx={p.rx * 1.2}
            ry={p.ry * 1.4}
            fill="url(#ember-glow)"
            opacity={0.5}
          />
          <Ellipse cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill="url(#lava-top)" />
          <Ellipse
            cx={p.cx}
            cy={p.cy - 1}
            rx={p.rx * 0.7}
            ry={p.ry * 0.55}
            fill="#FFE8A3"
            opacity={0.7}
          />
        </G>
      ))}

      {/* Ground cracks — jagged glowing lines. */}
      {cracks.map((c, i) => (
        <Path
          key={`crack-${i}`}
          d={c.points}
          stroke={i % 2 === 0 ? '#FFBA08' : '#E85D04'}
          strokeWidth={1.2}
          fill="none"
          opacity={0.55 + (i % 3) * 0.1}
          strokeLinecap="round"
        />
      ))}

      {/* Main lava river at the bottom — the player's arrival point. */}
      <Path
        d={`M 0 ${h * 0.84} Q ${w * 0.2} ${h * 0.78} ${w * 0.45} ${h * 0.84} T ${w * 0.8} ${h * 0.84} T ${w} ${h * 0.85} L ${w} ${h} L 0 ${h} Z`}
        fill="url(#lava-river)"
      />
      {/* River surface highlights — hot yellow streaks. */}
      {[0.88, 0.92, 0.96].map((yRatio, i) => (
        <Path
          key={`streak-${i}`}
          d={`M 0 ${h * yRatio} Q ${w * 0.3} ${h * (yRatio - 0.008)} ${w * 0.6} ${h * yRatio} T ${w} ${h * yRatio}`}
          stroke={i === 0 ? '#FFE8A3' : '#FFBA08'}
          strokeWidth={1.2}
          fill="none"
          opacity={0.55 - i * 0.1}
        />
      ))}
      {/* A handful of floating embers drift over the river. */}
      {Array.from({ length: 14 }).map((_, i) => (
        <SvgCircle
          key={`ember-${i}`}
          cx={w * rand()}
          cy={h * (0.86 + rand() * 0.12)}
          r={1 + rand() * 1.5}
          fill="#FFBA08"
          opacity={0.6 + rand() * 0.3}
        />
      ))}
    </Svg>
  );
}

const SCENERY_BY_THEME: Record<WorldTheme, (w: number, h: number) => React.ReactNode> = {
  emerald_grove: emeraldGrove,
  amber_dunes: amberDunes,
  crystal_depths: crystalDepths,
  aurora_peaks: auroraPeaks,
  inferno_core: infernoCore,
};
