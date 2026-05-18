// User-configurable settings: fuel type, fuel price, consumption, wear cost
// Pro-only: pickup max radius, min passenger rating
// All persisted to AsyncStorage, with sane defaults for each fuel type.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

const DPNative = NativeModules.DPAccessibility;

async function syncFuelToNative(s: FuelSettings): Promise<void> {
  try {
    if (DPNative?.syncFuelSettings) {
      await DPNative.syncFuelSettings({
        type: s.type,
        consumption: s.consumption,
        pricePerUnit: s.pricePerUnit,
        wearPerKm: s.wearPerKm,
        consumptionGpl: s.consumptionGpl ?? null,
        pricePerUnitGpl: s.pricePerUnitGpl ?? null,
      });
    }
  } catch (e) { console.warn('syncFuelToNative failed', e); }
}

async function syncProToNative(o: ProOverrides): Promise<void> {
  try {
    if (DPNative?.syncProOverrides) {
      await DPNative.syncProOverrides({
        maxPickupKm: o.maxPickupKm,
        minPassengerRating: o.minPassengerRating,
      });
    }
  } catch (e) { console.warn('syncProToNative failed', e); }
}

export type FuelType = 'benzina' | 'diesel' | 'electric' | 'benzina_gpl' | 'hybrid_hev' | 'hybrid_phev';

export interface FuelSettings {
  type: FuelType;
  /** Litri/100km for petrol/diesel; kWh/100km for electric.
   *  For benzina_gpl this is the petrol fallback consumption. */
  consumption: number;
  /** RON per litru / kWh */
  pricePerUnit: number;
  /** Only used for benzina_gpl: GPL liters per 100km */
  consumptionGpl?: number;
  /** Only used for benzina_gpl: RON per litru GPL */
  pricePerUnitGpl?: number;
  /** Only used for hybrid_phev: kWh per 100km in electric mode */
  consumptionKwh?: number;
  /** Only used for hybrid_phev: RON per kWh */
  pricePerKwh?: number;
  /** Only used for hybrid_phev: ratio of distance in electric mode (0-1, default 0.6) */
  electricRatio?: number;
  /** Vehicle wear cost per km */
  wearPerKm: number;
}

export interface ProOverrides {
  /** Max pickup distance in km. If pickup > this, override verdict to RED (refuza). */
  maxPickupKm: number;
  /** Min passenger rating (1.0-5.0). If rating < this, override verdict to RED. */
  minPassengerRating: number;
}

export const DEFAULTS: Record<FuelType, FuelSettings> = {
  benzina:      { type: 'benzina',      consumption:  8.0, pricePerUnit:  7.50, wearPerKm: 0.35 },
  diesel:       { type: 'diesel',       consumption:  6.0, pricePerUnit:  7.80, wearPerKm: 0.35 },
  electric:     { type: 'electric',     consumption: 17.0, pricePerUnit:  1.50, wearPerKm: 0.35 },
  benzina_gpl:  { type: 'benzina_gpl',  consumption:  7.0, pricePerUnit:  7.50,
                  consumptionGpl: 7.0, pricePerUnitGpl: 3.50, wearPerKm: 0.35 },
  hybrid_hev:   { type: 'hybrid_hev',   consumption:  4.5, pricePerUnit:  7.50, wearPerKm: 0.35 },
  hybrid_phev:  { type: 'hybrid_phev',  consumption:  5.0, pricePerUnit:  7.50,
                  consumptionKwh: 18.0, pricePerKwh: 1.20, electricRatio: 0.60, wearPerKm: 0.35 },
};

export const DEFAULT_PRO_OVERRIDES: ProOverrides = {
  maxPickupKm: 2,
  minPassengerRating: 4.5,
};

const FUEL_KEY = '@dp_fuel_settings_v1';
const PRO_KEY  = '@dp_pro_overrides_v1';

export async function getFuelSettings(): Promise<FuelSettings> {
  try {
    const raw = await AsyncStorage.getItem(FUEL_KEY);
    if (!raw) return DEFAULTS.benzina;
    const parsed = JSON.parse(raw) as FuelSettings;
    // Sanity: ensure type is valid
    if (!DEFAULTS[parsed.type]) return DEFAULTS.benzina;
    return parsed;
  } catch { return DEFAULTS.benzina; }
}

export async function setFuelSettings(s: FuelSettings): Promise<void> {
  await AsyncStorage.setItem(FUEL_KEY, JSON.stringify(s));
  await syncFuelToNative(s);
}

export async function getProOverrides(): Promise<ProOverrides> {
  try {
    const raw = await AsyncStorage.getItem(PRO_KEY);
    if (!raw) return DEFAULT_PRO_OVERRIDES;
    return { ...DEFAULT_PRO_OVERRIDES, ...JSON.parse(raw) };
  } catch { return DEFAULT_PRO_OVERRIDES; }
}

export async function setProOverrides(o: ProOverrides): Promise<void> {
  await AsyncStorage.setItem(PRO_KEY, JSON.stringify(o));
  await syncProToNative(o);
}

// === Vehicle Info (free-text, user-entered) ===
export interface VehicleInfo {
  licensePlate: string;   // ex: B123GOO, MM13VNV
  model: string;          // ex: Dacia Sandero 2023, BYD Seilon 7
}

const VEHICLE_KEY = '@dp_vehicle_v2';

export const DEFAULT_VEHICLE: VehicleInfo = {
  licensePlate: '',
  model: '',
};

export async function getVehicleInfo(): Promise<VehicleInfo> {
  try {
    const raw = await AsyncStorage.getItem(VEHICLE_KEY);
    if (!raw) return DEFAULT_VEHICLE;
    return { ...DEFAULT_VEHICLE, ...JSON.parse(raw) };
  } catch { return DEFAULT_VEHICLE; }
}

export async function setVehicleInfo(v: VehicleInfo): Promise<void> {
  // Sanitize: uppercase plate, trim
  const clean: VehicleInfo = {
    licensePlate: v.licensePlate.toUpperCase().replace(/\s+/g, ''),
    model: v.model.trim(),
  };
  await AsyncStorage.setItem(VEHICLE_KEY, JSON.stringify(clean));
}

/** Effective fuel cost per km, taking GPL into account if applicable.
 * For benzina_gpl: defensive defaults if GPL fields not yet populated (assume same
 * consumption as petrol, half the price — conservative estimate).
 */
export function fuelCostPerKm(s: FuelSettings): number {
  if (s.type === 'benzina_gpl') {
    const petrolConsum = s.consumption ?? 9.0;
    const petrolPrice  = s.pricePerUnit ?? 7.5;
    const gplConsum    = s.consumptionGpl ?? petrolConsum;          // assume similar
    const gplPrice     = s.pricePerUnitGpl ?? (petrolPrice * 0.50); // GPL ~50% of petrol
    const petrolPart   = (petrolConsum / 100) * petrolPrice * 0.20;
    const gplPart      = (gplConsum    / 100) * gplPrice    * 0.80;
    return petrolPart + gplPart;
  }
  if (s.type === 'hybrid_phev') {
    const r       = s.electricRatio  ?? 0.60;
    const elKwh   = s.consumptionKwh ?? 18;
    const elPrice = s.pricePerKwh    ?? 1.20;
    const benzinaPart  = (1 - r) * (s.consumption / 100) * s.pricePerUnit;
    const electricPart = r       * (elKwh / 100)         * elPrice;
    return benzinaPart + electricPart;
  }
  // hybrid_hev: same formula as benzina (no plug, auto-recharge)
  return (s.consumption / 100) * s.pricePerUnit;
}

export function totalCostPerKm(s: FuelSettings): number {
  return fuelCostPerKm(s) + s.wearPerKm;
}


// === Daily goal ===
const DAILY_GOAL_KEY = '@dp_daily_goal_v1';

export async function getDailyGoal(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_GOAL_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
}

export async function saveDailyGoal(goal: number): Promise<void> {
  await AsyncStorage.setItem(DAILY_GOAL_KEY, String(Math.max(0, Math.round(goal))));
}

// Build 16: bootstrap sync on app start so native code has settings from day 1
(async () => {
  try {
    const fuel = await getFuelSettings();
    await syncFuelToNative(fuel);
    const pro = await getProOverrides();
    await syncProToNative(pro);
  } catch (e) { console.warn('bootstrap sync failed', e); }
})();


