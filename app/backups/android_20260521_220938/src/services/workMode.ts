import AsyncStorage from '@react-native-async-storage/async-storage';

export type WorkMode = 'individual' | 'flota';

export interface IndividualCosts {
  contabilitate: number;    // RON/lună
  alteCheltuieli: number;   // RON/săptămână
}

export interface FlotaCosts {
  chirieMasina: number;     // RON/săptămână (ex: 550)
  carteMunca: number;       // RON/săptămână (ex: 200)
  contabilitate: number;    // RON/săptămână (ex: 50)
  alteCheltuieli: number;   // RON/săptămână
}

export interface WorkModeConfig {
  mode: WorkMode;
  individual: IndividualCosts;
  flota: FlotaCosts;
}

export const DEFAULT_INDIVIDUAL: IndividualCosts = {
  contabilitate: 200,
  alteCheltuieli: 0,
};

export const DEFAULT_FLOTA: FlotaCosts = {
  chirieMasina: 550,
  carteMunca: 200,
  contabilitate: 50,
  alteCheltuieli: 0,
};

export const DEFAULT_WORK_MODE: WorkModeConfig = {
  mode: 'individual',
  individual: DEFAULT_INDIVIDUAL,
  flota: DEFAULT_FLOTA,
};

const WORK_MODE_KEY = '@drumiq_work_mode_v1';

function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  const result = { ...target } as any;
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result as T;
}

export async function getWorkMode(): Promise<WorkModeConfig> {
  try {
    const raw = await AsyncStorage.getItem(WORK_MODE_KEY);
    if (!raw) return { ...DEFAULT_WORK_MODE, individual: { ...DEFAULT_INDIVIDUAL }, flota: { ...DEFAULT_FLOTA } };
    return deepMerge(
      { ...DEFAULT_WORK_MODE, individual: { ...DEFAULT_INDIVIDUAL }, flota: { ...DEFAULT_FLOTA } },
      JSON.parse(raw),
    );
  } catch { return { ...DEFAULT_WORK_MODE, individual: { ...DEFAULT_INDIVIDUAL }, flota: { ...DEFAULT_FLOTA } }; }
}

export async function setWorkMode(config: WorkModeConfig): Promise<void> {
  await AsyncStorage.setItem(WORK_MODE_KEY, JSON.stringify(config));
}

export function getWeeklyCosts(config: WorkModeConfig): number {
  if (config.mode === 'individual') {
    const c = config.individual;
    return (c.contabilitate / 4.33) + c.alteCheltuieli;
  }
  const f = config.flota;
  return f.chirieMasina + f.carteMunca + f.contabilitate + f.alteCheltuieli;
}

export function getMonthlyCosts(config: WorkModeConfig): number {
  if (config.mode === 'individual') {
    const c = config.individual;
    return c.contabilitate + (c.alteCheltuieli * 4.33);
  }
  const f = config.flota;
  return (f.chirieMasina + f.carteMunca + f.contabilitate + f.alteCheltuieli) * 4.33;
}

export function getFixedCostPerHour(config: WorkModeConfig, hoursPerWeek: number = 50): number {
  const weekly = getWeeklyCosts(config);
  return hoursPerWeek > 0 ? weekly / hoursPerWeek : 0;
}
