import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Appearance, AppState, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT, DARK, type ThemeColors, type ThemeMode } from '../constants/theme';

const STORAGE_KEY = '@dp_theme_mode';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [system, setSystem] = useState<ColorSchemeName>(() => Appearance.getColorScheme());
  const [mode, setModeState] = useState<ThemeMode>('automatic');

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystem(colorScheme);
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setSystem(Appearance.getColorScheme());
    });
    return () => { sub.remove(); appSub.remove(); };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'automatic') {
          setModeState(v);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const effective: 'light' | 'dark' =
    mode === 'automatic' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const colors = effective === 'dark' ? DARK : LIGHT;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, setMode, colors, isDark: effective === 'dark' }),
    [mode, setMode, colors, effective]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
