export const lightColors = {
  bg: '#F7F6F3',
  card: '#FFFFFF',
  cardBorder: 'rgba(0,0,0,0.04)',
  surface: '#EDEBE6',
  inputBg: '#F7F6F3',
  accent: '#6C5CE7',
  accentLight: '#A29BFE',
  accentSoft: 'rgba(108, 92, 231, 0.08)',
  accentMid: 'rgba(108, 92, 231, 0.15)',
  accentGlow: 'rgba(108,92,231,0.15)',
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
  heartFilled: '#FF6B6B',
  heartEmpty: '#E0DDD6',
  overlayBg: 'rgba(0,0,0,0.4)',
} as const;

// Dark mode palette. Must match the exact key set of lightColors so both
// look-ups through `useTheme().colors` are type-safe, but the VALUES are
// free to differ — we use `Record<keyof ..., string>` (not
// `typeof lightColors`) so dark values aren't forced to literally equal
// the light hex strings.
export const darkColors: Record<keyof typeof lightColors, string> = {
  bg: '#0A0914',
  card: '#1B1938',
  cardBorder: 'rgba(255,255,255,0.08)',
  surface: '#242243',
  inputBg: '#1A1929',
  accent: '#6C5CE7',
  accentLight: '#A29BFE',
  accentSoft: 'rgba(108, 92, 231, 0.15)',
  accentMid: 'rgba(108, 92, 231, 0.25)',
  accentGlow: 'rgba(108,92,231,0.3)',
  correct: '#00D2A0',
  correctSoft: 'rgba(0, 210, 160, 0.12)',
  wrong: '#FF6B6B',
  wrongSoft: 'rgba(255, 107, 107, 0.12)',
  gold: '#FFCA28',
  goldSoft: 'rgba(255, 202, 40, 0.12)',
  blue: '#2994F3',
  blueSoft: 'rgba(41, 148, 243, 0.12)',
  text: '#F0EFF4',
  textMid: '#8E8BA3',
  textLight: '#4A4862',
  border: 'rgba(255, 255, 255, 0.06)',
  borderStrong: 'rgba(255, 255, 255, 0.12)',
  tabBar: '#0E0D1A',
  tabBarBorder: 'rgba(255, 255, 255, 0.06)',
  tabBarInactive: '#7A7890',
  heartFilled: '#FF6B6B',
  heartEmpty: '#2A2840',
  overlayBg: 'rgba(0,0,0,0.6)',
};

// ThemeColors is the shape consumers interact with via `useTheme().colors`.
// Using a mapped type here (rather than `typeof lightColors`) widens every
// hex literal to `string`, so downstream `<View style={{ color: colors.correct }} />`
// calls don't choke with "'#00B894' is not assignable to 'string'" errors
// once we enable stricter flags.
export type ThemeColors = { [K in keyof typeof lightColors]: string };

// Default export for backwards compat
export const colors = lightColors;
export type ColorKey = keyof typeof lightColors;
