// DRUMIQ v1.0.0 — Platform Connection Detector
// Detects active driver platforms (Bolt, Uber) by tracking last accessibility capture per package

import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlatformId = 'bolt' | 'uber';

export interface PlatformStatus {
  id: PlatformId;
  name: string;
  packageName: string;
  lastSeenAt: number | null;   // timestamp of last accessibility capture
  state: 'active' | 'idle' | 'never';  // active=<24h, idle=>24h, never=null
}

const STORAGE_KEY = '@dp_platform_seen_v2';

const PLATFORM_DEFS: { id: PlatformId; name: string; packageName: string }[] = [
  { id: 'bolt', name: 'Bolt Driver', packageName: 'ee.mtakso.driver' },
  { id: 'uber', name: 'Uber Driver', packageName: 'com.ubercab.driver' },
];

const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;  // 24h

interface SeenMap {
  [packageName: string]: number;  // last seen timestamp
}

async function loadSeen(): Promise<SeenMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveSeen(map: SeenMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/**
 * Called by overlayController on every capture (Bolt, Uber, or anything else).
 * Updates the last-seen timestamp for the package.
 * Throttled internally — only writes if last write was >5 min ago to avoid spam.
 */
let lastWriteAt: Record<string, number> = {};
const WRITE_THROTTLE_MS = 5 * 60 * 1000;

export async function trackPackageSeen(packageName: string): Promise<void> {
  const now = Date.now();
  const lw = lastWriteAt[packageName] || 0;
  if (now - lw < WRITE_THROTTLE_MS) return;  // throttle

  // Only track our two known platforms
  const known = PLATFORM_DEFS.find((p) => p.packageName === packageName);
  if (!known) return;

  lastWriteAt[packageName] = now;
  const seen = await loadSeen();
  seen[packageName] = now;
  await saveSeen(seen);
}

export async function getPlatformStatuses(): Promise<PlatformStatus[]> {
  const seen = await loadSeen();
  const now = Date.now();
  return PLATFORM_DEFS.map((p) => {
    const last = seen[p.packageName] || null;
    let state: PlatformStatus['state'] = 'never';
    if (last != null) {
      state = (now - last) < ACTIVE_WINDOW_MS ? 'active' : 'idle';
    }
    return {
      id: p.id,
      name: p.name,
      packageName: p.packageName,
      lastSeenAt: last,
      state,
    };
  });
}

export function formatLastSeen(ts: number | null): string {
  if (ts == null) return 'niciodată';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'acum';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} h`;
  return `${Math.floor(diff / 86_400_000)} z`;
}
