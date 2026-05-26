import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Appearance, AppState, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import { LIGHT, DARK, type ThemeColors, type ThemeMode } from '../constants/theme';

const STORAGE_KEY = '@dp_theme_mode';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
  isDark: boolean;
  fontsLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [system, setSystem] = useState<ColorSchemeName>(() => Appearance.getColorScheme());
  const [mode, setModeState] = useState<ThemeMode>('automatic');

  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

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
    () => ({ mode, setMode, colors, isDark: effective === 'dark', fontsLoaded }),
    [mode, setMode, colors, effective, fontsLoaded]
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
