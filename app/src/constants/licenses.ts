// DRUMIQ — Hardcoded license codes
// Build 14: 8 codes for testing phase, all validated 100% offline.
// usedByDeviceId enforced at activation; once activated on device A,
// the same code cannot be activated on device B (except root key).

import type { PlanTier } from '../types';

export interface LicenseCodeDef {
  plan: PlanTier;
  durationDays: number | null; // null = lifetime
  maxRides: number | null;     // null = unlimited
  multiDevice: boolean;        // true only for root key
}

export const LICENSE_CODES: Record<string, LicenseCodeDef> = {
  'DPT-TRIAL-2026':       { plan: 'trial',  durationDays: 7,    maxRides: 100,  multiDevice: false },
  'DPS-TEST-001':         { plan: 'simplu', durationDays: 30,   maxRides: null, multiDevice: false },
  'DPS-TEST-002':         { plan: 'simplu', durationDays: 30,   maxRides: null, multiDevice: false },
  'DPS-TEST-003':         { plan: 'simplu', durationDays: 30,   maxRides: null, multiDevice: false },
  'DPP-TEST-001':         { plan: 'pro',    durationDays: 30,   maxRides: null, multiDevice: false },
  'DPP-TEST-002':         { plan: 'pro',    durationDays: 30,   maxRides: null, multiDevice: false },
  'DPP-TEST-003':         { plan: 'pro',    durationDays: 30,   maxRides: null, multiDevice: false },
  'DPR-ROOT-ANDR-2026':   { plan: 'pro',    durationDays: null, maxRides: null, multiDevice: true  },
};

export function lookupCode(rawKey: string): LicenseCodeDef | null {
  return LICENSE_CODES[rawKey.trim().toUpperCase()] || null;
}

export function isValidFormat(rawKey: string): boolean {
  const k = rawKey.trim().toUpperCase();
  return /^DP[TSPR]-[A-Z0-9-]{4,20}$/.test(k);
}
