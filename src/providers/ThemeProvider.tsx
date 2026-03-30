import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { lightColors, darkColors, type ThemeColors } from '@/src/theme/colors';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  colors: lightColors,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

function loadThemePreference(): ThemeMode {
  try {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('lookaway-theme');
    if (saved === 'dark') return 'dark';
  } catch {}
  return 'light';
}

function saveThemePreference(mode: ThemeMode) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem('lookaway-theme', mode);
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(loadThemePreference);

  const setTheme = useCallback((m: ThemeMode) => {
    setModeState(m);
    saveThemePreference(m);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      saveThemePreference(next);
      return next;
    });
  }, []);

  const themeColors = mode === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors: themeColors, isDark: mode === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
