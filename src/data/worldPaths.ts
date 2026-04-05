/**
 * Hand-crafted level node positions for each world's map.
 * x: percentage (0-100), y: pixels from top of scroll area.
 * Level 1 at bottom, last level at top.
 */

export interface PathNode {
  x: number;
  y: number;
}

const WORLD_1_PATH: PathNode[] = [
  { x: 50, y: 2050 },  // L1 — centre start
  { x: 32, y: 1960 },  // L2
  { x: 25, y: 1860 },  // L3
  { x: 38, y: 1770 },  // L4
  { x: 62, y: 1690 },  // L5 — checkpoint
  { x: 75, y: 1590 },  // L6
  { x: 70, y: 1490 },  // L7
  { x: 50, y: 1410 },  // L8
  { x: 30, y: 1320 },  // L9
  { x: 22, y: 1210 },  // L10 — halfway
  { x: 35, y: 1110 },  // L11
  { x: 58, y: 1030 },  // L12
  { x: 72, y: 940 },   // L13
  { x: 78, y: 840 },   // L14
  { x: 60, y: 750 },   // L15 — milestone
  { x: 40, y: 660 },   // L16
  { x: 28, y: 560 },   // L17
  { x: 35, y: 460 },   // L18
  { x: 55, y: 370 },   // L19
  { x: 50, y: 250 },   // L20 — finale
];

const WORLD_2_PATH: PathNode[] = Array.from({ length: 30 }, (_, i) => {
  const t = i / 29;
  const waveX = 50 + 28 * Math.sin(t * Math.PI * 3.2);
  const y = 3100 - i * 95;
  return { x: Math.round(waveX), y };
});

const WORLD_3_PATH: PathNode[] = Array.from({ length: 35 }, (_, i) => {
  const t = i / 34;
  const waveX = 50 + 30 * Math.sin(t * Math.PI * 3.5 + 0.5);
  const y = 3600 - i * 95;
  return { x: Math.round(waveX), y };
});

const WORLD_4_PATH: PathNode[] = Array.from({ length: 35 }, (_, i) => {
  const t = i / 34;
  const waveX = 50 + 26 * Math.sin(t * Math.PI * 4 + 1);
  const y = 3600 - i * 95;
  return { x: Math.round(waveX), y };
});

const WORLD_5_PATH: PathNode[] = Array.from({ length: 40 }, (_, i) => {
  const t = i / 39;
  const waveX = 50 + 28 * Math.sin(t * Math.PI * 4.5);
  const y = 4100 - i * 95;
  return { x: Math.round(waveX), y };
});

const WORLD_6_PATH: PathNode[] = Array.from({ length: 40 }, (_, i) => {
  const t = i / 39;
  const waveX = 50 + 32 * Math.sin(t * Math.PI * 5 + 0.8);
  const y = 4100 - i * 95;
  return { x: Math.round(waveX), y };
});

export const WORLD_PATHS: Record<number, PathNode[]> = {
  1: WORLD_1_PATH,
  2: WORLD_2_PATH,
  3: WORLD_3_PATH,
  4: WORLD_4_PATH,
  5: WORLD_5_PATH,
  6: WORLD_6_PATH,
};

export const WORLD_COLORS: Record<number, string> = {
  1: '#00B894',
  2: '#0984E3',
  3: '#6C5CE7',
  4: '#F9A825',
  5: '#FF6B6B',
  6: '#1A1A18',
};

export const WORLD_LIGHT_COLORS: Record<number, string> = {
  1: 'rgba(0,184,148,0.12)',
  2: 'rgba(9,132,227,0.12)',
  3: 'rgba(108,92,231,0.12)',
  4: 'rgba(249,168,37,0.12)',
  5: 'rgba(255,107,107,0.12)',
  6: 'rgba(26,26,24,0.08)',
};

export const WORLD_NAMES: Record<number, string> = {
  1: 'Shape Basics',
  2: 'Colour & Position',
  3: 'Numbers & Letters',
  4: 'Moving Objects',
  5: 'Photographic',
  6: 'Mastermind',
};

export const WORLD_LEVEL_COUNTS: Record<number, number> = {
  1: 20, 2: 30, 3: 35, 4: 35, 5: 40, 6: 40,
};

/** Map total height for a world (pixels) */
export function getMapHeight(worldId: number): number {
  const path = WORLD_PATHS[worldId];
  if (!path || path.length === 0) return 2200;
  return path[0].y + 200;
}

/** Build SVG bezier path string between two indices */
export function buildPathD(positions: PathNode[], fromIdx: number, toIdx: number, mapWidth: number): string {
  if (fromIdx >= positions.length || toIdx >= positions.length) return '';
  let d = `M ${(positions[fromIdx].x / 100) * mapWidth} ${positions[fromIdx].y}`;
  for (let i = fromIdx + 1; i <= toIdx; i++) {
    const prev = positions[i - 1];
    const cur = positions[i];
    const cpY = prev.y + (cur.y - prev.y) * 0.35;
    d += ` Q ${(prev.x / 100) * mapWidth} ${cpY}, ${(cur.x / 100) * mapWidth} ${cur.y}`;
  }
  return d;
}

/** Get checkpoint info for a level number within a world */
export function getCheckpoint(levelNum: number, totalLevels: number): string | null {
  const quarter = Math.round(totalLevels * 0.25);
  const half = Math.round(totalLevels * 0.5);
  const threeQ = Math.round(totalLevels * 0.75);
  if (levelNum === quarter) return 'WARMING UP';
  if (levelNum === half) return 'HALFWAY THERE!';
  if (levelNum === threeQ) return 'FINAL STRETCH';
  return null;
}

/** Generate a winding path for any level count (used by side campaigns) */
export function generatePath(levelCount: number, seed: number = 0): PathNode[] {
  return Array.from({ length: levelCount }, (_, i) => {
    const t = levelCount > 1 ? i / (levelCount - 1) : 0;
    const waveX = 50 + 28 * Math.sin(t * Math.PI * (2.5 + seed * 0.3) + seed * 0.7);
    const totalHeight = levelCount * 95 + 200;
    const y = totalHeight - i * 95;
    return { x: Math.round(waveX), y };
  });
}

/** Get map height for a generated path */
export function getGeneratedMapHeight(path: PathNode[]): number {
  if (path.length === 0) return 2200;
  return path[0].y + 200;
}
