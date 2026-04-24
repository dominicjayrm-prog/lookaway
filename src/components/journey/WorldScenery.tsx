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
// Emerald Grove — dense forest with depth:
//   1. A hazy back layer of distant tree silhouettes (far, low opacity)
//   2. Oak-like rounded-canopy trees at mid depth (varied sizes)
//   3. Conifer / pine pointed trees at front (alternating sides)
//   4. Dappled sunlight (soft glowing circles, NOT vertical beams)
//   5. Ground layer: varied mushroom clusters, flower patches, grass
//      tufts, a couple of fallen logs
//   6. A bird gliding between canopies
// All assembled using a seeded PRNG so items look naturally scattered
// without reshuffling on each render.
// --------------------------------------------------------------------
function emeraldGrove(w: number, h: number): React.ReactNode {
  const rand = seeded(1);

  // Back-layer silhouettes: 20 distant trees dotted across the width
  // at low opacity, just behind the gradient.
  const backTrees = Array.from({ length: 22 }).map(() => ({
    x: rand() * w,
    y: rand() * h,
    r: 18 + rand() * 14,
  }));

  // Mid layer: rounded-canopy oaks, 12 on each side (24 total).
  const midTrees: Array<{ x: number; y: number; size: number; side: 'l' | 'r' }> = [];
  const midCount = 24;
  for (let i = 0; i < midCount; i++) {
    const t = i / midCount;
    const jitter = (rand() - 0.5) * (h / midCount) * 0.7;
    const y = h * 0.05 + t * h * 0.88 + jitter;
    const side: 'l' | 'r' = i % 2 === 0 ? 'l' : 'r';
    const size = 48 + rand() * 26;
    const maxInset = 0.2;
    const x = side === 'l' ? rand() * (w * maxInset) : w - rand() * (w * maxInset);
    midTrees.push({ x, y, size, side });
  }

  // Front layer: sharper conifers further in-screen, alternating sides.
  const pines: Array<{ x: number; y: number; size: number }> = [];
  for (let i = 0; i < 18; i++) {
    const t = i / 18;
    const jitter = (rand() - 0.5) * 50;
    const y = h * 0.08 + t * h * 0.84 + jitter;
    const side = i % 2 === 0 ? 'l' : 'r';
    const offset = 0.07 + rand() * 0.08;
    const x = side === 'l' ? w * offset : w * (1 - offset);
    pines.push({ x, y, size: 28 + rand() * 22 });
  }

  // Dappled light spots — soft glowing circles scattered through the
  // slab. Replaces the old vertical beam-stripes which read as bars.
  const dapples = Array.from({ length: 16 }).map(() => ({
    x: rand() * w,
    y: rand() * h,
    r: 22 + rand() * 30,
  }));

  // Ground layer items — confined to the bottom 12% band.
  const mushrooms = Array.from({ length: 22 }).map((_, i) => ({
    x: (i / 22) * w + rand() * 20 - 10,
    y: h * (0.88 + rand() * 0.1),
    r: 2.5 + rand() * 2.5,
    // Red-white spotted vs. tan — two variants for a proper forest look.
    variant: rand() > 0.5 ? 'red' : 'tan',
  }));
  const grassTufts = Array.from({ length: 30 }).map((_, i) => ({
    x: (i / 30) * w + rand() * 20,
    y: h - 4 - rand() * 16,
  }));
  const flowers = Array.from({ length: 14 }).map(() => ({
    x: rand() * w,
    y: h * (0.9 + rand() * 0.08),
    color: ['#FFC8DD', '#FFE8A3', '#FFFFFF', '#C9B1FF'][Math.floor(rand() * 4)],
  }));
  // Two fallen logs in the ground band.
  const logs = [
    { x: w * 0.18, y: h * 0.96, len: w * 0.18 },
    { x: w * 0.64, y: h * 0.93, len: w * 0.22 },
  ];

  // Single bird gliding in the mid-upper area.
  const bird = { x: w * 0.55, y: h * 0.18, size: 8 };

  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="grove-canopy-top" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0F3D2B" stopOpacity={0.65} />
          <Stop offset="1" stopColor="#0F3D2B" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="grove-ground" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0F3D2B" stopOpacity={0} />
          <Stop offset="1" stopColor="#061810" stopOpacity={0.85} />
        </LinearGradient>
        <RadialGradient id="grove-dapple" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFF3B0" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#FFF3B0" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="mushroom-red" cx="50%" cy="40%" r="60%">
          <Stop offset="0" stopColor="#FF8A8A" stopOpacity={0.9} />
          <Stop offset="1" stopColor="#C1272D" stopOpacity={0.85} />
        </RadialGradient>
      </Defs>

      {/* ---------- LAYER 1: Back silhouettes (hazy depth) ---------- */}
      {backTrees.map((b, i) => (
        <Ellipse
          key={`bg-${i}`}
          cx={b.x}
          cy={b.y}
          rx={b.r}
          ry={b.r * 0.85}
          fill="#1B4332"
          opacity={0.18}
        />
      ))}

      {/* ---------- Top-edge canopy: wavy, bleeds out of slab ---------- */}
      <Path
        d={`M 0 0 L 0 ${h * 0.09} Q ${w * 0.12} ${h * 0.03} ${w * 0.28} ${h * 0.08} Q ${w * 0.46} ${h * 0.12} ${w * 0.62} ${h * 0.05} Q ${w * 0.8} 0 ${w * 0.92} ${h * 0.06} Q ${w * 0.98} ${h * 0.08} ${w} ${h * 0.04} L ${w} 0 Z`}
        fill="#0F3D2B"
        opacity={0.5}
      />
      <Path
        d={`M 0 ${h * 0.02} Q ${w * 0.22} 0 ${w * 0.45} ${h * 0.05} Q ${w * 0.72} ${h * 0.1} ${w} ${h * 0.02} L ${w} 0 L 0 0 Z`}
        fill="url(#grove-canopy-top)"
      />

      {/* ---------- Dappled sunlight (soft radial pools) ---------- */}
      {dapples.map((d, i) => (
        <SvgCircle
          key={`dapple-${i}`}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill="url(#grove-dapple)"
        />
      ))}

      {/* ---------- LAYER 2: Mid-depth oak trees ---------- */}
      {midTrees.map((t, i) => {
        const trunkW = t.size * 0.18;
        const trunkH = t.size * 1.3;
        const canopyR = t.size * 0.62;
        return (
          <G key={`mid-${i}`} opacity={0.7}>
            <Rect
              x={t.x - trunkW / 2}
              y={t.y}
              width={trunkW}
              height={trunkH}
              fill="#2B1810"
              rx={1}
            />
            {/* Bark shadow line for depth */}
            <Rect
              x={t.x - trunkW / 2}
              y={t.y}
              width={trunkW * 0.35}
              height={trunkH}
              fill="#180A06"
              opacity={0.5}
            />
            {/* Three-layer billowy canopy */}
            <Ellipse
              cx={t.x}
              cy={t.y - canopyR * 0.2}
              rx={canopyR * 1.15}
              ry={canopyR * 0.9}
              fill="#0B2E1F"
            />
            <Ellipse
              cx={t.x + canopyR * 0.15}
              cy={t.y - canopyR * 0.55}
              rx={canopyR * 0.95}
              ry={canopyR * 0.78}
              fill="#1B4332"
            />
            <Ellipse
              cx={t.x - canopyR * 0.12}
              cy={t.y - canopyR * 0.95}
              rx={canopyR * 0.7}
              ry={canopyR * 0.6}
              fill="#2D6A4F"
            />
            {/* Small highlight pop */}
            <Ellipse
              cx={t.x - canopyR * 0.25}
              cy={t.y - canopyR * 1.05}
              rx={canopyR * 0.22}
              ry={canopyR * 0.18}
              fill="#52B788"
              opacity={0.6}
            />
            {/* Hanging vine on the outer side */}
            {t.side === 'l' ? (
              <Path
                d={`M ${t.x - canopyR * 0.95} ${t.y - canopyR * 0.1} Q ${t.x - canopyR * 1.15} ${t.y + canopyR * 0.5} ${t.x - canopyR * 0.9} ${t.y + canopyR * 1.1} Q ${t.x - canopyR * 0.7} ${t.y + canopyR * 1.6} ${t.x - canopyR * 0.85} ${t.y + canopyR * 2.0}`}
                stroke="#52B788"
                strokeWidth={1.4}
                fill="none"
                opacity={0.65}
              />
            ) : (
              <Path
                d={`M ${t.x + canopyR * 0.95} ${t.y - canopyR * 0.1} Q ${t.x + canopyR * 1.15} ${t.y + canopyR * 0.5} ${t.x + canopyR * 0.9} ${t.y + canopyR * 1.1} Q ${t.x + canopyR * 0.7} ${t.y + canopyR * 1.6} ${t.x + canopyR * 0.85} ${t.y + canopyR * 2.0}`}
                stroke="#52B788"
                strokeWidth={1.4}
                fill="none"
                opacity={0.65}
              />
            )}
          </G>
        );
      })}

      {/* ---------- LAYER 3: Foreground pines ---------- */}
      {pines.map((p, i) => {
        const trunkW = p.size * 0.1;
        const trunkH = p.size * 0.3;
        return (
          <G key={`pine-${i}`} opacity={0.85}>
            <Rect
              x={p.x - trunkW / 2}
              y={p.y}
              width={trunkW}
              height={trunkH}
              fill="#2B1810"
            />
            {/* Stacked triangular fronds — 4 layers, each smaller. */}
            <Polygon
              points={`${p.x - p.size * 0.55},${p.y} ${p.x},${p.y - p.size * 0.55} ${p.x + p.size * 0.55},${p.y}`}
              fill="#0B2E1F"
            />
            <Polygon
              points={`${p.x - p.size * 0.45},${p.y - p.size * 0.3} ${p.x},${p.y - p.size * 0.85} ${p.x + p.size * 0.45},${p.y - p.size * 0.3}`}
              fill="#1B4332"
            />
            <Polygon
              points={`${p.x - p.size * 0.35},${p.y - p.size * 0.6} ${p.x},${p.y - p.size * 1.15} ${p.x + p.size * 0.35},${p.y - p.size * 0.6}`}
              fill="#2D6A4F"
            />
            <Polygon
              points={`${p.x - p.size * 0.22},${p.y - p.size * 0.9} ${p.x},${p.y - p.size * 1.35} ${p.x + p.size * 0.22},${p.y - p.size * 0.9}`}
              fill="#40916C"
            />
          </G>
        );
      })}

      {/* ---------- Gliding bird silhouette ---------- */}
      <G opacity={0.55}>
        <Path
          d={`M ${bird.x - bird.size} ${bird.y} Q ${bird.x - bird.size * 0.5} ${bird.y - bird.size * 0.6} ${bird.x} ${bird.y} Q ${bird.x + bird.size * 0.5} ${bird.y - bird.size * 0.6} ${bird.x + bird.size} ${bird.y}`}
          stroke="#0B2E1F"
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />
      </G>

      {/* ---------- Ground band ---------- */}
      <Path
        d={`M 0 ${h * 0.86} Q ${w * 0.3} ${h * 0.83} ${w * 0.65} ${h * 0.87} T ${w} ${h * 0.86} L ${w} ${h} L 0 ${h} Z`}
        fill="url(#grove-ground)"
      />

      {/* ---------- Fallen logs ---------- */}
      {logs.map((l, i) => (
        <G key={`log-${i}`} opacity={0.75}>
          <Rect
            x={l.x}
            y={l.y - 5}
            width={l.len}
            height={10}
            rx={5}
            fill="#3D2817"
          />
          <Rect
            x={l.x + 3}
            y={l.y - 3}
            width={l.len - 6}
            height={3}
            rx={1.5}
            fill="#5A3A22"
            opacity={0.7}
          />
        </G>
      ))}

      {/* ---------- Grass tufts ---------- */}
      {grassTufts.map((g, i) => (
        <G key={`grass-${i}`} opacity={0.65}>
          <Polygon
            points={`${g.x - 3},${g.y + 3} ${g.x - 4},${g.y - 5} ${g.x - 2},${g.y + 2}`}
            fill="#40916C"
          />
          <Polygon
            points={`${g.x},${g.y + 3} ${g.x - 1},${g.y - 7} ${g.x + 1},${g.y + 2}`}
            fill="#52B788"
          />
          <Polygon
            points={`${g.x + 3},${g.y + 3} ${g.x + 4},${g.y - 5} ${g.x + 2},${g.y + 2}`}
            fill="#40916C"
          />
        </G>
      ))}

      {/* ---------- Flower clumps ---------- */}
      {flowers.map((f, i) => (
        <G key={`flower-${i}`}>
          <SvgCircle cx={f.x - 2} cy={f.y - 1} r={1.5} fill={f.color} opacity={0.85} />
          <SvgCircle cx={f.x + 2} cy={f.y - 1} r={1.5} fill={f.color} opacity={0.85} />
          <SvgCircle cx={f.x} cy={f.y - 3} r={1.5} fill={f.color} opacity={0.85} />
          <SvgCircle cx={f.x} cy={f.y} r={1} fill="#FFE8A3" opacity={0.9} />
        </G>
      ))}

      {/* ---------- Mushrooms (two variants) ---------- */}
      {mushrooms.map((m, i) => (
        <G key={`mushroom-${i}`}>
          {/* Stem */}
          <Rect
            x={m.x - m.r * 0.3}
            y={m.y}
            width={m.r * 0.6}
            height={m.r * 1.4}
            rx={m.r * 0.15}
            fill="#F5E6D3"
            opacity={0.85}
          />
          {/* Cap */}
          {m.variant === 'red' ? (
            <>
              <Ellipse
                cx={m.x}
                cy={m.y}
                rx={m.r * 1.5}
                ry={m.r * 0.9}
                fill="url(#mushroom-red)"
              />
              {/* Two white spots on the cap */}
              <SvgCircle cx={m.x - m.r * 0.6} cy={m.y - m.r * 0.2} r={m.r * 0.2} fill="#FFFFFF" opacity={0.85} />
              <SvgCircle cx={m.x + m.r * 0.4} cy={m.y + m.r * 0.1} r={m.r * 0.15} fill="#FFFFFF" opacity={0.85} />
            </>
          ) : (
            <Ellipse
              cx={m.x}
              cy={m.y}
              rx={m.r * 1.4}
              ry={m.r * 0.8}
              fill="#D4A373"
              opacity={0.9}
            />
          )}
        </G>
      ))}
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

  // Dune ridges that tile the FULL slab height, not just the top.
  // Each ridge is a gently waving horizontal band at decreasing
  // intervals, alternating shadow depth so the eye reads depth as
  // you scroll past.
  const duneRidges: Array<{ y: number; amp: number; opacity: number; tone: 'light' | 'dark' }> = [];
  {
    const step = 160;
    for (let y = 40; y < h - 120; y += step + Math.floor(rand() * 40)) {
      duneRidges.push({
        y,
        amp: 22 + rand() * 34,
        opacity: 0.25 + rand() * 0.35,
        tone: rand() > 0.55 ? 'dark' : 'light',
      });
    }
  }

  // Cacti scattered in the mid band, alternating sides so the path
  // stays clear. Mix of saguaros (two arms) and barrel cacti.
  const cacti: Array<{ x: number; y: number; size: number; kind: 'saguaro' | 'barrel' }> = [];
  for (let i = 0; i < 14; i++) {
    const side = i % 2 === 0 ? rand() * 0.18 : 0.82 + rand() * 0.16;
    cacti.push({
      x: w * side,
      y: h * (0.1 + (i / 14) * 0.85) + (rand() - 0.5) * 30,
      size: 18 + rand() * 14,
      kind: rand() > 0.3 ? 'saguaro' : 'barrel',
    });
  }

  // Ancient obelisks — stone pillars poking out of the dunes. 6
  // scattered, occasionally in pairs.
  const obelisks: Array<{ x: number; y: number; height: number }> = [];
  for (let i = 0; i < 7; i++) {
    obelisks.push({
      x: w * (0.06 + rand() * 0.88),
      y: h * (0.15 + rand() * 0.78),
      height: 28 + rand() * 28,
    });
  }

  // Pyramid silhouettes at two depths — far (hazy) and closer. Three
  // total at varied positions down the slab.
  const pyramids = [
    { cx: w * 0.3, baseY: h * 0.25, width: 140, height: 80, far: true },
    { cx: w * 0.72, baseY: h * 0.56, width: 200, height: 120, far: false },
    { cx: w * 0.18, baseY: h * 0.82, width: 110, height: 65, far: true },
  ];

  // Lonely palm tree silhouettes at 4 spots.
  const palms: Array<{ x: number; y: number; size: number }> = [];
  for (let i = 0; i < 4; i++) {
    palms.push({
      x: w * (0.12 + rand() * 0.76),
      y: h * (0.25 + i * 0.22) + (rand() - 0.5) * 40,
      size: 26 + rand() * 12,
    });
  }

  // Bleached bones on the sand — two skulls and a couple of rib sets.
  const bones = [
    { x: w * 0.08, y: h * 0.94, kind: 'skull' as const },
    { x: w * 0.86, y: h * 0.97, kind: 'ribs' as const },
    { x: w * 0.42, y: h * 0.98, kind: 'ribs' as const },
  ];

  // Sand ripple arcs on the foreground dune.
  const ripples = [0.88, 0.91, 0.94, 0.97];

  // Tumbling sand-grass tufts.
  const grassTufts = Array.from({ length: 18 }).map((_, i) => ({
    x: (i / 18) * w + rand() * 30,
    y: h * (0.7 + rand() * 0.28),
  }));

  // A vulture circling in the sky-ish upper band.
  const vulture = { x: w * 0.58, y: h * 0.15, size: 10 };

  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="dune-shadow-a" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7F5539" stopOpacity={0} />
          <Stop offset="1" stopColor="#7F5539" stopOpacity={0.55} />
        </LinearGradient>
        <LinearGradient id="dune-shadow-b" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5A3A22" stopOpacity={0} />
          <Stop offset="1" stopColor="#4A2A18" stopOpacity={0.65} />
        </LinearGradient>
        <RadialGradient id="sun-halo" cx="50%" cy="50%" r="60%">
          <Stop offset="0" stopColor="#FFE8A3" stopOpacity={0.7} />
          <Stop offset="0.5" stopColor="#FFBA08" stopOpacity={0.3} />
          <Stop offset="1" stopColor="#FFBA08" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="heat-haze" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FEFAE0" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#FEFAE0" stopOpacity={0.25} />
          <Stop offset="1" stopColor="#FEFAE0" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id="palm-frond" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#2D5A3D" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#2D5A3D" stopOpacity={0.85} />
          <Stop offset="1" stopColor="#2D5A3D" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* ---------- Setting sun with halo + rays ---------- */}
      <SvgCircle cx={w * 0.78} cy={h * 0.07} r={h * 0.12} fill="url(#sun-halo)" />
      <SvgCircle cx={w * 0.78} cy={h * 0.07} r={h * 0.055} fill="#FFE8A3" opacity={0.95} />
      <SvgCircle cx={w * 0.78} cy={h * 0.07} r={h * 0.03} fill="#FFFFFF" opacity={0.92} />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const r1 = h * 0.06;
        const r2 = h * 0.135;
        const cx = w * 0.78;
        const cy = h * 0.07;
        const x1 = cx + Math.cos(angle) * r1;
        const y1 = cy + Math.sin(angle) * r1;
        const x2 = cx + Math.cos(angle) * r2;
        const y2 = cy + Math.sin(angle) * r2;
        return (
          <Path
            key={`ray-${i}`}
            d={`M ${x1} ${y1} L ${x2} ${y2}`}
            stroke="#FFE8A3"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.5}
          />
        );
      })}

      {/* ---------- Vulture silhouette ---------- */}
      <G opacity={0.55}>
        <Path
          d={`M ${vulture.x - vulture.size} ${vulture.y} Q ${vulture.x - vulture.size * 0.5} ${vulture.y - vulture.size * 0.55} ${vulture.x} ${vulture.y + vulture.size * 0.15} Q ${vulture.x + vulture.size * 0.5} ${vulture.y - vulture.size * 0.55} ${vulture.x + vulture.size} ${vulture.y}`}
          stroke="#3D2817"
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
        />
      </G>

      {/* ---------- Pyramid silhouettes ---------- */}
      {pyramids.map((p, i) => (
        <G key={`pyr-${i}`} opacity={p.far ? 0.35 : 0.55}>
          <Polygon
            points={`${p.cx - p.width / 2},${p.baseY} ${p.cx},${p.baseY - p.height} ${p.cx + p.width / 2},${p.baseY}`}
            fill={p.far ? '#7F5539' : '#5A3A22'}
          />
          {/* Shadow side for depth */}
          <Polygon
            points={`${p.cx},${p.baseY - p.height} ${p.cx + p.width / 2},${p.baseY} ${p.cx + p.width / 4},${p.baseY}`}
            fill="#3D2817"
            opacity={0.5}
          />
        </G>
      ))}

      {/* ---------- Dune ridges (tiled throughout the slab) ---------- */}
      {duneRidges.map((d, i) => (
        <Path
          key={`dune-${i}`}
          d={`M 0 ${d.y} Q ${w * 0.25} ${d.y - d.amp * 0.6} ${w * 0.5} ${d.y - d.amp * 0.2} T ${w} ${d.y - d.amp * 0.4} L ${w} ${d.y + 120} L 0 ${d.y + 120} Z`}
          fill={d.tone === 'dark' ? 'url(#dune-shadow-b)' : 'url(#dune-shadow-a)'}
          opacity={d.opacity}
        />
      ))}

      {/* ---------- Heat-haze bands near the sun / horizon ---------- */}
      {[0.11, 0.14, 0.17, 0.2].map((yRatio, i) => (
        <Rect
          key={`haze-${i}`}
          x={w * 0.08}
          y={h * yRatio}
          width={w * 0.84}
          height={1.5}
          fill="url(#heat-haze)"
          opacity={0.7 - i * 0.12}
        />
      ))}

      {/* ---------- Palm trees ---------- */}
      {palms.map((p, i) => (
        <G key={`palm-${i}`} opacity={0.55}>
          {/* Trunk — curved */}
          <Path
            d={`M ${p.x} ${p.y} Q ${p.x + 6} ${p.y - p.size * 0.5} ${p.x - 3} ${p.y - p.size * 1.1}`}
            stroke="#5A3A22"
            strokeWidth={p.size * 0.1}
            fill="none"
            strokeLinecap="round"
          />
          {/* Fronds — 5 radiating from the top */}
          {[-65, -30, 0, 30, 65].map((angle, fi) => {
            const rad = (angle * Math.PI) / 180;
            const len = p.size * 0.7;
            const apexX = p.x - 3;
            const apexY = p.y - p.size * 1.1;
            const ex = apexX + Math.cos(rad - Math.PI / 2) * len;
            const ey = apexY + Math.sin(rad - Math.PI / 2) * len;
            return (
              <Path
                key={fi}
                d={`M ${apexX} ${apexY} Q ${(apexX + ex) / 2} ${(apexY + ey) / 2 - 5} ${ex} ${ey}`}
                stroke="#2D5A3D"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}
        </G>
      ))}

      {/* ---------- Obelisks ---------- */}
      {obelisks.map((o, i) => (
        <G key={`obelisk-${i}`} opacity={0.7}>
          <Polygon
            points={`${o.x - 3.5},${o.y} ${o.x + 3.5},${o.y} ${o.x + 3.5},${o.y - o.height + 7} ${o.x},${o.y - o.height} ${o.x - 3.5},${o.y - o.height + 7}`}
            fill="#3D2817"
          />
          {/* Carved bands */}
          <Rect x={o.x - 3.5} y={o.y - o.height + 14} width={7} height={2} fill="#2B1B10" />
          <Rect x={o.x - 3.5} y={o.y - o.height * 0.5} width={7} height={1.5} fill="#2B1B10" />
          {/* Sand pile at the base */}
          <Ellipse cx={o.x} cy={o.y + 1} rx={10} ry={3} fill="#7F5539" opacity={0.5} />
        </G>
      ))}

      {/* ---------- Cacti ---------- */}
      {cacti.map((c, i) => {
        if (c.kind === 'saguaro') {
          return (
            <G key={`cactus-${i}`} opacity={0.65}>
              <Rect
                x={c.x - c.size * 0.13}
                y={c.y - c.size}
                width={c.size * 0.26}
                height={c.size}
                rx={c.size * 0.12}
                fill="#2D5A3D"
              />
              {/* Ridges on the trunk */}
              <Rect x={c.x - c.size * 0.05} y={c.y - c.size} width={c.size * 0.02} height={c.size} fill="#1B4332" />
              {/* Arms */}
              <Path
                d={`M ${c.x - c.size * 0.13} ${c.y - c.size * 0.55} L ${c.x - c.size * 0.48} ${c.y - c.size * 0.55} L ${c.x - c.size * 0.48} ${c.y - c.size * 0.85}`}
                stroke="#2D5A3D"
                strokeWidth={c.size * 0.18}
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d={`M ${c.x + c.size * 0.13} ${c.y - c.size * 0.7} L ${c.x + c.size * 0.42} ${c.y - c.size * 0.7} L ${c.x + c.size * 0.42} ${c.y - c.size * 0.95}`}
                stroke="#2D5A3D"
                strokeWidth={c.size * 0.18}
                strokeLinecap="round"
                fill="none"
              />
              {/* Tiny flower on top */}
              <SvgCircle cx={c.x} cy={c.y - c.size - 2} r={1.8} fill="#FFC8DD" opacity={0.8} />
            </G>
          );
        }
        // Barrel cactus
        return (
          <G key={`cactus-${i}`} opacity={0.65}>
            <Ellipse cx={c.x} cy={c.y - c.size * 0.35} rx={c.size * 0.3} ry={c.size * 0.45} fill="#2D5A3D" />
            {/* Vertical ridges */}
            {[-0.5, 0, 0.5].map((m, mi) => (
              <Path
                key={mi}
                d={`M ${c.x + c.size * 0.1 * m} ${c.y - c.size * 0.7} Q ${c.x + c.size * 0.12 * m} ${c.y - c.size * 0.35} ${c.x + c.size * 0.1 * m} ${c.y - 0.05}`}
                stroke="#1B4332"
                strokeWidth={0.8}
                fill="none"
              />
            ))}
            <SvgCircle cx={c.x} cy={c.y - c.size * 0.8} r={1.2} fill="#FFE8A3" opacity={0.85} />
          </G>
        );
      })}

      {/* ---------- Foreground dune (deepest) ---------- */}
      <Path
        d={`M 0 ${h * 0.88} Q ${w * 0.28} ${h * 0.83} ${w * 0.52} ${h * 0.89} T ${w * 0.88} ${h * 0.88} T ${w} ${h * 0.9} L ${w} ${h} L 0 ${h} Z`}
        fill="#4A2A18"
        opacity={0.75}
      />

      {/* ---------- Sand ripple arcs ---------- */}
      {ripples.map((yRatio, i) => (
        <Path
          key={`ripple-${i}`}
          d={`M 0 ${h * yRatio} Q ${w * 0.3} ${h * (yRatio - 0.005)} ${w * 0.6} ${h * yRatio} T ${w} ${h * yRatio}`}
          stroke="#3D2817"
          strokeWidth={0.8}
          fill="none"
          opacity={0.5 - i * 0.08}
        />
      ))}

      {/* ---------- Dune grass tufts ---------- */}
      {grassTufts.map((g, i) => (
        <G key={`grass-${i}`} opacity={0.55}>
          {[-3, -1, 1, 3].map((dx, gi) => (
            <Path
              key={gi}
              d={`M ${g.x + dx} ${g.y + 2} L ${g.x + dx + (dx > 0 ? 1 : -1)} ${g.y - 7}`}
              stroke="#8B7355"
              strokeWidth={0.9}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </G>
      ))}

      {/* ---------- Bleached bones ---------- */}
      {bones.map((b, i) => {
        if (b.kind === 'skull') {
          return (
            <G key={`bone-${i}`} opacity={0.7}>
              <Ellipse cx={b.x} cy={b.y} rx={6} ry={5} fill="#F5E6D3" />
              {/* Eye sockets */}
              <Ellipse cx={b.x - 2} cy={b.y - 1} rx={1.2} ry={1.4} fill="#3D2817" />
              <Ellipse cx={b.x + 2} cy={b.y - 1} rx={1.2} ry={1.4} fill="#3D2817" />
              {/* Horns */}
              <Path d={`M ${b.x - 5} ${b.y - 2} Q ${b.x - 9} ${b.y - 5} ${b.x - 10} ${b.y - 1}`} stroke="#F5E6D3" strokeWidth={1.5} fill="none" strokeLinecap="round" />
              <Path d={`M ${b.x + 5} ${b.y - 2} Q ${b.x + 9} ${b.y - 5} ${b.x + 10} ${b.y - 1}`} stroke="#F5E6D3" strokeWidth={1.5} fill="none" strokeLinecap="round" />
            </G>
          );
        }
        // Rib cage
        return (
          <G key={`bone-${i}`} opacity={0.6}>
            <Path d={`M ${b.x - 10} ${b.y} L ${b.x + 10} ${b.y}`} stroke="#F5E6D3" strokeWidth={1.5} strokeLinecap="round" />
            {[-8, -4, 0, 4, 8].map((dx, bi) => (
              <Path key={bi} d={`M ${b.x + dx} ${b.y} Q ${b.x + dx - 2} ${b.y + 4} ${b.x + dx - 1} ${b.y + 6}`} stroke="#F5E6D3" strokeWidth={1.2} fill="none" strokeLinecap="round" />
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
        <LinearGradient id="depth-floor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#023E8A" stopOpacity={0} />
          <Stop offset="1" stopColor="#001A33" stopOpacity={0.75} />
        </LinearGradient>
        <RadialGradient id="jelly-body" cx="50%" cy="40%" r="60%">
          <Stop offset="0" stopColor="#CAF0F8" stopOpacity={0.75} />
          <Stop offset="1" stopColor="#48CAE4" stopOpacity={0.25} />
        </RadialGradient>
      </Defs>

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
