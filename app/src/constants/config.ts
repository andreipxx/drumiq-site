// DRUMIQ — Business constants
// All values in RON unless otherwise specified

export const APP_VERSION = '1.0.0';

export const TAX_RATE = 0; // Bolt arata deja suma NET — nu se mai scade nimic

export const EXTERNAL_RIDE = {
  PICKUP_KM_THRESHOLD: 15,
  MULTIPLIER: 1.25,
} as const;

export const PLAN_PRICES_RON = {
  trial: 0,
  first_month: 9,
  pro_monthly: 49,
  pro_annual: 490,
  pro_lifetime: 888,
} as const;

// Canonical trial & founding member config (was in config/pricing.ts — deleted CRIT-3)
export const TRIAL = {
  RIDES: 100,
  DAYS: 7,
} as const;

export const FOUNDING_MEMBER = {
  LIMIT: 100,
  PRO_ANNUAL: 199,
  PRO_LIFETIME: 399,
  LOCK_PRICE_FOREVER: true,
} as const;

export const REFERRAL_TIERS = [
  { min: 1, max: 4, discountPct: 10 },
  { min: 5, max: 9, discountPct: 20 },
  { min: 10, max: Infinity, discountPct: 30 },
] as const;
