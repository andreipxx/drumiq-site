// DRUMIQ v2.0.0 — Aurora × Racing × Cyber Theme System
// Verdict colors fixed across themes ($/?/X universal recognizability)

export type ThemeMode = 'automatic' | 'light' | 'dark';

export interface ThemeColors {
  // ═══════════════════════════════════
  //  AURORA v2 TOKENS (new design)
  // ═══════════════════════════════════

  // Background layers
  bg: string;
  bgPage: string;
  bgCard: string;
  bgCardStrong: string;
  bgInput: string;
  bgNav: string;

  // Borders
  border: string;
  borderSoft: string;

  // Text hierarchy
  text: string;
  textSoft: string;
  textMuted: string;
  textFaint: string;

  // Accent palette
  cyan: string;
  pink: string;
  violet: string;
  green: string;
  amber: string;
  red: string;

  // Aurora blob colors
  aurora1: string;
  aurora2: string;
  aurora3: string;

  // Grid overlay
  gridLine: string;

  // Gradient color arrays (for LinearGradient — tuple with ≥2 entries)
  gradPrimary: [string, string, ...string[]];
  gradButton: [string, string, ...string[]];
  gradTextNum: [string, string, ...string[]];
  gradSuccess: [string, string, ...string[]];
  gradAurora: [string, string, ...string[]];

  // Verdict: GO
  go: string;
  goGlow: string;
  goGrad: [string, string, ...string[]];
  goTextOn: string;

  // Verdict: THINK
  think: string;
  thinkGlow: string;
  thinkGrad: [string, string, ...string[]];
  thinkTextOn: string;

  // Verdict: STOP
  stop: string;
  stopGlow: string;
  stopGrad: [string, string, ...string[]];
  stopTextOn: string;

  // Verdict: SURGE
  surge: string;
  surgeGlow: string;
  surgeGrad: [string, string, ...string[]];
  surgeTextOn: string;

  // Verdict background tints
  goBg: string;
  thinkBg: string;
  stopBg: string;

  // ═══════════════════════════════════
  //  LEGACY ALIASES (kept until remaining screens migrated)
  // ═══════════════════════════════════
  surface: string;
  surfaceAlt: string;
  accent: string;
  textDim: string;
  borderAccent: string;
  textSecondary: string;
  textTertiary: string;
  decide: string;
}

// ═══════════════════════════════════
//  DARK THEME (default for driving)
// ═══════════════════════════════════
export const DARK: ThemeColors = {
  // Aurora v2 backgrounds
  bg:             '#0a0118',
  bgPage:         '#050010',
  bgCard:         'rgba(255,255,255,0.05)',
  bgCardStrong:   'rgba(255,255,255,0.08)',
  bgInput:        'rgba(255,255,255,0.04)',
  bgNav:          'rgba(10,1,24,0.7)',

  // Borders
  border:         'rgba(255,255,255,0.12)',
  borderSoft:     'rgba(255,255,255,0.08)',

  // Text
  text:           '#ffffff',
  textSoft:       'rgba(255,255,255,0.6)',
  textMuted:      'rgba(255,255,255,0.4)',
  textFaint:      'rgba(255,255,255,0.25)',

  // Accents
  cyan:           '#06b6d4',
  pink:           '#ec4899',
  violet:         '#7c3aed',
  green:          '#10b981',
  amber:          '#f59e0b',
  red:            '#ef4444',

  // Aurora blobs
  aurora1:        'rgba(124,58,237,0.55)',
  aurora2:        'rgba(6,182,212,0.5)',
  aurora3:        'rgba(236,72,153,0.4)',

  // Grid
  gridLine:       'rgba(255,255,255,0.015)',

  // Gradients (arrays for LinearGradient)
  gradPrimary:    ['#06b6d4', '#ec4899'],
  gradButton:     ['#7c3aed', '#ec4899', '#06b6d4'],
  gradTextNum:    ['#ffffff', '#c4b5fd', '#f0abfc'],
  gradSuccess:    ['#10b981', '#06b6d4'],

  // Full-screen aurora background wash (violet → dark → cyan diagonal)
  gradAurora:     ['rgba(124,58,237,0.30)', 'rgba(10,1,24,0)', 'rgba(6,182,212,0.22)'],

  // Verdict: GO ($)
  go:             '#10b981',
  goGlow:         'rgba(16,185,129,0.5)',
  goGrad:         ['#10b981', '#06b6d4'],
  goTextOn:       '#002b1c',

  // Verdict: THINK (?)
  think:          '#f59e0b',
  thinkGlow:      'rgba(245,158,11,0.5)',
  thinkGrad:      ['#f59e0b', '#fbbf24'],
  thinkTextOn:    '#2b1b00',

  // Verdict: STOP (X)
  stop:           '#ef4444',
  stopGlow:       'rgba(239,68,68,0.5)',
  stopGrad:       ['#ef4444', '#ec4899'],
  stopTextOn:     '#ffffff',

  // Verdict: SURGE
  surge:          '#7c3aed',
  surgeGlow:      'rgba(124,58,237,0.5)',
  surgeGrad:      ['#10b981', '#7c3aed'],
  surgeTextOn:    '#ffffff',

  // Verdict bg tints
  goBg:           'rgba(16,185,129,0.1)',
  thinkBg:        'rgba(245,158,11,0.1)',
  stopBg:         'rgba(239,68,68,0.1)',

  // ── Legacy aliases (kept until remaining screens migrated) ──
  surface:         '#161b22',
  surfaceAlt:      '#1c2128',
  accent:          '#06b6d4',
  textDim:         'rgba(255,255,255,0.25)',
  borderAccent:    'rgba(6,182,212,0.4)',
  textSecondary:   'rgba(255,255,255,0.6)',
  textTertiary:    'rgba(255,255,255,0.4)',
  decide:          '#f59e0b',
};

// ═══════════════════════════════════
//  LIGHT THEME
// ═══════════════════════════════════
export const LIGHT: ThemeColors = {
  // Aurora v2 backgrounds
  bg:             '#fafaff',
  bgPage:         '#f0f0f7',
  bgCard:         'rgba(255,255,255,0.7)',
  bgCardStrong:   'rgba(255,255,255,0.9)',
  bgInput:        'rgba(255,255,255,0.6)',
  bgNav:          'rgba(255,255,255,0.75)',

  // Borders
  border:         'rgba(20,10,40,0.12)',
  borderSoft:     'rgba(20,10,40,0.08)',

  // Text
  text:           '#14102a',
  textSoft:       'rgba(20,16,42,0.65)',
  textMuted:      'rgba(20,16,42,0.45)',
  textFaint:      'rgba(20,16,42,0.25)',

  // Accents (darker for contrast on light bg)
  cyan:           '#0891b2',
  pink:           '#db2777',
  violet:         '#7c3aed',
  green:          '#059669',
  amber:          '#d97706',
  red:            '#dc2626',

  // Aurora blobs
  aurora1:        'rgba(167,139,250,0.45)',
  aurora2:        'rgba(103,232,249,0.5)',
  aurora3:        'rgba(244,114,182,0.4)',

  // Grid
  gridLine:       'rgba(20,10,40,0.025)',

  // Gradients
  gradPrimary:    ['#0891b2', '#db2777'],
  gradButton:     ['#7c3aed', '#db2777', '#0891b2'],
  gradTextNum:    ['#14102a', '#7c3aed', '#db2777'],
  gradSuccess:    ['#059669', '#0891b2'],

  // Full-screen aurora background wash (violet → light → cyan diagonal)
  gradAurora:     ['rgba(167,139,250,0.35)', 'rgba(240,240,247,0)', 'rgba(103,232,249,0.32)'],

  // Verdict: GO ($)
  go:             '#059669',
  goGlow:         'rgba(5,150,105,0.4)',
  goGrad:         ['#059669', '#0891b2'],
  goTextOn:       '#002b1c',

  // Verdict: THINK (?)
  think:          '#d97706',
  thinkGlow:      'rgba(217,119,6,0.4)',
  thinkGrad:      ['#d97706', '#f59e0b'],
  thinkTextOn:    '#2b1b00',

  // Verdict: STOP (X)
  stop:           '#dc2626',
  stopGlow:       'rgba(220,38,38,0.4)',
  stopGrad:       ['#dc2626', '#db2777'],
  stopTextOn:     '#ffffff',

  // Verdict: SURGE
  surge:          '#7c3aed',
  surgeGlow:      'rgba(124,58,237,0.4)',
  surgeGrad:      ['#059669', '#7c3aed'],
  surgeTextOn:    '#ffffff',

  // Verdict bg tints
  goBg:           'rgba(5,150,105,0.08)',
  thinkBg:        'rgba(217,119,6,0.08)',
  stopBg:         'rgba(220,38,38,0.08)',

  // ── Legacy aliases (kept until remaining screens migrated) ──
  surface:         '#ffffff',
  surfaceAlt:      '#f0f3f6',
  accent:          '#0891b2',
  textDim:         'rgba(20,16,42,0.25)',
  borderAccent:    'rgba(8,145,178,0.5)',
  textSecondary:   'rgba(20,16,42,0.65)',
  textTertiary:    'rgba(20,16,42,0.45)',
  decide:          '#d97706',
};

// ═══════════════════════════════════
//  VERDICT HELPERS
// ═══════════════════════════════════
import type { ProfitVerdict } from '../types';

export type VerdictType = 'go' | 'think' | 'stop' | 'surge';

export function verdictColor(v: ProfitVerdict, theme: ThemeColors): string {
  return theme[v];
}

export function verdictGlow(v: ProfitVerdict, theme: ThemeColors): string {
  return theme[(v + 'Glow') as 'stopGlow' | 'thinkGlow' | 'goGlow'];
}

export function verdictGrad(v: VerdictType, theme: ThemeColors): [string, string, ...string[]] {
  return theme[(v + 'Grad') as 'goGrad' | 'thinkGrad' | 'stopGrad' | 'surgeGrad'];
}

export function verdictTextOn(v: VerdictType, theme: ThemeColors): string {
  return theme[(v + 'TextOn') as 'goTextOn' | 'thinkTextOn' | 'stopTextOn' | 'surgeTextOn'];
}
