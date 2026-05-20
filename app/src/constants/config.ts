// DRUMIQ — Business constants
// All values in RON unless otherwise specified

export const VEHICLE = {
  FUEL_L_PER_100KM: 7.0,
  FUEL_PRICE_PER_L: 3.50,
  WEAR_COST_PER_KM: 0.35,
} as const;

export const FUEL_COST_PER_KM =
  (VEHICLE.FUEL_L_PER_100KM / 100) * VEHICLE.FUEL_PRICE_PER_L; // 0.245
export const TOTAL_COST_PER_KM = FUEL_COST_PER_KM + VEHICLE.WEAR_COST_PER_KM; // 0.595

export const BOLT_VERDE = {
  PER_KM: 2.30,
  PER_MIN: 0.38,
} as const;

export const TAX_RATE = 0; // Bolt arata deja suma NET — nu se mai scade nimic

export const EXTERNAL_RIDE = {
  PICKUP_KM_THRESHOLD: 15,
  MULTIPLIER: 1.25,
} as const;

export const RATING = {
  DEFAULT: 5.0,
  KM_PENALTY_PER_01: 1, // -1 km radius per 0.1 below 5.0
} as const;

export const PLAN_PRICES_RON = {
  trial: 0,
  pro_monthly: 29,
  pro_annual: 290,
  pro_lifetime: 599,
  founding_annual: 199,
  founding_lifetime: 399,
} as const;
