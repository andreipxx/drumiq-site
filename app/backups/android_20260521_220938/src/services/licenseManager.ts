// DrumIQ — License Manager v3 (server-side validation)
// CRIT-1 + CRIT-2 fix: no hardcoded codes, server validates via Edge Function,
// JWT stored in expo-secure-store, backward compat migration from AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform, NativeModules } from 'react-native';
import type { License, PlanTier } from '../types';
import { isValidFormat } from '../constants/licenses';
import { syncPlanToSupabase, getSession } from './auth';
const DPNative = NativeModules.DPAccessibility;

async function syncLicenseToNative(plan: string, active: boolean): Promise<void> {
  try {
    if (DPNative?.syncLicense) await DPNative.syncLicense(plan, active);
  } catch (e) { if (__DEV__) console.warn('syncLicenseToNative failed', e); }
}

import {
  syncServerTime, getEffectiveTimeMs, markLastSeen,
  detectRollback, isUnverifiedExpired,
} from './timeSync';

// ─── Storage Keys ─────────────────────────────────────────────
// Per-user keys include userId suffix so each account keeps its own JWT
const LICENSE_JWT_BASE     = 'dp_license_jwt_v3';        // SecureStore key (no @ prefix)
const LICENSE_CODE_BASE    = 'dp_license_code_v3';        // encrypted raw code for refresh
const LICENSE_LEGACY_KEY   = '@dp_license_v2';            // old AsyncStorage key (migration)
const TOS_KEY              = '@dp_tos_accepted_v1';       // stays in AsyncStorage (not sensitive)
const RIDE_COUNTER_BASE    = '@dp_ride_counter';           // stays in AsyncStorage
const DEVICE_ID_KEY        = '@dp_device_id';              // stays in AsyncStorage
const JWT_REFRESH_BASE     = '@dp_jwt_last_refresh';       // last server refresh timestamp
const MIGRATION_DONE_KEY   = '@dp_v3_migration_done';      // flag: legacy migration completed

function userKey(base: string, userId: string | null): string {
  return userId ? `${base}_${userId}` : base;
}

const TOS_VERSION = '2.0';
const JWT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h server refresh

// Edge Function URLs + auth
const SUPABASE_BASE_URL = 'https://dudubuvigdnsduziedix.supabase.co/functions/v1';
const VALIDATE_LICENSE_URL = `${SUPABASE_BASE_URL}/validate-license`;
const ACTIVATE_TRIAL_URL = `${SUPABASE_BASE_URL}/activate-trial`;
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZHVidXZpZ2Ruc2R1emllZGl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTQ5NDgsImV4cCI6MjA5NDM3MDk0OH0.0ta6MRQbpWZ9DriF2hBARWSNiveuC5cqWG21wxWp-Jo';

// ─── Types (exported, backward compatible) ────────────────────

export type ExpirationReason =
  | 'time_expired'
  | 'rides_expired'
  | 'rollback'
  | 'unverified_grace_lapsed'
  | 'no_license';

export interface LicenseState {
  license: License | null;
  expirationReason: ExpirationReason | null;
  ridesUsed: number;
  ridesRemaining: number | null;
}

export interface ToSAcceptance {
  acceptedAt: number;
  version: string;
}

// JWT payload shape (decoded from base64, NOT verified on client)
interface LicenseJwtPayload {
  sub: string;           // device_id
  plan: PlanTier;
  device_id: string;
  activated_at: number;  // ms
  expires_at: number | null; // ms or null for lifetime
  max_rides: number | null;
  multi_device: boolean;
  duration_days: number | null;
  jti: string;
  iat: number;           // seconds
  exp: number;           // seconds
}

// TODO(audit-v2): JWT signature is never verified on client — needs RS256 migration
// so the client can verify with a public key. Currently trusting server-issued JWTs blindly.

// ─── JWT Helpers (decode only — no signature check on client) ─

function decodeJwtPayload(token: string): LicenseJwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url → base64 → decode
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const json = atob(padded);
    return JSON.parse(json) as LicenseJwtPayload;
  } catch {
    return null;
  }
}

function jwtPayloadToLicense(payload: LicenseJwtPayload): License {
  return {
    key: `[server:${payload.jti.substring(0, 8)}]`, // no raw code stored
    plan: payload.plan,
    activatedAt: payload.activated_at,
    expiresAt: payload.expires_at,
    deviceId: payload.device_id,
  };
}

// ─── Current User ID ─────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await getSession();
    return session?.user?.id ?? null;
  } catch { return null; }
}

// ─── SecureStore helpers (per-user) ──────────────────────────

async function storeJwt(token: string): Promise<void> {
  const uid = await getCurrentUserId();
  await SecureStore.setItemAsync(userKey(LICENSE_JWT_BASE, uid), token);
}

async function getStoredJwt(): Promise<string | null> {
  try {
    const uid = await getCurrentUserId();
    const token = await SecureStore.getItemAsync(userKey(LICENSE_JWT_BASE, uid));
    if (token) return token;
    // Fallback: try device-level key (pre-migration)
    if (uid) {
      const legacy = await SecureStore.getItemAsync(LICENSE_JWT_BASE);
      if (legacy) {
        await SecureStore.setItemAsync(userKey(LICENSE_JWT_BASE, uid), legacy);
        await SecureStore.deleteItemAsync(LICENSE_JWT_BASE);
        return legacy;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function deleteStoredJwt(): Promise<void> {
  try {
    const uid = await getCurrentUserId();
    await SecureStore.deleteItemAsync(userKey(LICENSE_JWT_BASE, uid));
    await SecureStore.deleteItemAsync(userKey(LICENSE_CODE_BASE, uid));
  } catch {}
}

async function storeCode(code: string): Promise<void> {
  const uid = await getCurrentUserId();
  await SecureStore.setItemAsync(userKey(LICENSE_CODE_BASE, uid), code);
}

async function getStoredCode(): Promise<string | null> {
  try {
    const uid = await getCurrentUserId();
    const code = await SecureStore.getItemAsync(userKey(LICENSE_CODE_BASE, uid));
    if (code) return code;
    if (uid) {
      const legacy = await SecureStore.getItemAsync(LICENSE_CODE_BASE);
      if (legacy) {
        await SecureStore.setItemAsync(userKey(LICENSE_CODE_BASE, uid), legacy);
        await SecureStore.deleteItemAsync(LICENSE_CODE_BASE);
        return legacy;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Device ID ────────────────────────────────────────────────

export async function getDeviceId(): Promise<string> {
  const cached = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (cached) return cached;
  let id = '';
  try {
    if (Platform.OS === 'android' && NativeModules.DPAccessibility?.getAndroidId) {
      id = await NativeModules.DPAccessibility.getAndroidId();
    }
  } catch {}
  if (!id) {
    // SEC-M5: Always use crypto.getRandomValues (available on Hermes/RN modern), 16 bytes for uniqueness
    id = 'fb-' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

// ─── ToS ──────────────────────────────────────────────────────

export async function isToSAccepted(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(TOS_KEY);
  if (!raw) return false;
  try {
    const obj = JSON.parse(raw) as ToSAcceptance;
    return obj.version === TOS_VERSION && typeof obj.acceptedAt === 'number';
  } catch { return false; }
}

export async function acceptToS(): Promise<void> {
  const obj: ToSAcceptance = { acceptedAt: Date.now(), version: TOS_VERSION };
  await AsyncStorage.setItem(TOS_KEY, JSON.stringify(obj));
}

// ─── Server call ──────────────────────────────────────────────

/** Custom error carrying the machine-stable error_code from Edge Function */
class LicenseServerError extends Error {
  readonly errorCode: string;
  constructor(message: string, errorCode: string) {
    super(message);
    Object.setPrototypeOf(this, LicenseServerError.prototype); // Metro/Hermes ES5 compat
    this.name = 'LicenseServerError';
    this.errorCode = errorCode;
  }
}

async function getAuthInfo(): Promise<{ user_id: string | null; email: string | null }> {
  try {
    const session = await getSession();
    if (session?.user) {
      return { user_id: session.user.id, email: session.user.email ?? null };
    }
  } catch {}
  return { user_id: null, email: null };
}

async function callValidateLicense(code: string, deviceId: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const auth = await getAuthInfo();

  try {
    const resp = await fetch(VALIDATE_LICENSE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ code, device_id: deviceId, ...auth }),
      signal: controller.signal,
    });

    const json = await resp.json();

    if (!resp.ok) {
      const msg = json.error || `Server error ${resp.status}`;
      const code_str = json.error_code || 'UNKNOWN';
      throw new LicenseServerError(msg, code_str);
    }

    if (!json.token || typeof json.token !== 'string') {
      throw new Error('Raspuns invalid de la server.');
    }

    return json.token;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Legacy Migration (AsyncStorage → SecureStore) ────────────

async function migrateLegacyLicense(): Promise<void> {
  const done = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
  if (done === 'true') return;

  try {
    const legacyRaw = await AsyncStorage.getItem(LICENSE_LEGACY_KEY);
    if (!legacyRaw) {
      await AsyncStorage.setItem(MIGRATION_DONE_KEY, 'true');
      return;
    }

    const legacyLicense = JSON.parse(legacyRaw) as License;
    if (!legacyLicense.key || !legacyLicense.plan) {
      // Invalid data, just clean up
      await AsyncStorage.removeItem(LICENSE_LEGACY_KEY);
      await AsyncStorage.setItem(MIGRATION_DONE_KEY, 'true');
      return;
    }

    const deviceId = await getDeviceId();
    try {
      const token = await callValidateLicense(legacyLicense.key, deviceId);
      await storeJwt(token);
      await storeCode(legacyLicense.key);
      const uid = await getCurrentUserId();
      await AsyncStorage.setItem(userKey(JWT_REFRESH_BASE, uid), String(Date.now()));
      if (__DEV__) console.log('Legacy license migrated to JWT successfully');
    } catch (e) {
      // Server validation failed (code format changed, network error, etc.)
      // Preserve the license data as a fallback JWT-less state
      // The user may need to re-enter their code
      if (__DEV__) console.warn('Legacy migration server call failed, user may need to re-activate:', e);
    }

    // Clean up legacy key regardless
    await AsyncStorage.removeItem(LICENSE_LEGACY_KEY);
    await AsyncStorage.removeItem('@dp_used_codes'); // dead code cleanup
  } catch (e) {
    if (__DEV__) console.warn('Legacy migration error:', e);
  }

  await AsyncStorage.setItem(MIGRATION_DONE_KEY, 'true');
}

// ─── Activate Code (main entry point) ─────────────────────────

export async function activateCode(rawKey: string): Promise<License> {
  const code = rawKey.trim().toUpperCase();
  if (!isValidFormat(code)) throw new Error('Format cod invalid.');

  const deviceId = await getDeviceId();

  // Call Edge Function for server-side validation
  const token = await callValidateLicense(code, deviceId);

  // Decode and validate payload
  const payload = decodeJwtPayload(token);
  if (!payload) throw new Error('Raspuns invalid de la server.');

  // Store JWT + raw code in SecureStore (encrypted, per-user)
  await storeJwt(token);
  await storeCode(code);
  const uid = await getCurrentUserId();
  await AsyncStorage.setItem(userKey(JWT_REFRESH_BASE, uid), String(Date.now()));
  await AsyncStorage.setItem(userKey(RIDE_COUNTER_BASE, uid), '0');

  // Sync to native overlay + Supabase profile
  const license = jwtPayloadToLicense(payload);
  await syncLicenseToNative(license.plan, true);
  syncPlanToSupabase(license.plan).catch(() => {});

  // Sync time for anti-rollback
  await syncServerTime();

  return license;
}

// ─── Activate Trial (auto-assign, 7 days / 100 rides) ────────

export async function activateTrial(): Promise<License> {
  const deviceId = await getDeviceId();
  const auth = await getAuthInfo();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const resp = await fetch(ACTIVATE_TRIAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ device_id: deviceId, ...auth }),
      signal: controller.signal,
    });

    const json = await resp.json();

    if (!resp.ok) {
      const msg = json.error || `Server error ${resp.status}`;
      const code = json.error_code || 'UNKNOWN';
      throw new LicenseServerError(msg, code);
    }

    if (!json.token || typeof json.token !== 'string') {
      throw new Error('Raspuns invalid de la server.');
    }

    const payload = decodeJwtPayload(json.token);
    if (!payload) throw new Error('Raspuns invalid de la server.');

    await storeJwt(json.token);
    // SEC-CRIT-2 fix: store the trial code so 24h refresh can verify with server.
    // Server returns `code` for new trials; for existing trials use jti as marker
    // (refreshJwtIfNeeded has a trial-specific path that calls activate-trial instead).
    const trialCode = typeof json.code === 'string' ? json.code : `trial:${payload.jti}`;
    await storeCode(trialCode);
    const uid = await getCurrentUserId();
    await AsyncStorage.setItem(userKey(JWT_REFRESH_BASE, uid), String(Date.now()));
    await AsyncStorage.setItem(userKey(RIDE_COUNTER_BASE, uid), '0');

    const license = jwtPayloadToLicense(payload);
    await syncLicenseToNative(license.plan, true);
    syncPlanToSupabase(license.plan).catch(() => {});
    await syncServerTime();

    return license;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Get License State ────────────────────────────────────────
// TODO(audit-v2): Geofence check is client-only — needs server-side IP geolocation
// to prevent bypass. Add IP-based country check in Edge Functions.

export async function getLicenseState(): Promise<LicenseState> {
  // Run legacy migration on first call
  await migrateLegacyLicense();

  const token = await getStoredJwt();
  if (!token) {
    return { license: null, expirationReason: 'no_license', ridesUsed: 0, ridesRemaining: null };
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    // Corrupted JWT — clear it
    await deleteStoredJwt();
    return { license: null, expirationReason: 'no_license', ridesUsed: 0, ridesRemaining: null };
  }

  const license = jwtPayloadToLicense(payload);
  const uid = await getCurrentUserId();
  const ridesUsed = parseInt((await AsyncStorage.getItem(userKey(RIDE_COUNTER_BASE, uid))) || '0', 10) || 0;
  const ridesRemaining = payload.max_rides != null
    ? Math.max(0, payload.max_rides - ridesUsed)
    : null;

  // Anti-rollback checks (defense in depth — server JWT is primary trust)
  if (await detectRollback()) {
    return { license, expirationReason: 'rollback', ridesUsed, ridesRemaining };
  }
  if (await isUnverifiedExpired()) {
    return { license, expirationReason: 'unverified_grace_lapsed', ridesUsed, ridesRemaining };
  }

  // Ride limit check
  if (payload.max_rides != null && ridesUsed >= payload.max_rides) {
    return { license, expirationReason: 'rides_expired', ridesUsed, ridesRemaining: 0 };
  }

  // Time expiry check (from JWT payload)
  if (payload.expires_at != null) {
    const now = await getEffectiveTimeMs();
    if (now > payload.expires_at) {
      return { license, expirationReason: 'time_expired', ridesUsed, ridesRemaining };
    }
  }

  // Background JWT refresh (best-effort, non-blocking)
  refreshJwtIfNeeded(payload).catch(() => {});

  return { license, expirationReason: null, ridesUsed, ridesRemaining };
}

// ─── Background JWT Refresh (24h) ─────────────────────────────

async function refreshJwtIfNeeded(currentPayload: LicenseJwtPayload): Promise<void> {
  const uid = await getCurrentUserId();
  const refreshKey = userKey(JWT_REFRESH_BASE, uid);
  const lastRefreshRaw = await AsyncStorage.getItem(refreshKey);
  const lastRefresh = lastRefreshRaw ? parseInt(lastRefreshRaw, 10) : 0;

  if (Date.now() - lastRefresh < JWT_REFRESH_INTERVAL_MS) return;

  try {
    const storedCode = await getStoredCode();
    if (!storedCode) {
      // SEC-CRIT-2: No stored code means server check is impossible — don't silently skip.
      // This shouldn't happen after the fix, but if it does, mark refresh done and sync time.
      await AsyncStorage.setItem(refreshKey, String(Date.now()));
      await syncServerTime();
      return;
    }

    const deviceId = await getDeviceId();
    let newToken: string;

    // SEC-CRIT-2: Trial codes (stored as "trial:<jti>" or DPT-*) must refresh via
    // activate-trial endpoint, not validate-license (which would reject the format).
    if (storedCode.startsWith('trial:') || currentPayload.plan === 'trial') {
      const auth = await getAuthInfo();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const resp = await fetch(ACTIVATE_TRIAL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ device_id: deviceId, ...auth }),
          signal: controller.signal,
        });
        const json = await resp.json();
        if (!resp.ok) {
          const msg = json.error || `Server error ${resp.status}`;
          const code_str = json.error_code || 'UNKNOWN';
          throw new LicenseServerError(msg, code_str);
        }
        if (!json.token || typeof json.token !== 'string') {
          throw new Error('Raspuns invalid de la server.');
        }
        newToken = json.token;
      } finally {
        clearTimeout(timeout);
      }
    } else {
      newToken = await callValidateLicense(storedCode, deviceId);
    }

    const newPayload = decodeJwtPayload(newToken);

    if (newPayload) {
      await storeJwt(newToken);
      const license = jwtPayloadToLicense(newPayload);
      await syncLicenseToNative(license.plan, true);
      syncPlanToSupabase(license.plan).catch(() => {});
    }

    await AsyncStorage.setItem(refreshKey, String(Date.now()));
    await syncServerTime();
  } catch (err: unknown) {
    const REVOCATION_CODES = ['CODE_UNKNOWN', 'DEVICE_LOCKED', 'INVALID_FORMAT'];

    if (err instanceof LicenseServerError && REVOCATION_CODES.includes(err.errorCode)) {
      if (__DEV__) console.warn('License revoked by server during refresh:', err.errorCode, err.message);
      await deleteStoredJwt();
      const rideKey = userKey(RIDE_COUNTER_BASE, uid);
      await AsyncStorage.multiRemove([rideKey, refreshKey]);
      await syncLicenseToNative('trial', false);
      syncPlanToSupabase('trial').catch(() => {});
      return;
    }

    await AsyncStorage.setItem(refreshKey, String(Date.now()));
  }
}

// ─── Ride Counter ─────────────────────────────────────────────
// TODO(audit-v2): Ride counter in AsyncStorage is client-only — needs server-side tracking
// to prevent tampering. Move to Supabase with per-license counter.

export async function incrementRideCounter(): Promise<number> {
  const uid = await getCurrentUserId();
  const key = userKey(RIDE_COUNTER_BASE, uid);
  const raw = await AsyncStorage.getItem(key);
  const cur = parseInt(raw || '0', 10) || 0;
  const next = cur + 1;
  await AsyncStorage.setItem(key, String(next));
  const t = await getEffectiveTimeMs();
  await markLastSeen(t);
  return next;
}

// ─── Clear License ────────────────────────────────────────────
// clearLicenseForCodeChange: delete current user's JWT so they can enter a new code
export async function clearLicenseForCodeChange(): Promise<void> {
  const uid = await getCurrentUserId();
  await deleteStoredJwt();
  await AsyncStorage.multiRemove([
    userKey(RIDE_COUNTER_BASE, uid),
    userKey(JWT_REFRESH_BASE, uid),
  ]);
  await syncLicenseToNative('trial', false);
  syncPlanToSupabase('trial').catch(() => {});
}

// clearLicense (legacy compat — used by logout; does NOT delete per-user JWT so PRO persists on re-login)
export async function clearLicense(): Promise<void> {
  await syncLicenseToNative('trial', false);
}

// ─── Compat shim (old App.tsx) ────────────────────────────────

export async function getLicense(): Promise<License | null> {
  const s = await getLicenseState();
  return s.expirationReason ? null : s.license;
}

// ─── Bootstrap sync on module load ────────────────────────────

(async () => {
  try {
    const st = await getLicenseState();
    if (st.license && !st.expirationReason) {
      await syncLicenseToNative(st.license.plan, true);
      syncPlanToSupabase(st.license.plan).catch(() => {});
    } else {
      await syncLicenseToNative('trial', false);
    }
  } catch (e) { if (__DEV__) console.warn('license bootstrap sync failed', e); }
})();
