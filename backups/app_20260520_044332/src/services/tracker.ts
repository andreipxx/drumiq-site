// DRUMIQ v1.0.0 — Ride Tracker
// Persists accepted rides locally and computes statistics for the Tracker screen.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ride, TrackerPeriod, TrackerStats } from '../types';

const STORAGE_KEY = '@dp_rides_v2';
const MAX_RIDES = 1000; // keep last 1000 rides max (FIFO)

// === Persistence ===
export async function loadRides(): Promise<Ride[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveRides(rides: Ride[]): Promise<void> {
  // Keep only the most recent MAX_RIDES, sorted descending by timestamp
  const sorted = [...rides].sort((a, b) => b.timestamp - a.timestamp);
  const trimmed = sorted.slice(0, MAX_RIDES);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

// === CRUD ===
export async function addRide(ride: Ride): Promise<void> {
  const all = await loadRides();
  // Dedupe by id
  const filtered = all.filter((r) => r.id !== ride.id);
  filtered.push(ride);
  await saveRides(filtered);
}

export async function updateRide(id: string, patch: Partial<Ride>): Promise<void> {
  const all = await loadRides();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...patch };
  await saveRides(all);
}

export async function getRide(id: string): Promise<Ride | null> {
  const all = await loadRides();
  return all.find((r) => r.id === id) || null;
}

export async function clearAllRides(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function generateRideId(timestamp: number, grossEarnings: number): string {
  // 2-minute window: same offer captured multiple times gets the same ID
  const window = Math.floor(timestamp / 120000);
  return `r_${window}_${Math.round(grossEarnings * 100)}`;
}

// === Stats ===
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(): number {
  const d = new Date();
  const day = d.getDay() || 7; // Sunday = 0 → 7 (so Monday = 1)
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function filterRidesByPeriod(rides: Ride[], period: TrackerPeriod): Ride[] {
  if (period === 'total') return rides;
  const cutoff = period === 'today' ? startOfToday() : startOfWeek();
  return rides.filter((r) => r.timestamp >= cutoff);
}

export function computeStats(rides: Ride[]): TrackerStats {
  if (rides.length === 0) {
    return { earningsLei: 0, ridesCount: 0, offersCount: 0, distanceKm: 0, durationMin: 0, avgPpkm: 0, avgPpmin: 0 };
  }

  const completed = rides.filter((r) => r.completed);
  let earnings = 0, distance = 0, duration = 0;
  for (const r of completed) {
    earnings += r.grossEarnings;
    distance += (r.pickupKm ?? 0) + r.tripKm;
    duration += r.durationMin;
  }

  return {
    earningsLei: round2(earnings),
    ridesCount: completed.length,
    offersCount: rides.length,
    distanceKm: round2(distance),
    durationMin: Math.round(duration),
    avgPpkm: distance > 0 ? round2(earnings / distance) : 0,
    avgPpmin: duration > 0 ? round2(earnings / duration) : 0,
  };
}

export async function getStatsForPeriod(period: TrackerPeriod): Promise<TrackerStats> {
  const all = await loadRides();
  const filtered = filterRidesByPeriod(all, period);
  return computeStats(filtered);
}

export async function getRidesForPeriod(period: TrackerPeriod): Promise<Ride[]> {
  const all = await loadRides();
  return filterRidesByPeriod(all, period).sort((a, b) => b.timestamp - a.timestamp);
}

// === Bolt event detection (parser markers) ===
// These strings appear on Bolt Driver screen and signal lifecycle events
export const BOLT_MARKERS = {
  ACCEPT_AUTO:     'Cererea a fost acceptată automat',
  ACCEPT_PICKUP:   'Așteaptă-l la punctul de preluare',  // FIX: real Bolt phrase post-accept
  ACCEPT_LOC:      'Locația pasagerului este disponibilă',  // FIX: alt post-accept marker
  IN_TRIP_CALL:    'Sună pasagerul',                     // appears during trip
  IN_TRIP_END:     'Finalizează cursa',
  RIDE_COMPLETED:  'Câștigurile tale',                   // FIX: appears in trip summary
} as const;

export type BoltLifecycleEvent =
  | 'offer_shown'
  | 'accepted'
  | 'in_trip'
  | 'completed'
  | 'unknown';

export function detectLifecycleEvent(text: string): BoltLifecycleEvent {
  if (text.includes(BOLT_MARKERS.RIDE_COMPLETED)) return 'completed';
  if (/Confirmă tariful/.test(text))    return 'completed'; // post_trip_confirm
  if (/Evaluează pasagerul/.test(text)) return 'completed'; // post_trip_rate
  if (text.includes(BOLT_MARKERS.IN_TRIP_END) || text.includes(BOLT_MARKERS.IN_TRIP_CALL)) return 'in_trip';
  if (
    text.includes(BOLT_MARKERS.ACCEPT_AUTO) ||
    text.includes(BOLT_MARKERS.ACCEPT_PICKUP) ||
    text.includes(BOLT_MARKERS.ACCEPT_LOC)
  ) {
    return 'accepted';
  }
  if (/\d+[.,]\d+\s*lei\s*\(NET/i.test(text)) return 'offer_shown';
  return 'unknown';
}

// === Format helpers ===
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatLei(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
