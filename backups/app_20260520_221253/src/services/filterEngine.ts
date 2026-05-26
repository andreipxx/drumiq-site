import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UnifiedThresholds, ProfitVerdict } from '../types';
import { DEFAULT_THRESHOLDS } from '../types';

const STORAGE_KEY = '@drumiq_unified_thresholds_v1';

export async function loadThresholds(): Promise<UnifiedThresholds> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THRESHOLDS };
    return { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_THRESHOLDS };
  }
}

export async function saveThresholds(t: UnifiedThresholds): Promise<void> {
  const count = [t.kmEnabled, t.minEnabled, t.hourEnabled].filter(Boolean).length;
  if (count > 1) {
    t = { ...t, kmEnabled: false, minEnabled: false, hourEnabled: false };
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export async function resetThresholds(): Promise<UnifiedThresholds> {
  const fresh = { ...DEFAULT_THRESHOLDS };
  await saveThresholds(fresh);
  return fresh;
}

export interface ThresholdCheckResult {
  verdict: ProfitVerdict;
  override?: 'pickup_too_far' | 'rating_too_low' | 'has_stops' | null;
  overrideActual?: number;
  overrideLimit?: number;
  reason?: string;
}

export function applyThresholds(
  metrics: {
    profitPerKm: number;
    profitPerMin: number;
    profitPerHour: number;
    pickupKm: number;
    passengerRating: number | null;
  },
  thresholds: UnifiedThresholds,
  hasStops: boolean,
): ThresholdCheckResult {
  // Hard filters — independent of profit, checked first
  if (thresholds.pickupEnabled && metrics.pickupKm > thresholds.maxPickupKm) {
    return {
      verdict: 'stop',
      override: 'pickup_too_far',
      overrideActual: metrics.pickupKm,
      overrideLimit: thresholds.maxPickupKm,
      reason: `pickup ${metrics.pickupKm.toFixed(1)} > ${thresholds.maxPickupKm} km`,
    };
  }
  if (thresholds.ratingEnabled && metrics.passengerRating != null && metrics.passengerRating < thresholds.minRating) {
    return {
      verdict: 'stop',
      override: 'rating_too_low',
      overrideActual: metrics.passengerRating,
      overrideLimit: thresholds.minRating,
      reason: `rating ${metrics.passengerRating} < ${thresholds.minRating}`,
    };
  }

  // Oprire necunoscuta = galben (nu putem calcula km reali)
  if (hasStops) {
    return {
      verdict: 'think',
      override: 'has_stops',
      reason: 'cursa cu oprire — km reali necunoscuti',
    };
  }

  // Profit thresholds with yellow zone
  const yellowMul = 1 + thresholds.yellowZone / 100;
  const checks: { pass: boolean; yellow: boolean }[] = [];

  if (thresholds.kmEnabled) {
    checks.push({
      pass: metrics.profitPerKm >= thresholds.kmValue * yellowMul,
      yellow: metrics.profitPerKm >= thresholds.kmValue,
    });
  }
  if (thresholds.minEnabled) {
    checks.push({
      pass: metrics.profitPerMin >= thresholds.minValue * yellowMul,
      yellow: metrics.profitPerMin >= thresholds.minValue,
    });
  }
  if (thresholds.hourEnabled) {
    checks.push({
      pass: metrics.profitPerHour >= thresholds.hourValue * yellowMul,
      yellow: metrics.profitPerHour >= thresholds.hourValue,
    });
  }

  if (checks.length === 0) {
    return { verdict: 'think' };
  }

  const allPass = checks.every(c => c.pass);
  const allYellow = checks.every(c => c.yellow);

  if (allPass) return { verdict: 'go' };
  if (!allYellow) return { verdict: 'stop' };
  return { verdict: 'think' };
}

// UI labels for FilterSettingsScreen
export const THRESHOLD_LABELS = {
  kmValue:      'Profit/km minim (net)',
  minValue:     'Lei/min minim',
  hourValue:    'Lei/oră minim',
  yellowZone:   'Zonă galbenă',
  maxPickupKm:  'Rază pickup max',
  minRating:    'Rating pasager min',
} as const;

export const THRESHOLD_UNITS = {
  kmValue:      'RON/km',
  minValue:     'RON/min',
  hourValue:    'RON/oră',
  yellowZone:   '%',
  maxPickupKm:  'km',
  minRating:    '★',
} as const;

export const THRESHOLD_ICONS = {
  kmValue:      '💰',
  minValue:     '⚡',
  hourValue:    '⏱',
  yellowZone:   '🟡',
  maxPickupKm:  '📍',
  minRating:    '⭐',
} as const;

export const THRESHOLD_HINTS: Record<string, string> = {
  kmValue:      'Profit NET per km total (pickup+cursă, minus costuri). Ex: 0.80 = minim 0.80 lei profit real pe fiecare km parcurs',
  minValue:     'Curse cu profit/min sub această valoare = REFUZ',
  hourValue:    'Curse cu profit/oră sub această valoare = REFUZ',
  yellowZone:   'Procentul deasupra minimului = verdict galben (marginal)',
  maxPickupKm:  'Pickup peste această distanță = REFUZ (independent de profit)',
  minRating:    'Pasageri sub acest rating = REFUZ (siguranță)',
};
