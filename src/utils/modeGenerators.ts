/** Generate shared challenge data for each exclusive mode */

const SHAPE_TYPES = ['circle', 'square', 'triangle', 'star', 'diamond'];
const SHAPE_COLORS = [
  { hex: '#FF6B6B', name: 'red' },
  { hex: '#0984E3', name: 'blue' },
  { hex: '#00B894', name: 'green' },
  { hex: '#D4A012', name: 'gold' },
  { hex: '#6C5CE7', name: 'purple' },
];

function placeShapes(count: number, minDist: number = 18) {
  const shapes: { type: string; color: string; colorName: string; x: number; y: number; size: number }[] = [];
  const colors = [...SHAPE_COLORS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, valid = false, attempts = 0;
    do {
      x = 12 + Math.random() * 76;
      y = 12 + Math.random() * 76;
      valid = shapes.every(s => Math.sqrt((s.x - x) ** 2 + (s.y - y) ** 2) > minDist);
      attempts++;
    } while (!valid && attempts < 50);
    shapes.push({
      type: SHAPE_TYPES[i % SHAPE_TYPES.length],
      color: colors[i % colors.length].hex,
      colorName: colors[i % colors.length].name,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      // Bumped from 28-37 → 48-60. Playtesters found the smaller
      // shapes hard to parse in the 3s Speed Recall / Snap Match
      // viewing window. Larger shapes also give generous hit-boxes
      // in Snap Match's scene B tap-detection since the hit radius
      // scales off the rendered size.
      size: 48 + Math.floor(Math.random() * 12),
    });
  }
  return shapes;
}

// ─── SPEED RECALL ───
export function generateSpeedRecallData() {
  const rounds = Array.from({ length: 5 }, () => ({ shapes: placeShapes(5) }));
  return { rounds };
}

// ─── SNAP MATCH ───
export function generateSnapMatchData() {
  // Shuffle the change types so rematches don't always serve them
  // in the same order (previously always colour → position → added
  // → removed → type). Each of the 5 is still guaranteed to appear
  // once — we just randomise the sequence.
  const changeTypes = (['colour', 'position', 'added', 'removed', 'type'] as const)
    .slice()
    .sort(() => Math.random() - 0.5);
  const altColors = ['#FF6B6B', '#0984E3', '#00B894', '#D4A012', '#6C5CE7', '#E17055', '#FD79A8'];
  const rounds = changeTypes.map((changeType, r) => {
    const count = r >= 3 ? 5 : 4;
    const sceneA = placeShapes(count);
    let sceneB = JSON.parse(JSON.stringify(sceneA));
    let targetIndex = Math.floor(Math.random() * sceneA.length);
    let description = '';
    let removedShape: any = null;

    switch (changeType) {
      case 'colour': {
        const oldC = sceneB[targetIndex].color;
        const newC = altColors.find(c => c !== oldC) ?? '#E17055';
        sceneB[targetIndex].color = newC;
        description = `${sceneA[targetIndex].type} changed colour`;
        break;
      }
      case 'position': {
        let nx = 0, ny = 0, valid = false;
        do { nx = 12 + Math.random() * 76; ny = 12 + Math.random() * 76; valid = sceneB.every((s: any, i: number) => i === targetIndex || Math.sqrt((s.x - nx) ** 2 + (s.y - ny) ** 2) > 18); } while (!valid);
        sceneB[targetIndex].x = Math.round(nx * 10) / 10;
        sceneB[targetIndex].y = Math.round(ny * 10) / 10;
        description = `${sceneA[targetIndex].type} moved`;
        break;
      }
      case 'added': {
        const extra = placeShapes(1, 16)[0];
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
        const newT = SHAPE_TYPES.find(t => t !== oldT) ?? 'star';
        sceneB[targetIndex].type = newT;
        description = `${oldT} became ${newT}`;
        break;
      }
    }
    return { sceneA, sceneB, changeType, targetIndex, description, removedShape };
  });
  return { rounds };
}

// ─── SEQUENCE ───
export function generateSequenceData() {
  const shapeCounts = [5, 6, 7, 7, 8];
  const types = ['circle', 'square', 'triangle', 'star', 'diamond'];
  const colors = ['#FF6B6B', '#0984E3', '#00B894', '#D4A012', '#6C5CE7', '#E17055', '#FD79A8', '#00CEC9'];
  const rounds = shapeCounts.map((count, r) => {
    const shapes: any[] = [];
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, valid = false, attempts = 0;
      do { x = 12 + Math.random() * 76; y = 12 + Math.random() * 76; valid = shapes.every((s: any) => Math.sqrt((s.x - x) ** 2 + (s.y - y) ** 2) > 16); attempts++; } while (!valid && attempts < 50);
      shapes.push({ type: types[i % types.length], color: colors[i % colors.length], x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, size: 52 + Math.floor(Math.random() * 10), order: i + 1 });
    }
    return { shapes };
  });
  return { rounds };
}

// ─── COUNTING BLITZ ───
export function generateCountingBlitzData() {
  const colors = [{ hex: '#FF6B6B', name: 'red' }, { hex: '#0984E3', name: 'blue' }, { hex: '#00B894', name: 'green' }];
  const rounds = Array.from({ length: 5 }, (_, r) => {
    const visibleTime = 1.0 - r * 0.1;
    const spawnInterval = 0.5 - r * 0.04;
    const events: any[] = [];
    let t = 0.2, id = 0;
    while (t < 5) {
      const ci = Math.floor(Math.random() * 3);
      events.push({ id: `r${r}_e${id++}`, appearAt: Math.round(t * 100) / 100, duration: visibleTime, color: colors[ci].hex, colorName: colors[ci].name, x: 10 + Math.random() * 80, y: 10 + Math.random() * 80, size: 44 + Math.random() * 14, shapeType: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)] });
      t += spawnInterval + Math.random() * 0.08;
    }
    const counts: Record<string, number> = { red: 0, blue: 0, green: 0 };
    events.forEach(e => counts[e.colorName]++);
    const askColor = colors[r % 3];
    const correct = counts[askColor.name];
    const opts = new Set([correct]);
    let iterations = 0;
    while (opts.size < 4 && iterations < 100) { const o = correct + Math.floor(Math.random() * 5) - 2; if (o > 0) opts.add(o); iterations++; }
    const options = Array.from(opts).sort((a, b) => a - b);
    return { events, askColor, correctCount: correct, options, correctIndex: options.indexOf(correct) };
  });
  return { rounds };
}

// ─── COLOUR CHAIN ───
export function generateColourChainData() {
  const allColors = [
    { hex: '#FF6B6B', name: 'Red' }, { hex: '#0984E3', name: 'Blue' }, { hex: '#00B894', name: 'Green' },
    { hex: '#D4A012', name: 'Gold' }, { hex: '#6C5CE7', name: 'Purple' }, { hex: '#00CEC9', name: 'Teal' },
    { hex: '#E17055', name: 'Orange' }, { hex: '#FD79A8', name: 'Pink' }, { hex: '#636E72', name: 'Grey' },
  ];
  const shuffled = [...allColors].sort(() => Math.random() - 0.5);
  const nine = shuffled.slice(0, 9);
  const gridColors = [...nine, { ...nine[0] }, { ...nine[1] }, { ...nine[2] }].sort(() => Math.random() - 0.5);
  const grid = gridColors.map((c, i) => ({ ...c, gridIndex: i }));
  const rounds = nine.slice(0, 6).map(color => ({
    askColor: color,
    correctIndices: grid.map((t, i) => t.hex === color.hex ? i : -1).filter(i => i !== -1),
  }));
  return { grid, rounds };
}
