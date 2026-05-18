// DRUMIQ v1.0.0 — Filter Engine
// Applies user-configured filters to a ride. If ALL active filters pass,
// the ride is considered a "clean GO". Filters are gated per plan.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type FilterSet,
  type FilterKey,
  type FilterRule,
  type PlanTier,
  type ProfitVerdict,
  DEFAULT_FILTERS,
  FILTER_AVAILABILITY,
} from '../types';

const STORAGE_KEY = '@dp_filters_v2';

// === Persistence ===
export async function loadFilters(): Promise<FilterSet> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FILTERS };
    const parsed = JSON.parse(raw);
    // Defensive merge: if storage has only some keys, fill with defaults
    return {
      minPpkm:     { ...DEFAULT_FILTERS.minPpkm,     ...(parsed.minPpkm     || {}) },
      minPpmin:    { ...DEFAULT_FILTERS.minPpmin,    ...(parsed.minPpmin    || {}) },
      maxPickupKm: { ...DEFAULT_FILTERS.maxPickupKm, ...(parsed.maxPickupKm || {}) },
      minRating:   { ...DEFAULT_FILTERS.minRating,   ...(parsed.minRating   || {}) },
    };
  } catch {
    return { ...DEFAULT_FILTERS };
  }
}

export async function saveFilters(filters: FilterSet): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

export async function resetFilters(): Promise<FilterSet> {
  const fresh = { ...DEFAULT_FILTERS };
  await saveFilters(fresh);
  return fresh;
}

// === Plan-based availability ===
export function isFilterAvailable(key: FilterKey, plan: PlanTier): boolean {
  return FILTER_AVAILABILITY[key].includes(plan);
}

export function maxFiltersForPlan(plan: PlanTier): number {
  return Object.values(FILTER_AVAILABILITY).filter((plans) => plans.includes(plan)).length;
}

export function activeFiltersForPlan(filters: FilterSet, plan: PlanTier): FilterRule[] {
  return Object.values(filters).filter((f) => f.enabled && isFilterAvailable(f.key, plan));
}

// === Filter check ===
export interface RideMetrics {
  profitPerKm: number;     // RON/km after costs
  totalKm: number;         // pickup + trip
  totalMinutes: number;    // pickup + trip duration
  profitPerMin: number;    // profit divided by total minutes
  pickupKm: number;        // pickup distance only
  passengerRating: number | null;  // null when Bolt didn't expose it
}

export interface FilterCheckResult {
  allPassed: boolean;
  failedKey?: FilterKey;
  failedReason?: string;
  activeCount: number;
}

/**
 * Returns whether the ride passes ALL active filters available for the plan.
 * If allPassed is true → overlay should be green regardless of base verdict.
 * If false → returns first failed filter (so we can show "fails: distance").
 */
export function checkFilters(
  metrics: RideMetrics,
  filters: FilterSet,
  plan: PlanTier
): FilterCheckResult {
  const active = activeFiltersForPlan(filters, plan);
  if (active.length === 0) {
    return { allPassed: true, activeCount: 0 };
  }

  for (const f of active) {
    let passed = true;
    let reason = '';
    switch (f.key) {
      case 'minPpkm':
        passed = metrics.profitPerKm >= f.value;
        reason = `${metrics.profitPerKm.toFixed(2)} < ${f.value} lei/km`;
        break;
      case 'minPpmin':
        passed = metrics.profitPerMin >= f.value;
        reason = `${metrics.profitPerMin.toFixed(2)} < ${f.value} lei/min`;
        break;
      case 'maxPickupKm':
        passed = metrics.pickupKm <= f.value;
        reason = `pickup ${metrics.pickupKm.toFixed(1)} > ${f.value} km`;
        break;
      case 'minRating':
        // null rating = pass (don't penalize when Bolt doesn't expose rating yet)
        passed = metrics.passengerRating == null || metrics.passengerRating >= f.value;
        reason = `rating ${metrics.passengerRating ?? '?'} < ${f.value}`;
        break;
    }
    if (!passed) {
      return { allPassed: false, failedKey: f.key, failedReason: reason, activeCount: active.length };
    }
  }

  return { allPassed: true, activeCount: active.length };
}

// === Verdict modifier (filter overrides base verdict) ===
/**
 * Combines base verdict (from profitPerKm thresholds) with filter result.
 * - If filters PASS all → upgrade to 'go' (filters represent user's "OK" criteria)
 * - If filters FAIL → degrade to 'stop' (user's hard rule violated)
 * - If no active filters → return base verdict unchanged
 */
export function applyFiltersToVerdict(
  baseVerdict: ProfitVerdict,
  filterResult: FilterCheckResult
): ProfitVerdict {
  if (filterResult.activeCount === 0) return baseVerdict;
  if (filterResult.allPassed) {
    // Don't downgrade if base is already 'go'
    return 'go';
  }
  return 'stop';
}

// === Human-readable filter labels (for UI) ===
export const FILTER_LABEL: Record<FilterKey, string> = {
  minPpkm:     'Lei/km minim',
  minPpmin:    'Lei/min minim',
  maxPickupKm: 'Rază pickup max',
  minRating:   'Rating pasager min',
};

export const FILTER_UNIT: Record<FilterKey, string> = {
  minPpkm:     'lei/km',
  minPpmin:    'lei/min',
  maxPickupKm: 'km',
  minRating:   '★',
};

export const FILTER_ICON: Record<FilterKey, string> = {
  minPpkm:     '💰',
  minPpmin:    '⚡',
  maxPickupKm: '📍',
  minRating:   '⭐',
};
