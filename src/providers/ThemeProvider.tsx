import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { lightColors, darkColors, type ThemeColors } from '@/src/theme/colors';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  isManual: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  resetToSystem: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  colors: lightColors,
  isDark: false,
  isManual: false,
  toggleTheme: () => {},
  setTheme: () => {},
  resetToSystem: () => {},
});

const STORAGE_KEY = 'lookaway_theme';

function getSystemTheme(): ThemeMode {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch {}
  return 'light';
}

function loadThemePreference(): { mode: ThemeMode; isManual: boolean } {
  try {
    if (typeof window === 'undefined') return { mode: 'light', isManual: false };
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return { mode: saved, isManual: true };
  } catch {}
  return { mode: getSystemTheme(), isManual: false };
}

function saveThemePreference(mode: ThemeMode) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}
}

function clearThemePreference() {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initial = loadThemePreference();
  const [mode, setModeState] = useState<ThemeMode>(initial.mode);
  const [isManual, setIsManual] = useState(initial.isManual);

  // Listen for system theme changes (only when no manual override)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setModeState(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((m: ThemeMode) => {
    setModeState(m);
    setIsManual(true);
    saveThemePreference(m);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      setIsManual(true);
      saveThemePreference(next);
      return next;
    });
  }, []);

  const resetToSystem = useCallback(() => {
    clearThemePreference();
    setIsManual(false);
    setModeState(getSystemTheme());
  }, []);

  const themeColors = mode === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors: themeColors, isDark: mode === 'dark', isManual, toggleTheme, setTheme, resetToSystem }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
