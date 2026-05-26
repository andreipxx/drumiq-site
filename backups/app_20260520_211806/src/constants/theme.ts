// DRUMIQ v1.0.0 — Theme system
// Verdict colors fixed across themes ($/?/X universal recognizability)

export type ThemeMode = 'automatic' | 'light' | 'dark';

export interface ThemeColors {
  // Background layers
  bg: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;

  // Text
  text: string;
  textMuted: string;
  textDim: string;

  // Borders & dividers
  border: string;
  borderAccent: string;
  divider: string;

  // Brand
  accent: string;       // primary green
  accentDim: string;    // hover/secondary green

  // Verdict colors (consistent across themes)
  stop: string;         // red - X verdict
  stopGlow: string;     // red with alpha for shadow
  think: string;        // orange - ? verdict
  thinkGlow: string;
  go: string;           // green - $ verdict
  goGlow: string;

  // Extended palette (UI Pro v1)
  surfaceHigh: string;    // elevated surface for cards
  textSoft: string;       // readable but softer text
  borderLight: string;    // lighter border for emphasis
  accentDeep: string;     // deep green for gradient starts
  accentGlow: string;     // green with alpha for glow/shadow effects
  accentGlow2: string;    // subtler glow
  goBg: string;           // go verdict background (with alpha)
  thinkBg: string;        // think verdict background (with alpha)
  stopBg: string;         // stop verdict background (with alpha)

  // Legacy aliases (v1 backwards compat — alias to v2 names)
  textSecondary: string; // → textMuted
  textTertiary: string; // → textDim
  critic: string;       // → stop
  decide: string;       // → think
  bun: string;          // → go
  premium: string;      // → go
}

// === DARK (default for driving) ===
export const DARK: ThemeColors = {
  bg:              '#0A0E0B',
  surface:         '#141A15',
  surfaceAlt:      '#1A2218',
  surfaceElevated: '#1F2820',

  text:            '#E8FFE8',
  textMuted:       '#7A8A7C',
  textDim:         '#4A5A4C',

  border:          '#1E2A1F',
  borderAccent:    '#00FF8855',
  divider:         '#1E2A1F',

  accent:          '#00FF88',
  accentDim:       '#00CC6A',

  stop:            '#FF3366',
  stopGlow:        '#FF336666',
  think:           '#FFB800',
  thinkGlow:       '#FFB80066',
  go:              '#00FF88',
  goGlow:          '#00FF8866',

  // Extended palette (UI Pro v1)
  surfaceHigh:     '#1E2820',
  textSoft:        '#C0D8C2',
  borderLight:     '#2A3A2C',
  accentDeep:      '#00994F',
  accentGlow:      'rgba(0, 255, 136, 0.15)',
  accentGlow2:     'rgba(0, 255, 136, 0.08)',
  goBg:            'rgba(0, 255, 136, 0.08)',
  thinkBg:         'rgba(255, 184, 0, 0.08)',
  stopBg:          'rgba(255, 51, 102, 0.08)',

  // Legacy aliases
  textSecondary:   '#7A8A7C',
  textTertiary:    '#4A5A4C',  // → textDim
  critic:          '#FF3366',  // → stop
  decide:          '#FFB800',  // → think
  bun:             '#00FF88',  // → go
  premium:         '#00FF88',  // → go
};

// === LIGHT (daytime / optional) ===
export const LIGHT: ThemeColors = {
  bg:              '#F2F7F3',
  surface:         '#FFFFFF',
  surfaceAlt:      '#F7FBF8',
  surfaceElevated: '#FFFFFF',

  text:            '#0A0E0B',
  textMuted:       '#5A6B5C',
  textDim:         '#8A9B8C',

  border:          '#D8E5D9',
  borderAccent:    '#00CC6A88',
  divider:         '#E5EFE6',

  accent:          '#00CC6A',
  accentDim:       '#00B85F',

  stop:            '#FF1A4D',
  stopGlow:        '#FF1A4D44',
  think:           '#FF8800',
  thinkGlow:       '#FF880044',
  go:              '#00CC6A',
  goGlow:          '#00CC6A44',

  // Extended palette (UI Pro v1)
  surfaceHigh:     '#FFFFFF',
  textSoft:        '#3A4B3C',
  borderLight:     '#C8D5C9',
  accentDeep:      '#008844',
  accentGlow:      'rgba(0, 204, 106, 0.15)',
  accentGlow2:     'rgba(0, 204, 106, 0.08)',
  goBg:            'rgba(0, 204, 106, 0.08)',
  thinkBg:         'rgba(255, 136, 0, 0.08)',
  stopBg:          'rgba(255, 26, 77, 0.08)',

  // Legacy aliases
  textSecondary:   '#5A6B5C',
  textTertiary:    '#8A9B8C',
  critic:          '#FF1A4D',
  decide:          '#FF8800',
  bun:             '#00CC6A',
  premium:         '#00CC6A',
};

// === Verdict color helper ===
import type { ProfitVerdict } from '../types';

export function verdictColor(v: ProfitVerdict, theme: ThemeColors): string {
  return theme[v];
}

export function verdictGlow(v: ProfitVerdict, theme: ThemeColors): string {
  return theme[(v + 'Glow') as 'stopGlow' | 'thinkGlow' | 'goGlow'];
}
