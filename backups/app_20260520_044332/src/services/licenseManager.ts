// Build 14 license manager: 8-code system, ToS gate, anti-rollback,
// per-device locking via Settings.Secure.ANDROID_ID, ride counter for trial.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import type { License, PlanTier } from '../types';
import { LICENSE_CODES, lookupCode, isValidFormat } from '../constants/licenses';
import { syncPlanToSupabase } from './auth';
const DPNative = NativeModules.DPAccessibility;

async function syncLicenseToNative(plan: string, active: boolean): Promise<void> {
  try {
    if (DPNative?.syncLicense) await DPNative.syncLicense(plan, active);
  } catch (e) { console.warn('syncLicenseToNative failed', e); }
}
import {
  syncServerTime, getEffectiveTimeMs, markLastSeen,
  detectRollback, isUnverifiedExpired,
} from './timeSync';

const LICENSE_KEY        = '@dp_license_v2';
const TOS_KEY            = '@dp_tos_accepted_v1';
const USED_CODES_KEY     = '@dp_used_codes';
const RIDE_COUNTER_KEY   = '@dp_ride_counter';
const DEVICE_ID_KEY      = '@dp_device_id';

const TOS_VERSION = '2.0';

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
    id = 'fb-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
  }
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

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

async function getUsedCodes(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(USED_CODES_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

async function markCodeUsed(code: string, deviceId: string): Promise<void> {
  const used = await getUsedCodes();
  used[code] = deviceId;
  await AsyncStorage.setItem(USED_CODES_KEY, JSON.stringify(used));
}

export async function activateCode(rawKey: string): Promise<License> {
  const code = rawKey.trim().toUpperCase();
  if (!isValidFormat(code)) throw new Error('Format cod invalid.');
  const def = lookupCode(code);
  if (!def) throw new Error('Cod necunoscut.');

  const deviceId = await getDeviceId();
  const used = await getUsedCodes();
  if (used[code] && used[code] !== deviceId && !def.multiDevice) {
    throw new Error('Cod deja folosit pe alt dispozitiv.');
  }

  await syncServerTime(); // best-effort; offset=0 if fail (unverified flag set)
  const now = await getEffectiveTimeMs();
  const expiresAt = def.durationDays != null
    ? now + def.durationDays * 24 * 60 * 60 * 1000
    : null;

  const license: License = {
    key: code,
    plan: def.plan,
    activatedAt: now,
    expiresAt,
    deviceId,
  };

  await AsyncStorage.setItem(LICENSE_KEY, JSON.stringify(license));
  await AsyncStorage.setItem(RIDE_COUNTER_KEY, '0');
  await markCodeUsed(code, deviceId);
  await syncLicenseToNative(license.plan, true);
  syncPlanToSupabase(license.plan).catch(() => {});
  return license;
}

export async function getLicenseState(): Promise<LicenseState> {
  const raw = await AsyncStorage.getItem(LICENSE_KEY);
  if (!raw) return { license: null, expirationReason: 'no_license', ridesUsed: 0, ridesRemaining: null };

  let lic: License;
  try { lic = JSON.parse(raw) as License; }
  catch { return { license: null, expirationReason: 'no_license', ridesUsed: 0, ridesRemaining: null }; }

  const def = lookupCode(lic.key);
  const ridesUsed = parseInt((await AsyncStorage.getItem(RIDE_COUNTER_KEY)) || '0', 10) || 0;
  const ridesRemaining = def?.maxRides != null ? Math.max(0, def.maxRides - ridesUsed) : null;

  if (await detectRollback()) {
    return { license: lic, expirationReason: 'rollback', ridesUsed, ridesRemaining };
  }
  if (await isUnverifiedExpired()) {
    return { license: lic, expirationReason: 'unverified_grace_lapsed', ridesUsed, ridesRemaining };
  }
  if (def?.maxRides != null && ridesUsed >= def.maxRides) {
    return { license: lic, expirationReason: 'rides_expired', ridesUsed, ridesRemaining: 0 };
  }
  if (lic.expiresAt != null) {
    const now = await getEffectiveTimeMs();
    if (now > lic.expiresAt) {
      return { license: lic, expirationReason: 'time_expired', ridesUsed, ridesRemaining };
    }
  }
  return { license: lic, expirationReason: null, ridesUsed, ridesRemaining };
}

export async function incrementRideCounter(): Promise<number> {
  const raw = await AsyncStorage.getItem(RIDE_COUNTER_KEY);
  const cur = parseInt(raw || '0', 10) || 0;
  const next = cur + 1;
  await AsyncStorage.setItem(RIDE_COUNTER_KEY, String(next));
  const t = await getEffectiveTimeMs();
  await markLastSeen(t);
  return next;
}

export async function clearLicense(): Promise<void> {
  await AsyncStorage.multiRemove([LICENSE_KEY, RIDE_COUNTER_KEY]);
  await syncLicenseToNative('trial', false);
  syncPlanToSupabase('trial').catch(() => {});
}

// Compatibility shim for old App.tsx
export async function getLicense(): Promise<License | null> {
  const s = await getLicenseState();
  return s.expirationReason ? null : s.license;
}

// Build 16: sync license on app load
(async () => {
  try {
    const st = await getLicenseState();
    if (st.license && !st.expirationReason) {
      await syncLicenseToNative(st.license.plan, true);
      syncPlanToSupabase(st.license.plan).catch(() => {});
    } else {
      await syncLicenseToNative('trial', false);
    }
  } catch (e) { console.warn('license bootstrap sync failed', e); }
})();
