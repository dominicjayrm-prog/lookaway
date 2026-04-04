export interface Campaign {
  id: string;
  name: string;
  description: string;
  color: string;
  unlockAfterWorld: number; // Classic world number to complete (0 = always unlocked)
  totalLevels: number;
  worldCount: number;
  worldNames: string[];
  levelsPerWorld: number[];
}

export const CAMPAIGNS: Record<string, Campaign> = {
  classic: {
    id: 'classic', name: 'Classic', description: 'Memorise the scene. Answer from memory.',
    color: '#6C5CE7', unlockAfterWorld: 0, totalLevels: 200, worldCount: 6,
    worldNames: ['Shape Basics', 'Colour & Position', 'Numbers & Letters', 'Moving Objects', 'Photographic', 'Mastermind'],
    levelsPerWorld: [20, 30, 35, 35, 40, 40],
  },
  speed_recall: {
    id: 'speed_recall', name: 'Speed Recall', description: 'Remember where everything was. Tap to place.',
    color: '#FF6B6B', unlockAfterWorld: 1, totalLevels: 45, worldCount: 3,
    worldNames: ['Foundations', 'Precision', 'Mastermind'],
    levelsPerWorld: [15, 15, 15],
  },
  snap_match: {
    id: 'snap_match', name: 'Snap Match', description: 'Two scenes. One change. Find it fast.',
    color: '#0984E3', unlockAfterWorld: 2, totalLevels: 45, worldCount: 3,
    worldNames: ['Sharp Eyes', 'Quick Scan', 'Eagle Vision'],
    levelsPerWorld: [15, 15, 15],
  },
  sequence: {
    id: 'sequence', name: 'Sequence', description: 'Shapes flash in order. Tap them back.',
    color: '#D4A012', unlockAfterWorld: 3, totalLevels: 36, worldCount: 3,
    worldNames: ['First Steps', 'Memory Lane', 'Total Recall'],
    levelsPerWorld: [12, 12, 12],
  },
  counting_blitz: {
    id: 'counting_blitz', name: 'Counting Blitz', description: 'Shapes pop in and out. Count the colours.',
    color: '#00B894', unlockAfterWorld: 4, totalLevels: 30, worldCount: 2,
    worldNames: ['Focus', 'Frenzy'],
    levelsPerWorld: [15, 15],
  },
  colour_chain: {
    id: 'colour_chain', name: 'Colour Chain', description: 'Memorise the grid. Recall each colour.',
    color: '#FD79A8', unlockAfterWorld: 5, totalLevels: 24, worldCount: 2,
    worldNames: ['Palette', 'Mosaic'],
    levelsPerWorld: [12, 12],
  },
};

export const CAMPAIGN_ORDER = ['classic', 'speed_recall', 'snap_match', 'sequence', 'counting_blitz', 'colour_chain'];

export const TOTAL_MAX_STARS = Object.values(CAMPAIGNS).reduce((sum, c) => sum + c.totalLevels * 3, 0); // 1140
