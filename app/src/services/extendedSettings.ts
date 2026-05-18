import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══ 2.4.3 — Praguri Duale (RON/km + RON/oră) ═══

export interface ThresholdSettings {
  kmEnabled: boolean;
  kmValue: number;       // RON/km (default 2)
  hourEnabled: boolean;
  hourValue: number;     // RON/oră (default 50)
}

export const DEFAULT_THRESHOLDS: ThresholdSettings = {
  kmEnabled: true,
  kmValue: 2,
  hourEnabled: false,
  hourValue: 50,
};

const THRESHOLD_KEY = '@drumiq_thresholds_v1';

export async function getThresholds(): Promise<ThresholdSettings> {
  try {
    const raw = await AsyncStorage.getItem(THRESHOLD_KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    return { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) };
  } catch { return DEFAULT_THRESHOLDS; }
}

export async function setThresholds(t: ThresholdSettings): Promise<void> {
  await AsyncStorage.setItem(THRESHOLD_KEY, JSON.stringify(t));
}

// ═══ 2.4.4 — Consum Adaptiv Oraș/Exterior ═══

export interface AdaptiveConsumption {
  enabled: boolean;
  city: number;       // l/100km oraș (default 7.8)
  exterior: number;   // l/100km exterior (default 5.4)
  manualAverage?: number;  // override manual — consumul real din bord (null = calculat automat)
}

export const DEFAULT_ADAPTIVE: AdaptiveConsumption = {
  enabled: false,
  city: 7.8,
  exterior: 5.4,
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

export function getConsumptionForDistance(_distance: number, adaptive: AdaptiveConsumption, fallback: number): number {
  if (!adaptive.enabled) return fallback;
  return adaptive.manualAverage ?? fallback;
}

// ═══ 2.4.5 — Comision Bolt + Taxe Configurabile ═══

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
