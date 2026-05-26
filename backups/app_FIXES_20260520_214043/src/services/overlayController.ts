// Build 15.2 overlay controller: decoupled show from getRoute (immediate render).
//   - Overlay appears IMMEDIATELY with fallback estimate
//   - getRoute fires in background; if it returns, overlay re-renders with API data
//   - Entire handler wrapped in try-catch with structured event logging
//   - Debug events visible in AccessibilityTestScreen

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accessibility, type AccessibilityCapture } from '../native/accessibility';
import { Overlay, type OverlayMode } from '../native/overlay';
import { parseBoltRide } from './boltParser';
import { analyzeRide } from './profitCalculator';
import { feedScreen } from './rideStateMachine';
import { getFuelSettings, getDailyGoal } from './userSettings';
import { getStatsForPeriod } from './tracker';
import { getRoute } from './routesApi';
import { loadThresholds } from './filterEngine';
import { addRide, updateRide, generateRideId, detectLifecycleEvent, autoCompleteStaleRides } from './tracker';
import { trackPackageSeen } from './platformDetector';
import { VERDICT_DISPLAY } from '../types';
import { logDpEvent } from './dpDebug';
import type { PlanTier, Ride, RouteSource, UnifiedThresholds } from '../types';

const OVERLAY_MODE_KEY = '@dp_overlay_mode_pro';
const STICKY_MS = 15000;

export async function getOverlayModePro(): Promise<OverlayMode> {
  const v = await AsyncStorage.getItem(OVERLAY_MODE_KEY);
  return v === 'full' ? 'full' : 'simple';
}
export async function setOverlayModePro(m: OverlayMode): Promise<void> {
  await AsyncStorage.setItem(OVERLAY_MODE_KEY, m);
  try {
    const { NativeModules } = require('react-native');
    if (NativeModules.DPAccessibility?.syncOverlayMode) {
      await NativeModules.DPAccessibility.syncOverlayMode(m);
    }
  } catch {}
}

let lastShownKey = '';
let lastLoggedScreen = '';
let lastOfferRideId: string | null = null;  // tracks current offer for lifecycle updates
let lastLifecycle: string = '';             // dedupes lifecycle events
let lastShownAt = 0;
let stickyTimer: ReturnType<typeof setTimeout> | null = null;
let listenerStop: (() => void) | null = null;
let controllerPlan: PlanTier | null = null; // BUG4: guards same-plan no-op restart
let controllerGen = 0;                      // BUG3: stale second-pass guard
let offerGen = 0;                        // BUG3: invalidates stale handlers on new offer
let lastOfferGross: number | null = null; // BUG3: tracks current offer's gross for dedup
let lastTripDestination: string | null = null;  // Bug6: destination change tracking
let destChangeShown = false;                     // Bug6: dedup destination change alert
let destChangeCandidate: string | null = null;   // Bug6: consecutive-capture confirmation
let destChangeCandidateCount = 0;                // Bug6: must see same new dest 2x before alert

function normalizeAddress(addr: string): string {
  return addr
    .toLowerCase()
    .replace(/[ăâ]/g, 'a').replace(/[îì]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 25);
}

function modeForPlan(plan: PlanTier, proPref: OverlayMode): OverlayMode {
  if (plan === 'pro') return proPref;
  return 'simple';
}

function buildOverlayPayload(parsed: any, a: any, mode: OverlayMode, label: string,
                              tripKmFromApi?: number, tripMinFromApi?: number,
                              source: 'fallback' | 'api' | 'cache' = 'fallback') {
  const isSanity = !!a.sanityError;
  return {
    mode,
    verdict: a.verdict,
    label,
    pickup: parsed.pickupKm != null ? `${parsed.pickupKm} km / ${parsed.pickupMin ?? '?'} min` : '—',
    trip: isSanity ? '⚠ suspect'
      : tripKmFromApi != null
        ? `${tripKmFromApi} km / ${tripMinFromApi ?? '?'} min`
        : '~' + a.tripKmEstimate + ' km',
    duration: isSanity ? '—' : `${a.totalMinutes} min`,
    gross: parsed.grossNet != null ? parsed.grossNet.toFixed(2) + ' lei' : '—',
    profitKm: isSanity ? '—' : `${a.profitPerKm.toFixed(2)} / ${a.grossPerKm.toFixed(1)} lei/km`,
    profitMin: isSanity ? '—' : a.profitPerMin.toFixed(2) + ' RON/min',
    net: isSanity ? '—' : (a.profit > 0 ? '+' + a.profit.toFixed(2) + ' lei' : a.profit.toFixed(2) + ' lei'),
    shortRide: a.shortRideFlag,
    sanityError: a.sanityError,
    deadKm: String(a.pickupKm),
    source,
  };
}

function buildLabel(parsed: any, a: any): string {
  let label = VERDICT_DISPLAY[a.verdict as keyof typeof VERDICT_DISPLAY]?.label || String(a.verdict).toUpperCase();
  if (a.proOverride === 'pickup_too_far' && a.overrideThreshold != null) {
    label = `Pickup ${a.pickupKm}km > ${a.overrideThreshold}km — REFUZĂ`;
  } else if (a.proOverride === 'rating_too_low' && a.overrideThreshold != null) {
    label = `Rating ${parsed.passengerRating} < ${a.overrideThreshold} — REFUZĂ`;
  } else if (a.proOverride === 'has_stops') {
    label = 'Oprire — verifică distanța';
  } else if (a.sanityError) {
    label = 'Distanță suspectă — verifică';
  }
  if (parsed.surgeMultiplier && parsed.surgeMultiplier > 1) {
    label += ` ⚡${parsed.surgeMultiplier}x`;
  }
  return label;
}

function buildKey(parsed: any, a: any): string {
  return `${parsed.grossNet}|${Math.round((parsed.pickupKm ?? 0) * 2) / 2}|${a.verdict}|${a.proOverride ?? ''}|${parsed.paymentMethod ?? ''}`;
}

export async function startOverlayController(plan: PlanTier): Promise<void> {
  if (listenerStop && controllerPlan === plan) return; // same plan already running — no-op
  if (listenerStop) listenerStop();
  controllerPlan = plan;
  const myGen = ++controllerGen;
  // Reset dedup state so a restarted controller doesn't skip the active offer
  lastShownKey = '';
  lastShownAt = 0;
  lastOfferGross = null;
  offerGen = 0;
  lastTripDestination = null;
  destChangeShown = false;
  destChangeCandidate = null;
  destChangeCandidateCount = 0;

  // mode is read fresh per offer below (so toggle changes apply immediately)
  logDpEvent('CTRL_START', { plan, mode: 'dynamic' });

  Accessibility.startListening();
  Accessibility.startLifeService().catch(() => {});
  autoCompleteStaleRides().then(n => { if (n > 0) logDpEvent('AUTO_COMPLETE', { count: n }); }).catch(() => {});

  const handler = async (cap: AccessibilityCapture) => {
    if (!cap || !cap.text) return;
      try { trackPackageSeen(cap.package); } catch {}
    // Log non-Bolt captures briefly so we know if Uber/other is hijacking
    const isBolt = cap.package === 'ee.mtakso.driver' || cap.package === 'ro.gopampa.boltsim';
    if (!isBolt) {
      // Log only every 20th non-bolt capture to avoid noise
      if (Math.random() < 0.05) logDpEvent('CAP_SKIP', cap.package);
      return;
    }

    try { await feedScreen(cap.text); } catch (e: any) { logDpEvent('FEED_ERR', String(e?.message || e)); }

    const parsed = parseBoltRide(cap.text);
    if (parsed.screen !== lastLoggedScreen) {
      logDpEvent('CAP_BOLT', { screen: parsed.screen, len: cap.text.length });
      lastLoggedScreen = parsed.screen;
    }

    // === LIFECYCLE DETECTION (auto-tracker) ===
    // Updates the last shown ride based on Bolt screen markers
    try {
      const lifecycle = detectLifecycleEvent(cap.text);
      if (lifecycle !== 'unknown' && lifecycle !== lastLifecycle) {
        lastLifecycle = lifecycle;
        if (lastOfferRideId) {
          if (lifecycle === 'accepted') {
            await updateRide(lastOfferRideId, { accepted: true });
            logDpEvent('TRACKER_ACCEPT', lastOfferRideId.slice(-8));
          } else if (lifecycle === 'completed') {
            await updateRide(lastOfferRideId, { completed: true, completedAt: Date.now() });
            logDpEvent('TRACKER_DONE', lastOfferRideId.slice(-8));
            lastOfferRideId = null; // reset for next offer
          }
        }
      }
    } catch (e: any) {
      logDpEvent('LIFECYCLE_ERR', String(e?.message || e).slice(0, 60));
    }

    if (parsed.screen === 'ride_offer') {
      try {
        logDpEvent('OFFER', {
          net: parsed.grossNet, pickupKm: parsed.pickupKm,
          rating: parsed.passengerRating, payment: parsed.paymentMethod,
          surge: parsed.surgeMultiplier ?? null,
        });

        lastTripDestination = parsed.destinationAddress ?? null;
        destChangeShown = false;
        destChangeCandidate = null;
        destChangeCandidateCount = 0;
        if (parsed.grossNet == null) { logDpEvent('SKIP', 'no_grossNet'); return; }

        // BUG3: increment generation on NEW offer (different gross = different ride)
        const isNewOffer = parsed.grossNet !== lastOfferGross;
        if (isNewOffer) {
          offerGen++;
          lastOfferGross = parsed.grossNet ?? null;
        } else if (lastShownAt > 0 && Date.now() - lastShownAt < 2000) {
          logDpEvent('SKIP', 'offer_debounce');
          return;
        }
        const myOfferGen = offerGen;

        // Start API fetch IMMEDIATELY — runs in parallel with settings load below
        const canFetchRoute = plan === 'pro' && !!parsed.pickupAddress && !!parsed.destinationAddress;
        const routePromise = canFetchRoute
          ? getRoute(parsed.pickupAddress!, parsed.destinationAddress!).catch(() => null)
          : null;
        if (canFetchRoute) logDpEvent('API_START', { addr: parsed.pickupAddress?.slice(0, 25) });

        let fuel: any, thresholds: UnifiedThresholds, dailyGoal: number, todayEarnings: number;
        try {
          [fuel, thresholds] = await Promise.all([getFuelSettings(), loadThresholds()]);
          const [goal, todayStats] = await Promise.all([getDailyGoal(), getStatsForPeriod('today')]);
          dailyGoal = goal;
          todayEarnings = todayStats.earningsLei;
        } catch (e: any) { logDpEvent('SETTINGS_ERR', String(e?.message || e)); return; }

        // FIRST PASS: analyze with fallback estimate (no Routes API)
        const a1 = analyzeRide(parsed, { fuel, plan, thresholds });
        const dailyProgressStr = dailyGoal > 0
          ? `${Math.round(todayEarnings)}/${dailyGoal} lei`
          : undefined;
        if (!a1) { logDpEvent('SKIP', 'analyze_null'); return; }

        const label1 = buildLabel(parsed, a1);
        const key1 = buildKey(parsed, a1);

        if (key1 === lastShownKey) { logDpEvent('SKIP', 'dedupe'); return; }
        lastShownKey = key1;
        lastShownAt = Date.now();
        if (stickyTimer) { clearTimeout(stickyTimer); stickyTimer = null; }

        const proPrefNow = await getOverlayModePro();
        const mode = modeForPlan(plan, proPrefNow);

        // Show IMMEDIATELY with fallback estimate — no await on route API
        // (setTimeout in Promise.race is throttled when app is in background on Android,
        // which caused the entire handler to suspend and overlays/tracker to fire 10min late)
        try {
          if (offerGen !== myOfferGen) { logDpEvent('SKIP', 'stale_first_pass'); return; }
          const payload1 = {
            ...buildOverlayPayload(parsed, a1, mode, label1, undefined, undefined, 'fallback'),
            dailyProgress: dailyProgressStr,
          };
          await Overlay.show(payload1);
          logDpEvent('SHOW_OK', { verdict: a1.verdict, ppkm: a1.profitPerKm, src: 'fallback' });
        } catch (e: any) {
          logDpEvent('SHOW_ERR', String(e?.message || e));
          return;
        }

        // Log ride to tracker immediately (fallback data) — accept/complete lifecycle updates follow
        try {
          const ts = Date.now();
          const rideId = generateRideId(ts, parsed.grossNet || 0, parsed.pickupKm);
          const ride: Ride = {
            id: rideId,
            timestamp: ts,
            pickupKm: a1.pickupKm,
            tripKm: a1.tripKmEstimate,
            durationMin: a1.totalMinutes,
            grossEarnings: parsed.grossNet || 0,
            netEarnings: a1.netAfterTax,
            paymentMethod: parsed.paymentMethod || 'card',
            passengerRating: parsed.passengerRating || 5.0,
            profitPerKm: a1.profitPerKm,
            profitNet: a1.profit,
            verdict: a1.verdict,
            source: 'fallback' as RouteSource,
            pickupAddress: parsed.pickupAddress,
            destinationAddress: parsed.destinationAddress,
            accepted: false,
            completed: false,
          };
          await addRide(ride);
          lastOfferRideId = rideId;
          logDpEvent('TRACKER_NEW', { id: rideId.slice(-8), ppkm: a1.profitPerKm, src: 'fallback' });
        } catch (e: any) {
          logDpEvent('TRACKER_ERR', String(e?.message || e).slice(0, 60));
        }

        // Await API result in handler chain (keeps JS thread active, prevents background throttling)
        if (routePromise) {
          const capturedRideId = lastOfferRideId;
          try {
            const route = await routePromise;
            if (!route) { logDpEvent('API_NULL'); }
            else if (controllerGen !== myGen || offerGen !== myOfferGen) { logDpEvent('API_STALE', 'gen_mismatch'); }
            else if (lastShownAt === 0) { logDpEvent('API_LATE', 'overlay_dismissed'); }
            else {
              const a2 = analyzeRide(parsed, {
                fuel, plan, thresholds,
                tripKmFromApi: route.distanceKm, tripMinFromApi: route.durationMin,
              });
              if (a2) {
                const label2 = buildLabel(parsed, a2);
                const payload2 = {
                  ...buildOverlayPayload(parsed, a2, mode, label2,
                    route.distanceKm, route.durationMin, route.source),
                  dailyProgress: dailyProgressStr,
                };
                await Overlay.show(payload2);
                lastShownKey = buildKey(parsed, a2);
                logDpEvent('SHOW_OK', { verdict: a2.verdict, ppkm: a2.profitPerKm, src: route.source });
                if (capturedRideId) {
                  await updateRide(capturedRideId, {
                    tripKm: route.distanceKm,
                    durationMin: route.durationMin,
                    source: route.source,
                    profitPerKm: a2.profitPerKm,
                    profitNet: a2.profit,
                    verdict: a2.verdict,
                    netEarnings: a2.netAfterTax,
                  });
                  logDpEvent('TRACKER_UPD', { km: route.distanceKm, ppkm: a2.profitPerKm, src: route.source });
                }
              }
            }
          } catch (e: any) {
            logDpEvent('API_ERR', String(e?.message || e));
          }
        }
      } catch (e: any) {
        logDpEvent('HANDLER_ERR', String(e?.message || e));
      }
    } else {
      // Bug 6: destination change detection during active trip
      // Uses normalized comparison (lowercase, no diacritics, first 25 chars) to avoid
      // false positives from different extraction formats (offer vs in-trip).
      // Requires 2 consecutive captures with the same new destination before alerting.
      if (parsed.screen === 'in_trip_active' && lastOfferRideId && !destChangeShown) {
        const newDest = parsed.destinationAddress;
        if (newDest && lastTripDestination && normalizeAddress(newDest) !== normalizeAddress(lastTripDestination)) {
          const normNew = normalizeAddress(newDest);
          if (destChangeCandidate === normNew) {
            destChangeCandidateCount++;
          } else {
            destChangeCandidate = normNew;
            destChangeCandidateCount = 1;
          }
          if (destChangeCandidateCount >= 2) {
            destChangeShown = true;
            logDpEvent('DEST_CHANGE', { from: lastTripDestination.slice(0, 30), to: newDest.slice(0, 30) });
            try {
              const proPrefNow = await getOverlayModePro();
              const mode = modeForPlan(plan, proPrefNow);
              await Overlay.show({
                mode,
                verdict: 'think',
                label: 'Destinație schimbată!',
                pickup: '—',
                trip: newDest.slice(0, 40),
                duration: '—',
                gross: '—',
                profitKm: '—',
                profitMin: '—',
                net: '⚠ Verifică noua rută',
                shortRide: false,
                sanityError: false,
                deadKm: '—',
                source: 'fallback',
              });
              lastTripDestination = newDest;
              lastShownAt = Date.now();
              lastShownKey = `dest_change_${newDest}`;
              if (lastOfferRideId) {
                await updateRide(lastOfferRideId, { destinationAddress: newDest });
              }
            } catch (e: any) {
              logDpEvent('DEST_SHOW_ERR', String(e?.message || e).slice(0, 60));
            }
          }
        } else if (newDest && !lastTripDestination) {
          lastTripDestination = newDest;
        }
      }

      if (lastShownAt > 0) {
        const isRefusal = parsed.screen === 'home_idle' || parsed.screen === 'map_idle';
        if (isRefusal) {
          lastShownKey = '';
          lastShownAt = 0;
          lastOfferGross = null;
          if (stickyTimer) { clearTimeout(stickyTimer); stickyTimer = null; }
          try { Overlay.hide(); } catch {}
          logDpEvent('DISMISS', 'instant_refusal');
        } else if (!stickyTimer) {
          const showAge = Date.now() - lastShownAt;
          const remaining = Math.max(0, STICKY_MS - showAge);
          stickyTimer = setTimeout(() => {
            lastShownKey = '';
            lastShownAt = 0;
            try { Overlay.hide(); } catch {}
            stickyTimer = null;
          }, remaining);
        }
      }
    }
  };

  const unsub = Accessibility.addCaptureListener(handler);
  listenerStop = () => {
    unsub();
    if (stickyTimer) { clearTimeout(stickyTimer); stickyTimer = null; }
    try { Overlay.hide(); } catch {}
    Accessibility.stopListening();
    Accessibility.stopLifeService().catch(() => {});
    listenerStop = null;
    logDpEvent('CTRL_STOP');
  };
}

export function stopOverlayController(): void {
  controllerPlan = null;
  if (listenerStop) listenerStop();
}
