// DRUMIQ v1.0.0 — type definitions

export type PlanTier = 'trial' | 'pro' | 'root';

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
  passengerRating: number | null;
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

// === Unified Thresholds (single source of truth for verdict logic) ===
export interface UnifiedThresholds {
  kmEnabled: boolean;
  kmValue: number;          // RON/km minim — sub = rosu
  minEnabled: boolean;
  minValue: number;         // RON/min minim
  hourEnabled: boolean;
  hourValue: number;        // RON/ora minim
  yellowZone: number;       // % deasupra minimului = galben (ex: 20 = 20%)
  pickupEnabled: boolean;
  maxPickupKm: number;      // Peste X km pickup = REFUZ (independent de profit)
  ratingEnabled: boolean;
  minRating: number;        // Sub X rating = REFUZ (siguranta)
}

export const DEFAULT_THRESHOLDS: UnifiedThresholds = {
  kmEnabled: true,
  kmValue: 0.80,
  minEnabled: false,
  minValue: 0.50,
  hourEnabled: false,
  hourValue: 50,
  yellowZone: 20,
  pickupEnabled: false,
  maxPickupKm: 3.5,
  ratingEnabled: false,
  minRating: 4.5,
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
