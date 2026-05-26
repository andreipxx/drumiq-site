import { EXTERNAL_RIDE } from '../constants/config';
import type { ProfitVerdict, UnifiedThresholds } from '../types';
import type { ParsedBoltRide } from './boltParser';
import { totalCostPerKm, type FuelSettings } from './userSettings';
import { applyThresholds } from './filterEngine';
import type { AdaptiveConsumption } from './extendedSettings';
import { getConsumptionForDistance } from './extendedSettings';

export interface ProfitAnalysis {
  /** Bolt NET price (already after Bolt commission, as displayed in offer) */
  netAfterTax: number;
  totalKm: number;
  totalMinutes: number;
  pickupKm: number;
  tripKmEstimate: number;
  vehicleCost: number;
  profit: number;
  profitPerKm: number;
  profitPerMin: number;
  profitPerHour: number;
  grossPerKm: number;
  verdict: ProfitVerdict;
  isExternalRide: boolean;
  confidence: 'high' | 'medium' | 'low';
  proOverride?: 'pickup_too_far' | 'rating_too_low' | 'has_stops' | null;
  overrideThreshold?: number;
  shortRideFlag: boolean;
  sanityError?: boolean;
}

const DEFAULT_TRIP_KM_ESTIMATE = 2.0;
const FALLBACK_PICKUP_KM = 1.0;
const SANITY_MAX_TRIP_KM = 50;

export interface AnalyzeOptions {
  fuel: FuelSettings;
  plan: string;
  thresholds?: UnifiedThresholds;
  tripKmFromApi?: number;
  tripMinFromApi?: number;
  adaptive?: AdaptiveConsumption;
}

export function analyzeRide(parsed: ParsedBoltRide, opts: AnalyzeOptions): ProfitAnalysis | null {
  if (parsed.grossNet == null) return null;
  if (parsed.screen !== 'ride_offer') return null;

  const pickupKm = parsed.pickupKm ?? FALLBACK_PICKUP_KM;
  const tripKmEstimate = opts.tripKmFromApi != null && opts.tripKmFromApi > 0
    ? opts.tripKmFromApi
    : DEFAULT_TRIP_KM_ESTIMATE;
  const totalKm = pickupKm + tripKmEstimate;

  const pickupMin = parsed.pickupMin ?? 0;
  const tripMin = opts.tripMinFromApi != null && opts.tripMinFromApi > 0
    ? opts.tripMinFromApi
    : Math.round(tripKmEstimate * 2);
  const totalMinutes = pickupMin + tripMin;

  // Bolt displays NET price (already after Bolt commission). No tax deduction —
  // driver wants "bani in mana dupa cursa" (money in hand minus driving costs).
  const boltNet = parsed.grossNet;

  let costPerKm: number;
  if (opts.adaptive?.enabled && opts.fuel.type !== 'electric') {
    const adaptiveConsumption = getConsumptionForDistance(
      opts.adaptive, opts.fuel.consumption
    );
    // CRIT-1 FIX: pass adaptive consumption through totalCostPerKm so GPL blend
    // and PHEV electric ratio are still applied correctly
    costPerKm = totalCostPerKm({ ...opts.fuel, consumption: adaptiveConsumption });
  } else {
    costPerKm = totalCostPerKm(opts.fuel);
  }
  const vehicleCost = totalKm * costPerKm;

  let profit = boltNet - vehicleCost;
  const isExternalRide = pickupKm >= EXTERNAL_RIDE.PICKUP_KM_THRESHOLD;
  if (isExternalRide) profit *= EXTERNAL_RIDE.MULTIPLIER;

  const profitPerKm = totalKm > 0 ? profit / totalKm : 0;
  const profitPerMin = totalMinutes > 0 ? profit / totalMinutes : 0;
  const profitPerHour = totalMinutes > 0 ? (profit / totalMinutes) * 60 : 0;
  // HIGH-5 FIX: use totalKm (same denominator as profitPerKm) for consistency
  const grossPerKm = totalKm > 0 ? parsed.grossNet / totalKm : 0;

  // Sanity check: tripKm absurd (ex: "Marcator pe harta" → 343km)
  const sanityError = tripKmEstimate > SANITY_MAX_TRIP_KM;

  // Unified verdict
  let verdict: ProfitVerdict = 'think';
  let proOverride: ProfitAnalysis['proOverride'] = null;
  let overrideThreshold: number | undefined;

  if (opts.thresholds) {
    const result = applyThresholds(
      { profitPerKm, profitPerMin, profitPerHour, pickupKm, passengerRating: parsed.passengerRating ?? null },
      opts.thresholds,
      !!parsed.hasStops,
    );
    verdict = result.verdict;
    proOverride = result.override ?? null;
    overrideThreshold = result.overrideLimit;
  }

  if (parsed.surgeMultiplier && parsed.surgeMultiplier > 1 && verdict === 'stop' && !proOverride) {
    verdict = 'think';
  }

  if (sanityError) {
    verdict = 'stop';
  }

  return {
    netAfterTax: r2(boltNet),
    totalKm: r2(totalKm),
    totalMinutes: Math.round(totalMinutes),
    pickupKm: r2(pickupKm),
    tripKmEstimate: r2(tripKmEstimate),
    vehicleCost: r2(vehicleCost),
    profit: r2(profit),
    profitPerKm: r2(profitPerKm),
    profitPerMin: r2(profitPerMin),
    profitPerHour: r2(profitPerHour),
    grossPerKm: r2(grossPerKm),
    verdict,
    isExternalRide,
    confidence: opts.tripKmFromApi != null ? 'high' : (parsed.pickupKm != null ? 'medium' : 'low'),
    proOverride,
    overrideThreshold,
    shortRideFlag: pickupKm >= 3.0 && pickupKm >= tripKmEstimate,
    sanityError,
  };
}

function r2(n: number): number { return Math.round(n * 100) / 100; }
