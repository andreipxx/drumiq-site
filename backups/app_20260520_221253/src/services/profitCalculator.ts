import { TAX_RATE, EXTERNAL_RIDE } from '../constants/config';
import type { ProfitVerdict, UnifiedThresholds } from '../types';
import type { ParsedBoltRide } from './boltParser';
import { totalCostPerKm, fuelCostPerKm, type FuelSettings } from './userSettings';
import { applyThresholds } from './filterEngine';
import type { AdaptiveConsumption, TaxSettings } from './extendedSettings';
import { getConsumptionForDistance } from './extendedSettings';
import type { WorkModeConfig } from './workMode';
import { getFixedCostPerHour } from './workMode';

export interface ProfitAnalysis {
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
  fixedCostForRide: number;
  boltCommissionAmount: number;
  verdict: ProfitVerdict;
  isExternalRide: boolean;
  confidence: 'high' | 'low';
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
  tax?: TaxSettings;
  workMode?: WorkModeConfig;
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

  const effectiveTaxRate = opts.tax ? opts.tax.taxRate / 100 : 0;
  const boltCommission = opts.tax ? opts.tax.boltCommission / 100 : 0;
  const grossAfterBolt = parsed.grossNet * (1 - boltCommission);
  const netAfterTax = grossAfterBolt * (1 - effectiveTaxRate);

  let costPerKm: number;
  if (opts.adaptive?.enabled && opts.fuel.type !== 'electric') {
    const adaptiveConsumption = getConsumptionForDistance(
      tripKmEstimate, opts.adaptive, opts.fuel.consumption
    );
    costPerKm = (adaptiveConsumption / 100) * opts.fuel.pricePerUnit + opts.fuel.wearPerKm;
  } else {
    costPerKm = totalCostPerKm(opts.fuel);
  }
  const vehicleCost = totalKm * costPerKm;

  const fixedCostPerHour = opts.workMode ? getFixedCostPerHour(opts.workMode) : 0;
  const fixedCostForRide = fixedCostPerHour * (totalMinutes / 60);

  let profit = netAfterTax - vehicleCost - fixedCostForRide;
  const isExternalRide = pickupKm >= EXTERNAL_RIDE.PICKUP_KM_THRESHOLD;
  if (isExternalRide) profit *= EXTERNAL_RIDE.MULTIPLIER;

  const profitPerKm = totalKm > 0 ? profit / totalKm : 0;
  const profitPerMin = totalMinutes > 0 ? profit / totalMinutes : 0;
  const profitPerHour = totalMinutes > 0 ? (profit / totalMinutes) * 60 : 0;
  const grossPerKm = tripKmEstimate > 0 ? parsed.grossNet / tripKmEstimate : 0;

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
    netAfterTax: r2(netAfterTax),
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
    fixedCostForRide: r2(fixedCostForRide),
    boltCommissionAmount: r2(parsed.grossNet * boltCommission),
    verdict,
    isExternalRide,
    confidence: opts.tripKmFromApi != null ? 'high' : (parsed.pickupKm != null ? 'high' : 'low'),
    proOverride,
    overrideThreshold,
    shortRideFlag: pickupKm >= 3.0 && pickupKm >= tripKmEstimate,
    sanityError,
  };
}

function r2(n: number): number { return Math.round(n * 100) / 100; }
