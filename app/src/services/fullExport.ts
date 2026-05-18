import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { loadRides, computeStats, filterRidesByPeriod } from './tracker';
import { getFuelSettings, getProOverrides, getVehicleInfo, getDailyGoal, fuelCostPerKm, totalCostPerKm } from './userSettings';
import { getThresholds, getAdaptiveConsumption, getTaxSettings } from './extendedSettings';
import { getLicenseState } from './licenseManager';
import { getDpEvents, getDebugStats } from './dpDebug';
import { Accessibility } from '../native/accessibility';

export async function generateFullExport(): Promise<string> {
  const now = new Date();

  const [
    rides, fuel, proOverrides, vehicle, dailyGoal,
    license, thresholds, adaptive, tax,
  ] = await Promise.all([
    loadRides(),
    getFuelSettings(),
    getProOverrides(),
    getVehicleInfo(),
    getDailyGoal(),
    getLicenseState(),
    getThresholds(),
    getAdaptiveConsumption(),
    getTaxSettings(),
  ]);

  const statsToday = computeStats(filterRidesByPeriod(rides, 'today'));
  const statsWeek = computeStats(filterRidesByPeriod(rides, 'week'));
  const statsTotal = computeStats(rides);

  const debugStats = getDebugStats();
  const debugEvents = getDpEvents();

  let routesCache: any = null;
  try {
    const raw = await AsyncStorage.getItem('@dp_routes_cache_v1');
    if (raw) routesCache = JSON.parse(raw);
  } catch {}

  let nativeLogStats: any = null;
  try { nativeLogStats = await Accessibility.getLogStats(); } catch {}

  const apiKeyRaw = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const report = {
    _exportedAt: now.toISOString(),
    _platform: Platform.OS,
    _appVersion: '1.0.0',
    _package: 'ro.gopampa.drumiq',

    license: {
      plan: license.license?.plan ?? 'none',
      expirationReason: license.expirationReason,
      ridesUsed: license.ridesUsed,
      ridesRemaining: license.ridesRemaining,
      expiresAt: license.license?.expiresAt
        ? new Date(license.license.expiresAt).toISOString()
        : null,
    },

    settings: {
      fuel,
      fuelCostPerKm: fuelCostPerKm(fuel),
      totalCostPerKm: totalCostPerKm(fuel),
      proOverrides,
      vehicle,
      dailyGoal,
      thresholds,
      adaptiveConsumption: adaptive,
      tax,
    },

    apiKey: {
      length: apiKeyRaw.length,
      prefix: apiKeyRaw.slice(0, 6),
      valid: apiKeyRaw.length >= 30,
    },

    stats: {
      today: statsToday,
      week: statsWeek,
      total: statsTotal,
    },

    ridesCount: rides.length,
    rides: rides.sort((a, b) => b.timestamp - a.timestamp),

    debug: {
      stats: debugStats,
      eventsCount: debugEvents.length,
      events: debugEvents.slice(0, 1000),
    },

    routesCacheEntries: routesCache ? Object.keys(routesCache).length : 0,
    routesCache,
    nativeLogStats,
  };

  return JSON.stringify(report, null, 2);
}
