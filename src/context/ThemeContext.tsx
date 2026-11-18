import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'dark' | 'light' | 'system';
export type MotionPreference = 'normal' | 'reduced' | 'system';

interface ThemeContextType {
  theme: ThemePreference;
  effectiveTheme: 'dark' | 'light';
  setTheme: (theme: ThemePreference) => void;
  reducedMotion: MotionPreference;
  isReducedMotion: boolean;
  setReducedMotion: (motion: MotionPreference) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_STORAGE_KEY = 'agile_velocity_theme';
const MOTION_STORAGE_KEY = 'agile_velocity_motion';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
    return saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'dark';
  });

  const [reducedMotion, setReducedMotionState] = useState<MotionPreference>(() => {
    if (typeof window === 'undefined') return 'system';
    const saved = localStorage.getItem(MOTION_STORAGE_KEY) as MotionPreference | null;
    return saved === 'normal' || saved === 'reduced' || saved === 'system' ? saved : 'system';
  });

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  });

  const [systemReduceMotion, setSystemReduceMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  });

  // Listen to system color-scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mediaQuery.addEventListener?.('change', handler);
    return () => mediaQuery.removeEventListener?.('change', handler);
  }, []);

  // Listen to system reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setSystemReduceMotion(e.matches);
    mediaQuery.addEventListener?.('change', handler);
    return () => mediaQuery.removeEventListener?.('change', handler);
  }, []);

  const effectiveTheme: 'dark' | 'light' =
    theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  const isReducedMotion: boolean =
    reducedMotion === 'system' ? systemReduceMotion : reducedMotion === 'reduced';

  // Apply attributes to <html> root
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', effectiveTheme);
    root.setAttribute('data-reduced-motion', String(isReducedMotion));
  }, [effectiveTheme, isReducedMotion]);

  const setTheme = (nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Storage unavailable or quota exceeded
    }
  };

  const setReducedMotion = (nextMotion: MotionPreference) => {
    setReducedMotionState(nextMotion);
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, nextMotion);
    } catch {
      // Storage unavailable
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme,
        setTheme,
        reducedMotion,
        isReducedMotion,
        setReducedMotion,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
