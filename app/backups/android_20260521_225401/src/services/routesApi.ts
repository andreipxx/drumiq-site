// Google Routes API integration — real-time traffic-aware distance/duration
// Pro-only feature. Cached 24h per origin/dest pair to save quota.
// Uses native OkHttp module (DPRoutes) to bypass Android background JS throttling.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { logDpEvent } from './dpDebug';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const CACHE_KEY = '@dp_routes_cache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Boot diagnostic: log API key presence so user can verify in AccessibilityTestScreen
// SEC-M3: Do not log any part of the API key — only log length and validity
(() => {
  try {
    const len = API_KEY.length;
    const ok = len >= 30;
    logDpEvent('ROUTE_BOOT', { keyLen: len, valid: ok });
  } catch {}
})();

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  source: 'cache' | 'api' | 'fallback';
}

interface CacheEntry {
  distanceKm: number;
  durationMin: number;
  fetchedAt: number;
}

function cacheKey(origin: string, destination: string): string {
  return `${origin.trim().toLowerCase()}__${destination.trim().toLowerCase()}`;
}

async function loadCache(): Promise<Record<string, CacheEntry>> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveCache(cache: Record<string, CacheEntry>): Promise<void> {
  // Keep only last 100 entries to prevent unbounded growth
  const entries = Object.entries(cache);
  if (entries.length > 100) {
    entries.sort((a, b) => b[1].fetchedAt - a[1].fetchedAt);
    cache = Object.fromEntries(entries.slice(0, 100));
  }
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

async function _getRouteOnce(origin: string, destination: string): Promise<RouteResult | null> {

  const k = cacheKey(origin, destination);
  const cache = await loadCache();
  const cached = cache[k];
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
    logDpEvent('ROUTE_CACHE', { km: cached.distanceKm });
    return { distanceKm: cached.distanceKm, durationMin: cached.durationMin, source: 'cache' };
  }

  if (!API_KEY || API_KEY.length < 30) {
    logDpEvent('ROUTE_NULL', `no_key_len_${API_KEY.length}`);
    return null;
  }

  // Use native OkHttp module (not throttled in Android background like JS fetch)
  try {
    const native = NativeModules.DPRoutes;
    if (native?.getRoute) {
      logDpEvent('ROUTE_NATIVE', 'start');
      const r = await native.getRoute(origin, destination, API_KEY);
      if (r?.error) {
        logDpEvent('ROUTE_NATIVE_HTTP', r.error);
      }
      if (r && r.distanceKm > 0) {
        const result: RouteResult = {
          distanceKm: r.distanceKm,
          durationMin: r.durationMin,
          source: 'api',
        };
        cache[k] = { distanceKm: result.distanceKm, durationMin: result.durationMin, fetchedAt: Date.now() };
        saveCache(cache).catch(() => {});
        logDpEvent('ROUTE_OK', { km: result.distanceKm, min: result.durationMin, via: 'native' });
        return result;
      }
      logDpEvent('ROUTE_NULL', 'native_empty');
    }
  } catch (e: any) {
    logDpEvent('ROUTE_NATIVE_ERR', String(e?.message || e).slice(0, 80));
  }

  // Fallback: JS fetch (works when app is in foreground)
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);

    const body = {
      origin:      { address: origin },
      destination: { address: destination },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      languageCode: 'ro',
      units: 'METRIC',
    };

    const resp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
      },
      body: JSON.stringify(body),
    });
    clearTimeout(timer);

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      logDpEvent("ROUTE_HTTP", { status: resp.status, body: errBody.slice(0, 120) });
      return null;
    }
    const json: any = await resp.json();
    const route = json?.routes?.[0];
    if (!route) { logDpEvent("ROUTE_NULL", "empty_route"); return null; }

    const distanceM = route.distanceMeters ?? 0;
    const durStr = String(route.duration ?? '0s');
    const durSec = parseInt(durStr.replace(/[^0-9]/g, ''), 10) || 0;

    const result: RouteResult = {
      distanceKm: Math.round((distanceM / 1000) * 10) / 10,
      durationMin: Math.round(durSec / 60),
      source: 'api',
    };

    cache[k] = { distanceKm: result.distanceKm, durationMin: result.durationMin, fetchedAt: Date.now() };
    saveCache(cache).catch(() => {});

    logDpEvent("ROUTE_OK", { km: result.distanceKm, min: result.durationMin, via: 'jsfetch' });
    return result;
  } catch (e: any) {
    logDpEvent("ROUTE_CATCH", String(e?.message || e).slice(0, 80));
    return null;
  }
}

export async function clearRoutesCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}

export async function getRoute(origin: string, destination: string): Promise<RouteResult | null> {
  // First attempt
  let r = await _getRouteOnce(origin, destination);
  if (r) return r;
  // Retry with " Romania" suffix if not present (helps geocoding ambiguous streets)
  const hasRO = /\bRomania\b/i.test(origin) || /\bRomania\b/i.test(destination);
  if (!hasRO) {
    logDpEvent('ROUTE_RETRY', 'with_RO');
    r = await _getRouteOnce(origin + ', Romania', destination + ', Romania');
    if (r) return r;
  }
  return null;
}
