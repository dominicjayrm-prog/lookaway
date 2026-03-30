export interface WorldConfig {
  id: number;
  name: string;
  color: string;
  levelRange: [number, number];
  allowedCategories: string[];
  viewingTimeRange: [number, number];
  objectCountRange: [number, number];
  questionTypes: string[];
  description: string;
}

export const WORLDS: WorldConfig[] = [
  {
    id: 1, name: 'Shape Basics', color: '#00B894',
    levelRange: [1, 35],
    allowedCategories: ['basic'],
    viewingTimeRange: [5.0, 4.5],
    objectCountRange: [4, 7],
    questionTypes: ['count', 'color', 'position', 'comparison', 'presence'],
    description: 'Basic shapes only. Teach fundamentals of memorisation.',
  },
  {
    id: 2, name: 'Colour & Position', color: '#0984E3',
    levelRange: [36, 70],
    allowedCategories: ['basic'],
    viewingTimeRange: [4.5, 4.0],
    objectCountRange: [5, 8],
    questionTypes: ['count', 'color', 'position', 'comparison', 'presence'],
    description: 'More shapes, similar colour shades, spatial relationships.',
  },
  {
    id: 3, name: 'Numbers & Letters', color: '#6C5CE7',
    levelRange: [71, 105],
    allowedCategories: ['basic', 'numbers', 'letters'],
    viewingTimeRange: [4.0, 3.5],
    objectCountRange: [5, 8],
    questionTypes: ['count', 'color', 'position', 'comparison', 'presence'],
    description: 'Shapes with numbers and letters. Remember shape AND content.',
  },
  {
    id: 4, name: 'Moving Objects', color: '#F9A825',
    levelRange: [106, 140],
    allowedCategories: ['basic', 'numbers', 'letters'],
    viewingTimeRange: [4.0, 3.5],
    objectCountRange: [5, 7],
    questionTypes: ['count', 'color', 'position', 'comparison', 'presence'],
    description: 'Objects shift position during viewing. Track change over time.',
  },
  {
    id: 5, name: 'Photographic', color: '#FF6B6B',
    levelRange: [36 + 35 + 35 + 35, 175],
    allowedCategories: ['basic', 'everyday', 'animals', 'food'],
    viewingTimeRange: [3.5, 3.0],
    objectCountRange: [6, 9],
    questionTypes: ['count', 'color', 'position', 'comparison', 'presence'],
    description: 'Real-world objects — animals, food, everyday items.',
  },
  {
    id: 6, name: 'Mastermind', color: '#1A1A18',
    levelRange: [176, 200],
    allowedCategories: ['basic', 'numbers', 'letters', 'everyday', 'animals', 'food', 'patterns'],
    viewingTimeRange: [3.0, 2.5],
    objectCountRange: [7, 10],
    questionTypes: ['count', 'color', 'position', 'comparison', 'presence'],
    description: 'Everything combined. Ultimate challenge.',
  },
];

// Fix World 5 range
WORLDS[4].levelRange = [141, 175];

export const LEVELS_PER_WORLD = 35;
export const TOTAL_LEVELS = 200;
// Exception: W6 has 25 levels
export function levelsInWorld(worldId: number): number {
  return worldId === 6 ? 25 : 35;
}

export function getWorldForLevel(levelNumber: number): WorldConfig | undefined {
  return WORLDS.find(w => levelNumber >= w.levelRange[0] && levelNumber <= w.levelRange[1]);
}

export function getWorldConfig(worldId: number, levelInWorld: number) {
  const world = WORLDS[worldId - 1];
  if (!world) return null;
  const total = levelsInWorld(worldId);
  const progress = levelInWorld / total; // 0-1

  // Interpolate viewing time: starts at range[0], ends at range[1]
  const viewTime = Math.round((world.viewingTimeRange[0] + (world.viewingTimeRange[1] - world.viewingTimeRange[0]) * progress) * 10) / 10;

  // Interpolate object count
  const objCount = Math.round(world.objectCountRange[0] + (world.objectCountRange[1] - world.objectCountRange[0]) * progress);

  return {
    ...world,
    viewTime,
    suggestedObjectCount: objCount,
  };
}

export interface CampaignLevel {
  id: string;
  world_id: number;
  level_number: number;
  title: string;
  view_time: number;
  difficulty: string;
  scene_data: {
    objects: any[];
    questions: any[];
  };
  status: string;
  created_at: string;
  updated_at: string;
}

export const TITLE_TEMPLATES: Record<string, string[]> = {
  count: ['Counting Challenge', 'Number Crunch', 'How Many?', 'Tally Up', 'Count Down', 'Sum It Up'],
  color: ['Colour Burst', 'Rainbow Recall', 'Shade Shift', 'Colour Code', 'Hue Hunt', 'Colour Match'],
  position: ['Corner Check', 'Position Puzzle', 'Spatial Scan', 'Where Was It?', 'Grid Guide', 'Spot Check'],
  many_objects: ['Crowded Scene', 'Busy Board', 'Full House', 'Object Overload', 'Packed In', 'Memory Load'],
  fast: ['Quick Glimpse', 'Speed Scan', 'Blink Test', 'Flash Memory', 'Rapid Recall', 'Fast Focus'],
  mixed: ['Memory Mix', 'Brain Teaser', 'Mind Map', 'Recall Rush', 'Puzzle Box', 'Think Fast'],
};

export function generateLevelTitle(worldId: number, _objCount: number, viewTime: number): string {
  let pool: string[];
  if (viewTime <= 3.0) pool = TITLE_TEMPLATES.fast;
  else if (worldId <= 2) pool = TITLE_TEMPLATES.color;
  else pool = TITLE_TEMPLATES.mixed;
  return pool[Math.floor(Math.random() * pool.length)];
}
