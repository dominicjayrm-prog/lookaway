/**
 * Generate gameplay data for side campaign levels based on level_data parameters.
 * Each mode's generator takes the level's stored params and produces
 * the same modeData format that the mode components expect.
 */

const SHAPE_TYPES = ['circle', 'square', 'triangle', 'star', 'diamond', 'hexagon', 'heart', 'pentagon', 'oval', 'cross', 'arrow', 'semicircle', 'parallelogram', 'trapezoid', 'rhombus', 'kite'];
const ALL_COLORS = [
  { hex: '#FF6B6B', name: 'red' },
  { hex: '#0984E3', name: 'blue' },
  { hex: '#00B894', name: 'green' },
  { hex: '#D4A012', name: 'gold' },
  { hex: '#6C5CE7', name: 'purple' },
  { hex: '#FD79A8', name: 'pink' },
  { hex: '#E17055', name: 'orange' },
  { hex: '#00CEC9', name: 'teal' },
  { hex: '#636E72', name: 'grey' },
  { hex: '#F9A825', name: 'yellow' },
  { hex: '#B8860B', name: 'dark gold' },
  { hex: '#8E44AD', name: 'deep purple' },
  { hex: '#2ECC71', name: 'lime' },
  { hex: '#E84393', name: 'hot pink' },
  { hex: '#1ABC9C', name: 'turquoise' },
  { hex: '#F39C12', name: 'amber' },
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function placeShapes(count: number, shapePool: string[], colorPool: { hex: string; name: string }[], minDist = 18) {
  const shapes: { type: string; color: string; colorName: string; x: number; y: number; size: number }[] = [];
  for (let i = 0; i < count; i++) {
    let x, y, valid, attempts = 0;
    do {
      x = 12 + Math.random() * 76;
      y = 12 + Math.random() * 76;
      valid = shapes.every(s => Math.sqrt((s.x - x) ** 2 + (s.y - y) ** 2) > minDist);
      attempts++;
    } while (!valid && attempts < 50);
    const c = colorPool[i % colorPool.length];
    shapes.push({
      type: shapePool[i % shapePool.length],
      color: c.hex,
      colorName: c.name,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      size: 42 + Math.floor(Math.random() * 8),
    });
  }
  return shapes;
}

function resolveColorPool(hexes: string[]): { hex: string; name: string }[] {
  return hexes.map(h => ALL_COLORS.find(c => c.hex === h) ?? { hex: h, name: 'unknown' });
}

// ─── SPEED RECALL ───
export function generateSpeedRecallLevel(levelData: any, roundCount = 1) {
  const { shapeCount = 5, viewingTime = 3, shapePool = ['circle', 'square', 'triangle'], colorPool = ['#FF6B6B', '#0984E3', '#00B894'], minDistance = 20 } = levelData;
  const colors = resolveColorPool(colorPool);
  const rounds = Array.from({ length: roundCount }, () => ({
    shapes: placeShapes(shapeCount, shapePool, colors, minDistance),
    viewingTime,
  }));
  return { rounds, viewingTime };
}

// ─── SNAP MATCH ───
export function generateSnapMatchLevel(levelData: any) {
  const { shapeCount = 4, viewTime = 2.5, shapePool = ['circle', 'square', 'triangle'], colorPool = ['#FF6B6B', '#0984E3', '#00B894'], changeTypes = ['colour', 'position', 'added', 'removed', 'type'] } = levelData;
  const colors = resolveColorPool(colorPool);
  const rounds = changeTypes.map((changeType: string, r: number) => {
    const count = shapeCount + (r >= 3 ? 1 : 0);
    const sceneA = placeShapes(count, shapePool, colors);
    let sceneB = JSON.parse(JSON.stringify(sceneA));
    let targetIndex = Math.floor(Math.random() * sceneA.length);
    let description = '';
    let removedShape: any = null;

    switch (changeType) {
      case 'colour': {
        const oldC = sceneB[targetIndex].color;
        const newC = colorPool.find((c: string) => c !== oldC) ?? '#E17055';
        sceneB[targetIndex].color = newC;
        description = `${sceneA[targetIndex].type} changed colour`;
        break;
      }
      case 'position': {
        let nx, ny, valid;
        do { nx = 12 + Math.random() * 76; ny = 12 + Math.random() * 76; valid = sceneB.every((s: any, i: number) => i === targetIndex || Math.sqrt((s.x - nx) ** 2 + (s.y - ny) ** 2) > 18); } while (!valid);
        sceneB[targetIndex].x = Math.round(nx * 10) / 10;
        sceneB[targetIndex].y = Math.round(ny * 10) / 10;
        description = `${sceneA[targetIndex].type} moved`;
        break;
      }
      case 'added': {
        const extra = placeShapes(1, shapePool, colors, 16)[0];
        sceneB.push(extra);
        targetIndex = sceneB.length - 1;
        description = `${extra.type} was added`;
        break;
      }
      case 'removed': {
        removedShape = sceneA[targetIndex];
        sceneB = sceneA.filter((_: any, i: number) => i !== targetIndex);
        description = `${sceneA[targetIndex].type} was removed`;
        break;
      }
      case 'type': {
        const oldT = sceneB[targetIndex].type;
        const newT = shapePool.find((t: string) => t !== oldT) ?? 'star';
        sceneB[targetIndex].type = newT;
        description = `${oldT} became ${newT}`;
        break;
      }
    }
    return { sceneA, sceneB, changeType, targetIndex, description, removedShape, viewTime };
  });
  return { rounds, viewTime };
}

// ─── SEQUENCE ───
export function generateSequenceLevel(levelData: any) {
  const { sequenceLength = 5, displayTime = 1.0, shapePool = ['circle', 'square', 'triangle', 'star', 'diamond'], colorPool = ['#FF6B6B', '#0984E3', '#00B894', '#6C5CE7', '#D4A012'] } = levelData;
  const colors = resolveColorPool(colorPool);
  // Generate a single round with the specified sequence length (campaign levels = 1 round per level)
  const rounds = Array.from({ length: 1 }, () => {
    const shapes: any[] = [];
    for (let i = 0; i < sequenceLength; i++) {
      let x, y, valid, attempts = 0;
      do {
        x = 12 + Math.random() * 76;
        y = 12 + Math.random() * 76;
        valid = shapes.every((s: any) => Math.sqrt((s.x - x) ** 2 + (s.y - y) ** 2) > 16);
        attempts++;
      } while (!valid && attempts < 50);
      const c = colors[i % colors.length];
      shapes.push({
        type: shapePool[i % shapePool.length],
        color: c.hex,
        colorName: c.name,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        size: 30 + Math.floor(Math.random() * 8),
        order: i + 1,
      });
    }
    return { shapes, displayTime };
  });
  return { rounds, displayTime };
}

// ─── COUNTING BLITZ ───
export function generateCountingBlitzLevel(levelData: any) {
  const { chaosDuration = 5, colorCount = 3, shapeCount = 6, colorPool = ['#FF6B6B', '#0984E3', '#00B894'], shapePool = ['circle', 'square', 'triangle'], popInterval = 0.5 } = levelData;
  const colors = resolveColorPool(colorPool).slice(0, colorCount);

  // Generate a single round (campaign = 1 round per level)
  const rounds = Array.from({ length: 1 }, () => {
    const events: any[] = [];
    let t = 0.2, id = 0;
    while (t < chaosDuration) {
      const ci = Math.floor(Math.random() * colors.length);
      events.push({
        id: `e${id++}`,
        appearAt: Math.round(t * 100) / 100,
        duration: 0.8 + Math.random() * 0.4,
        color: colors[ci].hex,
        colorName: colors[ci].name,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        size: 22 + Math.random() * 14,
        shapeType: shapePool[Math.floor(Math.random() * shapePool.length)],
      });
      t += popInterval + Math.random() * 0.08;
    }
    const counts: Record<string, number> = {};
    colors.forEach(c => counts[c.name] = 0);
    events.forEach(e => counts[e.colorName]++);
    const askColor = colors[Math.floor(Math.random() * colors.length)];
    const correct = counts[askColor.name];
    const opts = new Set([correct]);
    let iterations = 0;
    while (opts.size < 4 && iterations < 100) {
      const o = correct + Math.floor(Math.random() * 5) - 2;
      if (o > 0) opts.add(o);
      iterations++;
    }
    while (opts.size < 4) opts.add(correct + opts.size);
    const options = Array.from(opts).sort((a, b) => a - b);
    return { events, askColor, correctCount: correct, options, correctIndex: options.indexOf(correct), chaosDuration };
  });
  return { rounds, chaosDuration };
}

// ─── COLOUR CHAIN ───
export function generateColourChainLevel(levelData: any) {
  const { gridCols = 3, gridRows = 4, viewTime = 3, colorCount = 5, recallRounds = 6, colorPool = ['#FF6B6B', '#0984E3', '#00B894', '#6C5CE7', '#D4A012'] } = levelData;
  const totalTiles = gridCols * gridRows;
  const availableColors = resolveColorPool(colorPool).slice(0, colorCount);

  // Fill grid with colors (some will repeat)
  const gridColors: { hex: string; name: string }[] = [];
  for (let i = 0; i < totalTiles; i++) {
    gridColors.push(availableColors[i % availableColors.length]);
  }
  // Shuffle
  gridColors.sort(() => Math.random() - 0.5);

  const grid = gridColors.map((c, i) => ({ ...c, gridIndex: i }));

  // Pick colors to ask about (ones that appear in the grid)
  const askColors = pickRandom(availableColors, Math.min(recallRounds, availableColors.length));
  // If we need more rounds than unique colors, repeat
  while (askColors.length < recallRounds) {
    askColors.push(availableColors[askColors.length % availableColors.length]);
  }

  const rounds = askColors.slice(0, recallRounds).map(color => ({
    askColor: color,
    correctIndices: grid.map((t, i) => t.hex === color.hex ? i : -1).filter(i => i !== -1),
  }));

  return { grid, rounds, gridCols, gridRows, viewTime };
}

/** Master dispatcher — generate modeData from level_data for any mode */
export function generateSideCampaignData(mode: string, levelData: any) {
  switch (mode) {
    case 'speed_recall': return generateSpeedRecallLevel(levelData, 1);
    case 'snap_match': return generateSnapMatchLevel(levelData);
    case 'sequence': return generateSequenceLevel(levelData);
    case 'counting_blitz': return generateCountingBlitzLevel(levelData);
    case 'colour_chain': return generateColourChainLevel(levelData);
    default: throw new Error(`Unknown side campaign mode: ${mode}`);
  }
}
