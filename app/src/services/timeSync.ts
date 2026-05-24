// Anti-rollback time sync.
// Tries primary endpoint, falls back to secondary, allows offset=0 if both fail.
// Caches offset for 24h. Detects clock-back manipulation.

import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFSET_KEY     = '@dp_time_offset_ms';
const LAST_SYNC_KEY  = '@dp_last_sync_at';
const LAST_SEEN_KEY  = '@dp_last_seen_server_time';
const UNVERIFIED_KEY = '@dp_time_unverified';
const FIRST_FAIL_KEY = '@dp_time_first_fail_at';

const SYNC_INTERVAL_MS    = 24 * 60 * 60 * 1000; // 24h
const UNVERIFIED_GRACE_MS =  6 * 60 * 60 * 1000; // 6h then APP BLOCKED
const ROLLBACK_TOLERANCE_MS = 60 * 60 * 1000;    // 1h

const ENDPOINTS = [
  'https://worldtimeapi.org/api/timezone/Europe/Bucharest',
  'https://timeapi.io/api/Time/current/zone?timeZone=Europe/Bucharest',
];

export interface TimeSyncResult {
  ok: boolean;
  serverTimeMs: number;
  source: string;
}

async function fetchOne(url: string): Promise<number | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const j = await r.json();
    if (j.unixtime != null) return j.unixtime * 1000;
    if (j.dateTime)  return new Date(j.dateTime).getTime();
    if (j.utc_datetime) return new Date(j.utc_datetime).getTime();
    return null;
  } catch { return null; }
}

// CRIT-5: max offset ±24h — reject anything beyond (MITM / broken endpoint)
const MAX_OFFSET_MS = 24 * 60 * 60 * 1000;
// Cross-validation tolerance: endpoints must agree within 30s
const CROSS_VALIDATE_MS = 30 * 1000;

export async function syncServerTime(): Promise<TimeSyncResult> {
  // Fetch ALL endpoints for cross-validation
  const results: { url: string; ms: number }[] = [];
  for (const url of ENDPOINTS) {
    const ms = await fetchOne(url);
    if (ms && ms > 0) {
      results.push({ url, ms });
    }
  }

  if (results.length === 0) {
    // both failed — flag unverified, mark first failure timestamp
    const existingFail = await AsyncStorage.getItem(FIRST_FAIL_KEY);
    if (!existingFail) {
      await AsyncStorage.setItem(FIRST_FAIL_KEY, String(Date.now()));
    }
    await AsyncStorage.setItem(UNVERIFIED_KEY, 'true');
    return { ok: false, serverTimeMs: 0, source: 'none' };
  }

  // Cross-validate: if both endpoints responded, they must agree within tolerance
  if (results.length >= 2) {
    const drift = Math.abs(results[0].ms - results[1].ms);
    if (drift > CROSS_VALIDATE_MS) {
      // Endpoints disagree too much — possible MITM on one of them, reject both
      await AsyncStorage.setItem(UNVERIFIED_KEY, 'true');
      return { ok: false, serverTimeMs: 0, source: 'cross_validation_failed' };
    }
  }

  // Use first valid result
  const best = results[0];
  const offset = best.ms - Date.now();

  // Sanity check: offset beyond ±24h means device clock or endpoint is wildly off
  if (Math.abs(offset) > MAX_OFFSET_MS) {
    await AsyncStorage.setItem(UNVERIFIED_KEY, 'true');
    return { ok: false, serverTimeMs: 0, source: 'offset_out_of_range' };
  }

  _cachedOffset = offset; // Update module-level cache
  await AsyncStorage.multiSet([
    [OFFSET_KEY,    String(offset)],
    [LAST_SYNC_KEY, String(Date.now())],
    [UNVERIFIED_KEY,'false'],
    [FIRST_FAIL_KEY,''],
  ]);
  return { ok: true, serverTimeMs: best.ms, source: best.url };
}

// MED-7: Module-level cache to avoid AsyncStorage read on every call
let _cachedOffset: number | null = null;

export async function getEffectiveTimeMs(): Promise<number> {
  if (_cachedOffset === null) {
    const raw = await AsyncStorage.getItem(OFFSET_KEY);
    _cachedOffset = raw ? parseInt(raw, 10) : 0;
    if (!Number.isFinite(_cachedOffset)) _cachedOffset = 0;
  }
  return Date.now() + _cachedOffset;
}

export async function shouldResyncNow(): Promise<boolean> {
  const last = await AsyncStorage.getItem(LAST_SYNC_KEY);
  if (!last) return true;
  return (Date.now() - parseInt(last, 10)) > SYNC_INTERVAL_MS;
}

export async function isUnverifiedExpired(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(UNVERIFIED_KEY);
  if (flag !== 'true') return false;
  const firstFailRaw = await AsyncStorage.getItem(FIRST_FAIL_KEY);
  if (!firstFailRaw) return false;
  const firstFail = parseInt(firstFailRaw, 10);
  return (Date.now() - firstFail) > UNVERIFIED_GRACE_MS;
}

export async function markLastSeen(serverTimeMs: number): Promise<void> {
  const prevRaw = await AsyncStorage.getItem(LAST_SEEN_KEY);
  const prev = prevRaw ? parseInt(prevRaw, 10) : 0;
  if (serverTimeMs > prev) {
    await AsyncStorage.setItem(LAST_SEEN_KEY, String(serverTimeMs));
  }
}

export async function detectRollback(): Promise<boolean> {
  const seenRaw = await AsyncStorage.getItem(LAST_SEEN_KEY);
  if (!seenRaw) return false;
  const seen = parseInt(seenRaw, 10);
  const now = await getEffectiveTimeMs();
  return now < (seen - ROLLBACK_TOLERANCE_MS);
}

export async function clearTimeSync(): Promise<void> {
  _cachedOffset = null; // Reset cache
  await AsyncStorage.multiRemove([OFFSET_KEY, LAST_SYNC_KEY, LAST_SEEN_KEY, UNVERIFIED_KEY, FIRST_FAIL_KEY]);
}
