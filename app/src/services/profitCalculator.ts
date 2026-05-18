// DRUMIQ v1.0.0 — Profit calculator with Filter Engine integration
// Computes base verdict from thresholds, then applies user filters per plan.
// Trip distance pre-accept: 2.0 km fallback (overridden by Google Routes API).

import { THRESHOLDS, TAX_RATE, EXTERNAL_RIDE } from '../constants/config';
import type { ProfitVerdict, PlanTier, FilterSet } from '../types';
import type { ParsedBoltRide } from './boltParser';
import { totalCostPerKm, fuelCostPerKm, type FuelSettings, type ProOverrides } from './userSettings';
import { checkFilters, applyFiltersToVerdict, type FilterCheckResult } from './filterEngine';
import type { ThresholdSettings, AdaptiveConsumption, TaxSettings } from './extendedSettings';
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
  fixedCostForRide: number;
  boltCommissionAmount: number;
  /** Base verdict from thresholds only */
  baseVerdict: ProfitVerdict;
  /** Final verdict after Pro overrides + filters (this drives overlay) */
  verdict: ProfitVerdict;
  isExternalRide: boolean;
  confidence: 'high' | 'low';
  /** Pro override (rating/pickup) - forces stop */
  proOverride?: 'pickup_too_far' | 'rating_too_low' | null;
  /** Filter check result (null if no active filters) */
  filterResult: FilterCheckResult | null;
  /** True when pickup distance >= trip distance — unprofitable dead-run warning */
  shortRideFlag: boolean;
}

const DEFAULT_TRIP_KM_ESTIMATE = 2.0;
const FALLBACK_PICKUP_KM = 1.0;

export function verdictFromProfitPerKm(p: number): ProfitVerdict {
  if (p < THRESHOLDS.STOP_MAX)  return 'stop';   // < 1.60 RON/km
  if (p < THRESHOLDS.THINK_MAX) return 'think';  // 1.60 - 2.20
  return 'go';                                    // >= 2.20
}

export interface AnalyzeOptions {
  fuel: FuelSettings;
  plan: PlanTier;
  proOverrides?: ProOverrides;
  /** User filters (loaded from storage). If undefined, no filtering applied. */
  filters?: FilterSet;
  /** If provided (Pro + Routes API), overrides DEFAULT_TRIP_KM_ESTIMATE */
  tripKmFromApi?: number;
  tripMinFromApi?: number;
  /** Praguri duale RON/km + RON/oră */
  thresholds?: ThresholdSettings;
  /** Consum adaptiv oraș/exterior */
  adaptive?: AdaptiveConsumption;
  /** Taxe și comision Bolt configurabile */
  tax?: TaxSettings;
  /** Mod de lucru (Individual/Flotă) cu costuri fixe */
  workMode?: WorkModeConfig;
}

export function analyzeRide(parsed: ParsedBoltRide, opts: AnalyzeOptions): ProfitAnalysis | null {
  if (parsed.grossNet == null) return null;
  if (parsed.screen !== 'ride_offer') return null;

  // === Distances ===
  const pickupKm = parsed.pickupKm ?? FALLBACK_PICKUP_KM;
  const tripKmEstimate = opts.tripKmFromApi != null && opts.tripKmFromApi > 0
    ? opts.tripKmFromApi
    : DEFAULT_TRIP_KM_ESTIMATE;
  const totalKm = pickupKm + tripKmEstimate;

  // === Time (pickup minutes from Bolt + trip minutes from API or estimate) ===
  const pickupMin = parsed.pickupMin ?? 0;
  const tripMin = opts.tripMinFromApi != null && opts.tripMinFromApi > 0
    ? opts.tripMinFromApi
    : Math.round(tripKmEstimate * 2);  // crude fallback: 30 km/h city avg
  const totalMinutes = pickupMin + tripMin;

  // === Profit calculation ===
  // Bolt arata suma NET in oferta (dupa comision Bolt, taxe incluse) — default 0%
  const effectiveTaxRate = opts.tax ? opts.tax.taxRate / 100 : 0;
  const boltCommission = opts.tax ? opts.tax.boltCommission / 100 : 0;
  const grossAfterBolt = parsed.grossNet * (1 - boltCommission);
  const netAfterTax = grossAfterBolt * (1 - effectiveTaxRate);

  // Consum adaptiv: alege consumul pe baza distanței
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

  // Costuri fixe din WorkMode (contabilitate, chirie, etc.)
  const fixedCostPerHour = opts.workMode ? getFixedCostPerHour(opts.workMode) : 0;
  const fixedCostForRide = fixedCostPerHour * (totalMinutes / 60);

  let profit = netAfterTax - vehicleCost - fixedCostForRide;
  const isExternalRide = pickupKm >= EXTERNAL_RIDE.PICKUP_KM_THRESHOLD;
  if (isExternalRide) profit *= EXTERNAL_RIDE.MULTIPLIER;

  const profitPerKm = totalKm > 0 ? profit / totalKm : 0;
  const profitPerMin = totalMinutes > 0 ? profit / totalMinutes : 0;

  // === BASE verdict from thresholds (dual: RON/km + RON/oră) ===
  let baseVerdict: ProfitVerdict;
  const profitPerHour = totalMinutes > 0 ? (profit / totalMinutes) * 60 : 0;

  if (opts.thresholds) {
    const th = opts.thresholds;
    const kmPass = !th.kmEnabled || profitPerKm >= th.kmValue;
    const hourPass = !th.hourEnabled || profitPerHour >= th.hourValue;

    if (!th.kmEnabled && !th.hourEnabled) {
      baseVerdict = verdictFromProfitPerKm(profitPerKm);
    } else if (th.kmEnabled && th.hourEnabled) {
      baseVerdict = (kmPass && hourPass) ? 'go' : (!kmPass && !hourPass) ? 'stop' : 'think';
    } else {
      baseVerdict = (kmPass && hourPass) ? 'go' : 'stop';
    }
  } else {
    baseVerdict = verdictFromProfitPerKm(profitPerKm);
  }
  let verdict: ProfitVerdict = baseVerdict;
  let proOverride: ProfitAnalysis['proOverride'] = null;

  // === Pro overrides (hard force STOP if pickup too far OR rating too low) ===
  if (opts.plan === 'pro' && opts.proOverrides) {
    if (pickupKm > opts.proOverrides.maxPickupKm) {
      verdict = 'stop';
      proOverride = 'pickup_too_far';
    } else if (
      parsed.passengerRating != null &&
      parsed.passengerRating < opts.proOverrides.minPassengerRating
    ) {
      verdict = 'stop';
      proOverride = 'rating_too_low';
    }
  }

  // === FILTER ENGINE — applies user's plan-gated filters ===
  let filterResult: FilterCheckResult | null = null;
  if (opts.filters && proOverride == null) {
    // Skip filters if pro override already forced stop (no point checking)
    filterResult = checkFilters(
      {
        profitPerKm, totalKm, totalMinutes, profitPerMin,
        pickupKm,
        passengerRating: parsed.passengerRating ?? null,
      },
      opts.filters,
      opts.plan
    );
    verdict = applyFiltersToVerdict(verdict, filterResult);
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
    fixedCostForRide: r2(fixedCostForRide),
    boltCommissionAmount: r2(parsed.grossNet * boltCommission),
    baseVerdict,
    verdict,
    isExternalRide,
    confidence: opts.tripKmFromApi != null ? 'high' : (parsed.pickupKm != null ? 'high' : 'low'),
    proOverride,
    filterResult,
    shortRideFlag: pickupKm >= tripKmEstimate,
  };
}

function r2(n: number): number { return Math.round(n * 100) / 100; }
