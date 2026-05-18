// DRUMIQ v1.0.0 — type definitions

export type PlanTier = 'trial' | 'simplu' | 'pro';

// v2: simplificat la 3 verdicte (was: critic/decide/bun/premium → stop/think/go)
export type ProfitVerdict = 'stop' | 'think' | 'go';

export type PaymentMethod = 'card' | 'cash';

export type RouteSource = 'fallback' | 'api' | 'cache';

// === Ride (saved in tracker) ===
export interface Ride {
  id: string;
  timestamp: number;
  pickupKm: number;
  tripKm: number;
  durationMin: number;
  grossEarnings: number;
  netEarnings: number;
  paymentMethod: PaymentMethod;
  passengerRating: number;
  profitPerKm: number;
  profitNet: number;
  verdict: ProfitVerdict;
  source: RouteSource;
  pickupAddress?: string;
  destinationAddress?: string;
  accepted: boolean;     // detected from "Cererea a fost acceptată" / "Acceptă" tap
  completed: boolean;    // detected from "Finalizează cursa" → "1 cursă finalizată"
  completedAt?: number;
}

// === License ===
export interface License {
  key: string;
  plan: PlanTier;
  activatedAt: number;
  expiresAt: number | null;
  deviceId?: string;
}

// === Filter Engine ===
export type FilterKey = 'minPpkm' | 'minPpmin' | 'maxPickupKm' | 'minRating';

export interface FilterRule {
  key: FilterKey;
  enabled: boolean;
  value: number;
}

export interface FilterSet {
  minPpkm:     FilterRule;
  minPpmin:    FilterRule;
  maxPickupKm: FilterRule;
  minRating:   FilterRule;
}

// per-plan filter availability
export const FILTER_AVAILABILITY: Record<FilterKey, PlanTier[]> = {
  minPpkm:     ['trial', 'simplu', 'pro'],
  minPpmin:    ['pro'],
  maxPickupKm: ['pro'],
  minRating:   ['pro'],
};

export const DEFAULT_FILTERS: FilterSet = {
  minPpkm:     { key: 'minPpkm',     enabled: true,  value: 2.50 },
  minPpmin:    { key: 'minPpmin',    enabled: false, value: 0.50 },
  maxPickupKm: { key: 'maxPickupKm', enabled: false, value: 3.5 },
  minRating:   { key: 'minRating',   enabled: false, value: 4.5 },
};

// === Verdict display ($/?/X system in v2) ===
export interface VerdictDisplay {
  symbol: string;          // $ / ? / X
  emoji: string;           // 🟢 / 🟡 / 🔴 (legacy compat)
  color: string;           // hex
  glowColor: string;       // hex with alpha
  label: string;           // short word for stats
}

export const VERDICT_DISPLAY: Record<ProfitVerdict, VerdictDisplay> = {
  stop:  { symbol: 'X', emoji: '🔴', color: '#FF3366', glowColor: '#FF336666', label: 'Refuză' },
  think: { symbol: '?', emoji: '🟡', color: '#FFB800', glowColor: '#FFB80066', label: 'Gândește' },
  go:    { symbol: '$', emoji: '🟢', color: '#00FF88', glowColor: '#00FF8866', label: 'Go' },
};

// === Tracker ===
export type TrackerPeriod = 'today' | 'week' | 'total';

export interface TrackerStats {
  earningsLei: number;
  ridesCount: number;
  offersCount: number;
  distanceKm: number;
  durationMin: number;
  avgPpkm: number;
  avgPpmin: number;
}

// === Plan info for UI ===
export interface PlanInfo {
  id: PlanTier;
  name: string;
  pricePerMonth: number;  // 0 for trial
  filters: number;        // 1 / 2 / 4
  features: string[];
}
