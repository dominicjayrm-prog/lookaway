import type { Config } from 'tailwindcss';

/**
 * Tailwind theme extended with the BLANKED brand palette so the admin
 * panel feels like a natural extension of the main app.
 *
 * Colors mirror src/theme/colors.ts in the main app:
 *   - accent (purple) is the primary action / highlight
 *   - gold is reserved for star / legendary / premium signals
 *   - coral signals negative metrics, green positive
 *   - the warm off-white bg + pure-white card surface match the app
 *
 * Usage examples:
 *   bg-brand-accent, text-brand-gold, border-brand-card,
 *   shadow-brand-card (subtle card shadow preset), rounded-brand (20px)
 */
const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          accent: '#6C5CE7',
          accentLight: '#A29BFE',
          accentSoft: 'rgba(108, 92, 231, 0.08)',
          bg: '#F7F6F3',
          card: '#FFFFFF',
          surface: '#EDEBE6',
          text: '#1A1A18',
          textMid: '#636E72',
          textLight: '#B2BEC3',
          border: 'rgba(0, 0, 0, 0.06)',
          gold: '#D4A012',
          goldSoft: 'rgba(212, 160, 18, 0.1)',
          green: '#00B894',
          greenSoft: 'rgba(0, 184, 148, 0.08)',
          coral: '#FF6B6B',
          coralSoft: 'rgba(255, 107, 107, 0.08)',
          blue: '#0984E3',
          blueSoft: 'rgba(9, 132, 227, 0.08)',
        },
      },
      borderRadius: {
        brand: '20px',
      },
      boxShadow: {
        // Match the main app's card shadow preset
        'brand-card': '0 2px 10px rgba(0, 0, 0, 0.04)',
        'brand-card-hover': '0 4px 16px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
