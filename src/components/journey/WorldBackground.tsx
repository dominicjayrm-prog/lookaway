import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  WORLD_THEMES,
  WORLD_THEME_ORDER,
  getWorldForPosition,
  type WorldTheme,
} from '@/src/data/unifiedJourney';
import { WORLD_VISUALS } from './worldVisuals';
import { localizedWorldName } from './worldI18n';
import { t } from '@/src/i18n';

/** Terrain artwork per world — portrait pastel illustrations designed
 *  for vertical tiling: scenery hugs the left/right margins, the
 *  centre corridor stays clear for the path + nodes, and the top and
 *  bottom edges fade to the world's base tone (== backgroundColor)
 *  so stacked copies read as one continuous landscape. Compressed
 *  WebP, ~100KB each. */
const TERRAIN_ART: Record<WorldTheme, ReturnType<typeof require>> = {
  emerald_grove: require('../../../assets/journey/emerald_grove.webp'),
  amber_dunes: require('../../../assets/journey/amber_dunes.webp'),
  crystal_depths: require('../../../assets/journey/crystal_depths.webp'),
  aurora_peaks: require('../../../assets/journey/aurora_peaks.webp'),
  inferno_core: require('../../../assets/journey/inferno_core.webp'),
};

/** Biome-merge artwork rendered AT each world boundary — the lower
 *  biome dissolving into the upper one (sand creeping into grass,
 *  water freezing into snow…). Keyed by the LOWER world of the pair.
 *  Each piece's bottom edge fades to the lower world's base tone and
 *  its top edge to the upper world's, so the whole 400-level canvas
 *  reads as one continuous journey with no hard cuts. */
const TRANSITION_ART: Partial<Record<WorldTheme, ReturnType<typeof require>>> = {
  emerald_grove: require('../../../assets/journey/transition_emerald_amber.webp'),
  amber_dunes: require('../../../assets/journey/transition_amber_crystal.webp'),
  crystal_depths: require('../../../assets/journey/transition_crystal_aurora.webp'),
  aurora_peaks: require('../../../assets/journey/transition_aurora_inferno.webp'),
};

/** Source aspect ratio of the terrain art (height / width). */
const TERRAIN_ASPECT = 1290 / 720;

interface Props {
  /** Total path canvas dimensions — must match the render container
   *  above the background so the fill covers the entire scrollable
   *  region. */
  width: number;
  pathTopPadding: number;
  rowHeight: number;
  totalPositions: number;
  /** Current viewport window of ladder positions ([start, end]).
   *  Decorations + gate banners are culled to it, same as the level
   *  nodes — a 34,000px canvas can't afford 400 rows of decoration
   *  views. The 5 gradient slabs render unconditionally (5 views). */
  visibleRange: readonly [number, number];
  /** Kept for API compatibility. */
  showDecorations?: boolean;
}

/** Deterministic pseudo-random in [0,1) from a couple of ints. Same
 *  position always decorates the same way — no flicker across
 *  culling-window changes, no Math.random in render. */
function hash(p: number, salt: number): number {
  const x = Math.sin(p * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface Slab {
  theme: WorldTheme;
  top: number;
  height: number;
  colors: readonly [string, string, string];
}

interface Deco {
  key: string;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
}

interface Gate {
  theme: WorldTheme;
  worldNumber: number;
  y: number;
}

/** The journey canvas: five chained pastel gradient slabs (one per
 *  world), a sparse deterministic "bokeh" decoration layer, and a
 *  gate banner at each world boundary. Replaces the flat single-
 *  colour fill — the five biomes exist in the copy (intro modal,
 *  atmospheres) and now exist under the player's feet too: the
 *  canvas slowly shifts from grove-mint at level 1 to ember-blush
 *  at level 400, and crossing into a new world is a visible moment.
 *
 *  Perf: 5 gradient views total for the slabs; decorations + gates
 *  are culled to the visible window (~30 tiny Views worst case, all
 *  pointerEvents:none, no animation, deterministic layout). */
export function WorldBackground({
  width,
  pathTopPadding,
  rowHeight,
  totalPositions,
  visibleRange,
}: Props) {
  const totalHeight = pathTopPadding + totalPositions * rowHeight + 40;

  // y of a ladder position's node centre — must match the formula the
  // screen uses to place LevelNode (higher positions sit higher up).
  const yFor = (p: number) => pathTopPadding + (totalPositions - p) * rowHeight;

  // ── Gradient slabs (5 views, always rendered) ──
  const slabs = useMemo<Slab[]>(() => {
    // Screen order = reverse ladder order (inferno at top).
    return [...WORLD_THEME_ORDER].reverse().map((theme) => {
      const [a, b] = WORLD_THEMES[theme].range;
      // Boundary between world ending at b and the one starting at
      // b+1 sits half a row above b's node — consecutive slabs tile
      // exactly (next slab's bottom == this slab's top).
      const top = b >= totalPositions ? 0 : yFor(b) - rowHeight * 0.5;
      const bottom = a <= 1 ? totalHeight : yFor(a) + rowHeight * 0.5;
      return {
        theme,
        top,
        height: bottom - top,
        colors: WORLD_VISUALS[theme].gradientColors,
      };
    });
  }, [totalPositions, totalHeight, rowHeight, pathTopPadding]);

  // ── Terrain tiles + biome transitions, culled to the viewport ──
  // The art layer sits ABOVE the gradient slabs (which stay as the
  // instant-paint fallback while bitmaps decode, and as the web-safe
  // base) and BELOW the bokeh/gates. Memory discipline: a mounted RN
  // Image keeps its decoded bitmap alive, so with ~46 tiles covering
  // the 34,000px canvas we only mount the 3-6 that intersect the
  // viewport window — same culling contract as the level nodes.
  const tileH = width * TERRAIN_ASPECT;
  const { tiles, transitions } = useMemo(() => {
    const [start, end] = visibleRange;
    // Visible y window (positions are inverted: higher pos = lower y).
    const yMin = yFor(Math.min(totalPositions, end)) - rowHeight * 2;
    const yMax = yFor(Math.max(1, start)) + rowHeight * 2;

    interface Tile { key: string; theme: WorldTheme; spanTop: number; spanH: number; y: number; mirrored: boolean }
    interface Transition { key: string; lowerTheme: WorldTheme; top: number }
    const ts: Tile[] = [];
    const trs: Transition[] = [];

    for (const theme of WORLD_THEME_ORDER) {
      const [a, b] = WORLD_THEMES[theme].range;
      const slabTop = b >= totalPositions ? 0 : yFor(b) - rowHeight * 0.5;
      const slabBottom = a <= 1 ? totalHeight : yFor(a) + rowHeight * 0.5;
      // The transition artwork occupies one tile-height centred on
      // each boundary; the world's own tiles fill the remaining span.
      const spanTop = b >= totalPositions ? slabTop : slabTop + tileH / 2;
      const spanBottom = a <= 1 ? slabBottom : slabBottom - tileH / 2;

      if (a > 1) {
        // Boundary between this world and the one BELOW it (lower
        // positions). The transition art is keyed by the lower world.
        const lower = getWorldForPosition(a - 1);
        const tTop = slabBottom - tileH / 2;
        if (TRANSITION_ART[lower] && tTop <= yMax && tTop + tileH >= yMin) {
          trs.push({ key: `tr-${lower}`, lowerTheme: lower, top: tTop });
        }
      }

      const spanH = spanBottom - spanTop;
      const count = Math.ceil(spanH / tileH);
      for (let k = 0; k < count; k++) {
        const y = spanTop + k * tileH;
        if (y > yMax || y + tileH < yMin) continue;
        ts.push({
          key: `tile-${theme}-${k}`,
          theme,
          spanTop,
          spanH,
          y,
          // Mirror alternate tiles so the repeat doesn't read as a
          // photocopy — the art is edge-decorated, so a horizontal
          // flip gives a "different" stretch of the same biome.
          mirrored: k % 2 === 1,
        });
      }
    }
    return { tiles: ts, transitions: trs };
  }, [visibleRange, width, tileH, totalPositions, totalHeight, rowHeight, pathTopPadding]);

  // ── Decorations + world gates, culled to the viewport window ──
  const { decos, gates } = useMemo(() => {
    const [start, end] = visibleRange;
    const ds: Deco[] = [];
    const gs: Gate[] = [];
    for (let p = Math.max(1, start); p <= Math.min(totalPositions, end); p++) {
      const theme = getWorldForPosition(p);
      const visuals = WORLD_VISUALS[theme];
      // Small soft "bokeh" dot roughly every 3rd row, offset off the
      // path's snake area toward the margins so they never sit under
      // a node. Alternate margins by parity for balance.
      if (p % 3 === 0) {
        const h1 = hash(p, 1);
        const h2 = hash(p, 2);
        const leftSide = p % 6 === 0;
        const margin = 10 + h1 * 34;
        ds.push({
          key: `dot-${p}`,
          x: leftSide ? margin : width - margin - 16,
          y: yFor(p) + (h2 - 0.5) * rowHeight,
          size: 5 + h1 * 11,
          color: '#FFFFFF',
          opacity: 0.22 + h2 * 0.16,
        });
      }
      // Large very-soft theme-tinted blob every ~12 rows — gives each
      // biome an ambient wash of its own colour without any imagery.
      if (p % 12 === 4) {
        const h1 = hash(p, 3);
        ds.push({
          key: `blob-${p}`,
          x: (h1 > 0.5 ? width * 0.55 : -30) + hash(p, 4) * width * 0.3,
          y: yFor(p) - rowHeight * 0.5,
          size: 90 + h1 * 70,
          color: visuals.decoColor,
          opacity: 0.05,
        });
      }
      // World gate banner at each biome's first position (except
      // world 1 — the journey starts there, no gate needed).
      const meta = WORLD_THEMES[theme];
      if (p === meta.range[0] && meta.worldNumber > 1) {
        gs.push({ theme, worldNumber: meta.worldNumber, y: yFor(p) + rowHeight * 0.5 });
      }
    }
    return { decos: ds, gates: gs };
  }, [visibleRange, width, totalPositions, rowHeight, pathTopPadding]);

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, width, height: totalHeight }}
      pointerEvents="none"
    >
      {slabs.map((s) => (
        <LinearGradient
          key={s.theme}
          colors={[...s.colors]}
          style={{ position: 'absolute', top: s.top, left: 0, width, height: s.height }}
        />
      ))}
      {/* Terrain tiles — each wrapped in an overflow-hidden window so
          the final partial tile of a world clips at the span edge
          instead of bleeding into the transition artwork. */}
      {tiles.map((tile) => (
        <View
          key={tile.key}
          style={{
            position: 'absolute',
            top: Math.max(tile.y, tile.spanTop),
            left: 0,
            width,
            height: Math.min(tile.y + tileH, tile.spanTop + tile.spanH) - Math.max(tile.y, tile.spanTop),
            overflow: 'hidden',
          }}
        >
          <Image
            source={TERRAIN_ART[tile.theme]}
            style={{
              position: 'absolute',
              top: tile.y - Math.max(tile.y, tile.spanTop),
              left: 0,
              width,
              height: tileH,
              transform: tile.mirrored ? [{ scaleX: -1 }] : undefined,
            }}
            resizeMode="stretch"
            fadeDuration={0}
          />
        </View>
      ))}
      {/* Biome-merge pieces at each world boundary. */}
      {transitions.map((tr) => (
        <Image
          key={tr.key}
          source={TRANSITION_ART[tr.lowerTheme]}
          style={{ position: 'absolute', top: tr.top, left: 0, width, height: tileH }}
          resizeMode="stretch"
          fadeDuration={0}
        />
      ))}
      {decos.map((d) => (
        <View
          key={d.key}
          style={{
            position: 'absolute',
            left: d.x,
            top: d.y,
            width: d.size,
            height: d.size,
            borderRadius: d.size / 2,
            backgroundColor: d.color,
            opacity: d.opacity,
          }}
        />
      ))}
      {gates.map((g) => (
        <View key={`gate-${g.theme}`} style={[st.gateWrap, { top: g.y - 16, width }]}>
          <View style={st.gateLine} />
          <View style={[st.gatePill, { borderColor: WORLD_VISUALS[g.theme].decoColor + '55' }]}>
            <Text style={[st.gateWorld, { color: WORLD_VISUALS[g.theme].decoColor }]}>
              {t('journey.gate_world_label', { number: g.worldNumber })}
            </Text>
            <Text style={st.gateName} numberOfLines={1}>
              {localizedWorldName(g.theme)}
            </Text>
          </View>
          <View style={st.gateLine} />
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  gateWrap: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    gap: 10,
  },
  gateLine: {
    flex: 1,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  gatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gateWorld: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  gateName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A18',
    maxWidth: 160,
  },
});
