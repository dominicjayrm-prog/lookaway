export const colors = {
  // Backgrounds
  bg: '#F7F6F3',
  card: '#FFFFFF',
  surface: '#EDEBE6',

  // Primary accent
  accent: '#6C5CE7',
  accentSoft: 'rgba(108, 92, 231, 0.08)',
  accentMid: 'rgba(108, 92, 231, 0.15)',

  // Semantic colours
  correct: '#00B894',
  correctSoft: 'rgba(0, 184, 148, 0.08)',
  wrong: '#FF6B6B',
  wrongSoft: 'rgba(255, 107, 107, 0.08)',
  gold: '#D4A012',
  goldSoft: 'rgba(212, 160, 18, 0.1)',
  blue: '#0984E3',
  blueSoft: 'rgba(9, 132, 227, 0.08)',

  // Text
  text: '#1A1A18',
  textMid: '#636E72',
  textLight: '#B2BEC3',

  // Borders & dividers
  border: 'rgba(0, 0, 0, 0.06)',
  borderStrong: 'rgba(0, 0, 0, 0.12)',

  // Dark mode (future)
  darkBg: '#1A1A2E',
  darkCard: '#16213E',
  darkSurface: '#0F3460',
  darkText: '#F8F8F2',
  darkTextMid: '#A8A8B3',
} as const;

export type ColorKey = keyof typeof colors;
