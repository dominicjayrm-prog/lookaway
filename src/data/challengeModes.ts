export interface ChallengeMode {
  id: string;
  name: string;
  description: string;
  howItWorks: string;
  color: string;
  badge: string;
  rounds: number;
  roundLabel: string;
  estimatedTime: string;
}

export const CHALLENGE_MODES: Record<string, ChallengeMode> = {
  classic: { id: 'classic', name: 'Classic', description: '5 campaign scenes. Same questions. Highest score wins.', howItWorks: 'Both players see the same 5 scenes. Memorise, then answer 5 questions per scene. Highest total score wins.', color: '#6C5CE7', badge: 'ORIGINAL', rounds: 5, roundLabel: '5 scenes', estimatedTime: '~3 min' },
  speed_recall: { id: 'speed_recall', name: 'Speed Recall', description: 'See the scene. Tap where each shape was.', howItWorks: '5 shapes appear for 3 seconds. They disappear. Tap where each one was. Closer = more points.', color: '#FF6B6B', badge: 'EXCLUSIVE', rounds: 5, roundLabel: '5 rounds', estimatedTime: '~2 min' },
  snap_match: { id: 'snap_match', name: 'Snap Match', description: 'Two scenes flash. Spot what changed.', howItWorks: 'Two nearly identical scenes flash. One thing changed, tap it. Faster = more points.', color: '#0984E3', badge: 'EXCLUSIVE', rounds: 5, roundLabel: '5 rounds', estimatedTime: '~2 min' },
  sequence: { id: 'sequence', name: 'Sequence', description: 'Shapes flash one by one. Tap them back in order.', howItWorks: 'Shapes appear one at a time. After the sequence, tap them in the correct order.', color: '#D4A012', badge: 'EXCLUSIVE', rounds: 5, roundLabel: '5 rounds', estimatedTime: '~2 min' },
  counting_blitz: { id: 'counting_blitz', name: 'Counting Blitz', description: 'Objects pop in and out. Count each colour.', howItWorks: 'Shapes rapidly appear and disappear. Count how many of each colour appeared.', color: '#00B894', badge: 'EXCLUSIVE', rounds: 5, roundLabel: '5 rounds', estimatedTime: '~2 min' },
  colour_chain: { id: 'colour_chain', name: 'Colour Chain', description: 'Memorise a colour grid. Recall positions.', howItWorks: 'A 3×4 colour grid appears for 3 seconds. Then tap where each colour was.', color: '#FD79A8', badge: 'EXCLUSIVE', rounds: 6, roundLabel: '6 rounds', estimatedTime: '~2 min' },
};

export const MODE_ORDER = ['classic', 'speed_recall', 'snap_match', 'sequence', 'counting_blitz', 'colour_chain'];
export const EXCLUSIVE_MODES = MODE_ORDER.filter(id => id !== 'classic');

export function getMaxScore(mode: string): number {
  switch (mode) {
    case 'classic': return 100;
    case 'speed_recall': return 2500;
    case 'snap_match': return 500;
    case 'sequence': return 910;
    case 'counting_blitz': return 500;
    case 'colour_chain': return 600;
    default: return 100;
  }
}

export function getScorePercentage(mode: string, rawScore: number): number {
  if (mode === 'classic') return rawScore;
  return Math.min(100, Math.round((rawScore / getMaxScore(mode)) * 100));
}
