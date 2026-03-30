export const lightColors = {
  bg: '#F7F6F3',
  card: '#FFFFFF',
  surface: '#EDEBE6',
  accent: '#6C5CE7',
  accentSoft: 'rgba(108, 92, 231, 0.08)',
  accentMid: 'rgba(108, 92, 231, 0.15)',
  correct: '#00B894',
  correctSoft: 'rgba(0, 184, 148, 0.08)',
  wrong: '#FF6B6B',
  wrongSoft: 'rgba(255, 107, 107, 0.08)',
  gold: '#D4A012',
  goldSoft: 'rgba(212, 160, 18, 0.1)',
  blue: '#0984E3',
  blueSoft: 'rgba(9, 132, 227, 0.08)',
  text: '#1A1A18',
  textMid: '#636E72',
  textLight: '#B2BEC3',
  border: 'rgba(0, 0, 0, 0.06)',
  borderStrong: 'rgba(0, 0, 0, 0.12)',
  tabBar: '#FFFFFF',
  tabBarBorder: 'rgba(0, 0, 0, 0.06)',
  tabBarInactive: '#B2BEC3',
} as const;

export const darkColors: typeof lightColors = {
  bg: '#1A1A2E',
  card: '#16213E',
  surface: '#0F3460',
  accent: '#7C6CF7',
  accentSoft: 'rgba(124, 108, 247, 0.12)',
  accentMid: 'rgba(124, 108, 247, 0.2)',
  correct: '#00D2A4',
  correctSoft: 'rgba(0, 210, 164, 0.12)',
  wrong: '#FF7B7B',
  wrongSoft: 'rgba(255, 123, 123, 0.12)',
  gold: '#E4B022',
  goldSoft: 'rgba(228, 176, 34, 0.12)',
  blue: '#2994F3',
  blueSoft: 'rgba(41, 148, 243, 0.12)',
  text: '#F8F8F2',
  textMid: '#A8A8B3',
  textLight: '#636E78',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.15)',
  tabBar: '#16213E',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
  tabBarInactive: '#636E78',
} as const;

export type ThemeColors = typeof lightColors;

// Default export for backwards compat (light mode)
export const colors = lightColors;
export type ColorKey = keyof typeof lightColors;
