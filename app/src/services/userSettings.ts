// User-configurable settings: fuel type, fuel price, consumption, wear cost
// Pro-only: pickup max radius, min passenger rating
// All persisted to AsyncStorage, with sane defaults for each fuel type.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, DeviceEventEmitter } from 'react-native';

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
        gplRatio: s.gplRatio ?? 0.7,
      });
    }
  } catch (e) { console.warn('syncFuelToNative failed', e); }
}

export type FuelType = 'benzina' | 'diesel' | 'electric' | 'benzina_gpl' | 'hybrid_hev' | 'hybrid_phev' | 'hybrid_gpl';

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
  /** Only used for benzina_gpl: ratio of distance on GPL (0-1, default 0.8) */
  gplRatio?: number;
  /** Vehicle wear cost per km */
  wearPerKm: number;
}

export const DEFAULTS: Record<FuelType, FuelSettings> = {
  benzina:      { type: 'benzina',      consumption:  7.5, pricePerUnit:  7.50, wearPerKm: 0.20 },
  diesel:       { type: 'diesel',       consumption:  7.0, pricePerUnit:  7.80, wearPerKm: 0.22 },
  electric:     { type: 'electric',     consumption: 15.0, pricePerUnit:  1.50, wearPerKm: 0.12 },
  benzina_gpl:  { type: 'benzina_gpl',  consumption:  6.5, pricePerUnit:  7.50,
                  consumptionGpl: 8.0, pricePerUnitGpl: 3.50, gplRatio: 0.7, wearPerKm: 0.22 },
  hybrid_hev:   { type: 'hybrid_hev',   consumption:  4.7, pricePerUnit:  7.50, wearPerKm: 0.15 },
  hybrid_phev:  { type: 'hybrid_phev',  consumption:  5.5, pricePerUnit:  7.50,
                  consumptionKwh: 18.0, pricePerKwh: 1.20, electricRatio: 0.60, wearPerKm: 0.13 },
  hybrid_gpl:   { type: 'hybrid_gpl',  consumption:  4.7, pricePerUnit:  7.50,
                  consumptionGpl: 6.5, pricePerUnitGpl: 3.50, gplRatio: 0.75, wearPerKm: 0.16 },
};

const FUEL_KEY = '@dp_fuel_settings_v1';

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
  DeviceEventEmitter.emit('dp_fuel_changed');
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
    const def = DEFAULTS.benzina_gpl;
    const gplConsum    = s.consumptionGpl ?? def.consumptionGpl!;
    const gplPrice     = s.pricePerUnitGpl ?? def.pricePerUnitGpl!;
    const gplRatio     = s.gplRatio ?? def.gplRatio!;
    const petrolPart   = (s.consumption / 100) * s.pricePerUnit * (1 - gplRatio);
    const gplPart      = (gplConsum     / 100) * gplPrice       * gplRatio;
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
  if (s.type === 'hybrid_gpl') {
    const def = DEFAULTS.hybrid_gpl;
    const gplConsum = s.consumptionGpl ?? def.consumptionGpl!;
    const gplPrice  = s.pricePerUnitGpl ?? def.pricePerUnitGpl!;
    const gplRatio  = s.gplRatio ?? def.gplRatio!;
    const petrolPart = (s.consumption / 100) * s.pricePerUnit * (1 - gplRatio);
    const gplPart    = (gplConsum / 100) * gplPrice * gplRatio;
    return petrolPart + gplPart;
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

// L3 FIX: Bootstrap sync on app start so native code has fuel settings
// Wrapped with __DEV__ logging to surface failures during development
(async () => {
  try {
    const fuel = await getFuelSettings();
    await syncFuelToNative(fuel);
  } catch (e) {
    if (__DEV__) console.warn('[userSettings] bootstrap sync failed:', e);
  }
})();


