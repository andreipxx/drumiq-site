import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══ Consum Adaptiv Oraș/Exterior ═══

// HIGH-1 FIX: removed dead `city` and `exterior` fields — they were never used
// in any calculation. Only manualAverage (real dashboard consumption) is used.
export interface AdaptiveConsumption {
  enabled: boolean;
  manualAverage?: number;  // override manual — consumul real din bord (null = calculat automat)
}

export const DEFAULT_ADAPTIVE: AdaptiveConsumption = {
  enabled: false,
};

const ADAPTIVE_KEY = '@drumiq_adaptive_consumption_v1';

export async function getAdaptiveConsumption(): Promise<AdaptiveConsumption> {
  try {
    const raw = await AsyncStorage.getItem(ADAPTIVE_KEY);
    if (!raw) return DEFAULT_ADAPTIVE;
    return { ...DEFAULT_ADAPTIVE, ...JSON.parse(raw) };
  } catch { return DEFAULT_ADAPTIVE; }
}

export async function setAdaptiveConsumption(a: AdaptiveConsumption): Promise<void> {
  await AsyncStorage.setItem(ADAPTIVE_KEY, JSON.stringify(a));
}

export function getConsumptionForDistance(adaptive: AdaptiveConsumption, fallback: number): number {
  if (!adaptive.enabled) return fallback;
  return adaptive.manualAverage ?? fallback;
}

// ═══ 2.4.5 — Comision Bolt + Taxe Configurabile ═══
// DEPRECATED: TaxSettings is no longer used in profitCalculator.
// Bolt displays NET price (after commission). Tax deduction removed — driver sees
// real money in hand. Kept for future WorkMode integration (COMING SOON).

export interface TaxSettings {
  taxRate: number;          // procent taxe (0 = Bolt arata NET)
  boltCommission: number;   // procent comision Bolt (0 = Bolt deja scoate comisionul)
}

export const DEFAULT_TAX: TaxSettings = {
  taxRate: 0,
  boltCommission: 0,
};

const TAX_KEY = '@drumiq_tax_settings_v1';

export async function getTaxSettings(): Promise<TaxSettings> {
  try {
    const raw = await AsyncStorage.getItem(TAX_KEY);
    if (!raw) return DEFAULT_TAX;
    return { ...DEFAULT_TAX, ...JSON.parse(raw) };
  } catch { return DEFAULT_TAX; }
}

export async function setTaxSettings(t: TaxSettings): Promise<void> {
  await AsyncStorage.setItem(TAX_KEY, JSON.stringify(t));
}
