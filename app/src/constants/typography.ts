// DRUMIQ v2.0.0 — Typography constants
// Bricolage Grotesque (display + body), JetBrains Mono (mono), Instrument Serif (accent)

import { Platform } from 'react-native';

export const FONT = {
  display:     'BricolageGrotesque_700Bold',
  displayXB:   'BricolageGrotesque_800ExtraBold',
  body:        'BricolageGrotesque_400Regular',
  bodySB:      'BricolageGrotesque_600SemiBold',
  mono:        'JetBrainsMono_400Regular',
  monoMd:      'JetBrainsMono_500Medium',
  monoBold:    'JetBrainsMono_700Bold',
  serif:       'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  system:      Platform.select({ ios: 'System', android: 'sans-serif' }) ?? 'sans-serif',
  systemMono:  Platform.select({ ios: 'Menlo', android: 'monospace' }) ?? 'monospace',
} as const;

export const SIZE = {
  xs:   9,
  sm:   10,
  base: 13,
  lg:   16,
  xl:   22,
  '2xl': 28,
  '3xl': 36,
  '4xl': 64,
  '5xl': 84,
} as const;

export const WEIGHT = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
  black:     '900' as const,
};

export const SPACING = {
  mono:      8,    // ~0.2em at 10px base → manual spacing in RN
  monoWide:  12,   // ~0.3em
  display:   -0.5, // tight
  hero:      -1,   // very tight
} as const;

export const RADIUS = {
  sm:     10,
  md:     14,
  lg:     18,
  xl:     22,
  '2xl':  24,
  pill:   100,
} as const;

export const GAP = {
  xs:  4,
  sm:  8,
  md:  14,
  lg:  18,
  xl:  22,
  '2xl': 28,
} as const;
