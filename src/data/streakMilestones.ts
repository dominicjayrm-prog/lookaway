export const STREAK_MILESTONES = [
  { days: 3,   gems: 5,    title: 'Getting Started',   color: '#FF9500' },
  { days: 7,   gems: 15,   title: 'One Week Strong',   color: '#6C5CE7' },
  { days: 14,  gems: 30,   title: 'Two Week Warrior',  color: '#0984E3' },
  { days: 30,  gems: 50,   title: 'Monthly Master',    color: '#D4A012' },
  { days: 60,  gems: 100,  title: 'Memory Machine',    color: '#00B894' },
  { days: 100, gems: 200,  title: 'Legendary',         color: '#FF6B6B' },
];

export function checkStreakMilestone(streak: number, claimed: number[]): typeof STREAK_MILESTONES[0] | null {
  for (const m of STREAK_MILESTONES) {
    if (streak >= m.days && !claimed.includes(m.days)) return m;
  }
  return null;
}

export function getNextMilestone(streak: number): typeof STREAK_MILESTONES[0] | null {
  for (const m of STREAK_MILESTONES) {
    if (streak < m.days) return m;
  }
  return null;
}
