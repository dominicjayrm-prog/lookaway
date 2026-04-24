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
// Crystal Depths — placeholder until next turn.
// --------------------------------------------------------------------
function crystalDepths(w: number, h: number): React.ReactNode {
  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      {[0.2, 0.5, 0.8].map((x, i) => (
        <Path
          key={i}
          d={`M ${w * x} 0 L ${w * (x - 0.08)} ${h} L ${w * (x + 0.08)} ${h} Z`}
          fill="#CAF0F8"
          opacity={0.08}
        />
      ))}
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
      <Path
        d={`M 0 ${h * 0.9} Q ${w * 0.3} ${h * 0.82} ${w * 0.6} ${h * 0.88} T ${w} ${h * 0.88} L ${w} ${h} L 0 ${h} Z`}
        fill="#0077B6"
        opacity={0.55}
      />
    </Svg>
  );
}

// --------------------------------------------------------------------
// Aurora Peaks — placeholder until next turn.
// --------------------------------------------------------------------
function auroraPeaks(w: number, h: number): React.ReactNode {
  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="aurora-band" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#A29BFE" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#00B894" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#A29BFE" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path
        d={`M 0 ${h * 0.18} Q ${w * 0.3} ${h * 0.08} ${w * 0.6} ${h * 0.2} T ${w} ${h * 0.22} L ${w} ${h * 0.32} Q ${w * 0.7} ${h * 0.18} ${w * 0.4} ${h * 0.3} T 0 ${h * 0.28} Z`}
        fill="url(#aurora-band)"
      />
      <Polygon
        points={`0,${h * 0.7} ${w * 0.2},${h * 0.4} ${w * 0.38},${h * 0.65} ${w * 0.55},${h * 0.35} ${w * 0.75},${h * 0.55} ${w * 0.9},${h * 0.42} ${w},${h * 0.65} ${w},${h} 0,${h}`}
        fill="#1B2838"
        opacity={0.55}
      />
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
  );
}

// --------------------------------------------------------------------
// Inferno Core — placeholder until next turn.
// --------------------------------------------------------------------
function infernoCore(w: number, h: number): React.ReactNode {
  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="lava-glow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFBA08" stopOpacity={0} />
          <Stop offset="1" stopColor="#FFBA08" stopOpacity={0.6} />
        </LinearGradient>
      </Defs>
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
      <Path
        d={`M 0 ${h * 0.88} Q ${w * 0.25} ${h * 0.82} ${w * 0.5} ${h * 0.9} T ${w} ${h * 0.88} L ${w} ${h} L 0 ${h} Z`}
        fill="url(#lava-glow)"
      />
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
  );
}

const SCENERY_BY_THEME: Record<WorldTheme, (w: number, h: number) => React.ReactNode> = {
  emerald_grove: emeraldGrove,
  amber_dunes: amberDunes,
  crystal_depths: crystalDepths,
  aurora_peaks: auroraPeaks,
  inferno_core: infernoCore,
};

// Keep imports that each biome may later need.
export const __sceneryImports = { RadialGradient };
