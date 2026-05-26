import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://pretcarburant.ro/api/v1';
const CACHE_KEY = '@dp_live_fuel_prices_v1';
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

export interface LiveFuelPrices {
  benzina: number;
  diesel: number;
  gpl: number;
  updatedAt: number; // timestamp ms
}

const FALLBACK: LiveFuelPrices = {
  benzina: 7.50,
  diesel: 7.20,
  gpl: 3.50,
  updatedAt: 0,
};

export async function getLiveFuelPrices(): Promise<LiveFuelPrices> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached: LiveFuelPrices = JSON.parse(raw);
      if (Date.now() - cached.updatedAt < REFRESH_INTERVAL_MS) return cached;
    }
    return await fetchAndCache();
  } catch {
    return FALLBACK;
  }
}

export async function forceFetchPrices(): Promise<LiveFuelPrices> {
  return fetchAndCache();
}

async function fetchAndCache(): Promise<LiveFuelPrices> {
  try {
    const res = await fetch(`${API_BASE}/preturi/minime`, {
      headers: { 'User-Agent': 'DrumIQ/1.0 (ClaudeBot-assisted)' },
    });
    if (!res.ok) return getCachedOrFallback();
    const json = await res.json();
    if (json.status !== 'ok' || !json.preturi) return getCachedOrFallback();

    const p = json.preturi;
    const prices: LiveFuelPrices = {
      benzina: p.benzina_standard?.mediu ?? FALLBACK.benzina,
      diesel: p.motorina_standard?.mediu ?? FALLBACK.diesel,
      gpl: p.gpl?.mediu ?? FALLBACK.gpl,
      updatedAt: Date.now(),
    };

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(prices));
    return prices;
  } catch {
    return getCachedOrFallback();
  }
}

async function getCachedOrFallback(): Promise<LiveFuelPrices> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return FALLBACK;
}

export function formatLastUpdate(timestamp: number): string {
  if (!timestamp) return 'Niciodată';
  const d = new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return isToday ? `azi, ${hh}:${mm}` : `${d.getDate()}.${d.getMonth() + 1}, ${hh}:${mm}`;
}
