// Build 15: classifier accepts "Acceptare automată" as ride_offer marker.
// FSM is permissive: if at_pickup_waiting / in_trip_active appears without prior
// ride_offer (auto-accept rides where Bolt skips the offer screen too fast),
// we implicitly mark rideOfferSeenAt = now so counter still increments at end.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { incrementRideCounter } from './licenseManager';

export type BoltScreen =
  | 'ride_offer'
  | 'in_trip_to_pickup'
  | 'at_pickup_waiting'
  | 'in_trip_active'
  | 'post_trip_confirm'
  | 'post_trip_rate'
  | 'home_idle'
  | 'map_idle'
  | 'unknown';

const FSM_KEY = '@dp_fsm_state';
const LAST_INCREMENT_KEY = '@dp_last_inc_at';
const DEBOUNCE_MS = 60 * 1000;

export interface FSMState {
  current: BoltScreen;
  rideOfferSeenAt: number | null;
  pickupSeenAt: number | null;
  waitingSeenAt: number | null;
  activeSeenAt: number | null;
  confirmSeenAt: number | null;
  rateSeenAt: number | null;
}

const INITIAL: FSMState = {
  current: 'unknown',
  rideOfferSeenAt: null,
  pickupSeenAt: null,
  waitingSeenAt: null,
  activeSeenAt: null,
  confirmSeenAt: null,
  rateSeenAt: null,
};

export function classifyBoltScreen(text: string): BoltScreen {
  if (!text) return 'unknown';
  if (/Confirmă tariful/.test(text))   return 'post_trip_confirm';
  if (/Evaluează pasagerul/.test(text)) return 'post_trip_rate';
  if (/Începe cursa/.test(text))       return 'at_pickup_waiting';
  if (/Finalizează cursa/.test(text))  return 'in_trip_active';
  if (/Am ajuns/.test(text))           return 'in_trip_to_pickup';
  // Build 15: ride offer can show "Acceptă" (manual) OR "Acceptare automată" (auto-accept)
  // Both cases also have "Refuză" + a price line with "lei"
  const hasAcceptToken =
    /Acceptă\b/.test(text)                  ||
    /Acceptă următoarea cursă/.test(text)    ||
    /Acceptare automată/.test(text);
  // Build 18: Bolt removed “Acceptă” from accessibility tree (newer versions use auto-accept or no text token)
  if (/Refuză/.test(text) && /\(NET/.test(text)) return 'ride_offer';
  if (hasAcceptToken && /Refuză/.test(text) && /lei/.test(text)) return 'ride_offer';
  if (/Bolt Rewards|Scorul șoferului|Rata de acceptare|Intră online|Deconectează-te/.test(text)) return 'home_idle';
  if (/Hartă Google/.test(text))       return 'map_idle';
  return 'unknown';
}

async function loadState(): Promise<FSMState> {
  try {
    const raw = await AsyncStorage.getItem(FSM_KEY);
    if (!raw) return { ...INITIAL };
    return { ...INITIAL, ...JSON.parse(raw) };
  } catch { return { ...INITIAL }; }
}
async function saveState(s: FSMState): Promise<void> {
  await AsyncStorage.setItem(FSM_KEY, JSON.stringify(s));
}

export async function feedScreen(text: string): Promise<{ screen: BoltScreen; counterIncremented: boolean }> {
  const screen = classifyBoltScreen(text);
  if (screen === 'unknown') return { screen, counterIncremented: false };

  const s = await loadState();
  if (screen === s.current) return { screen, counterIncremented: false };

  const now = Date.now();
  const prev = s.current;
  let incremented = false;

  switch (screen) {
    case 'ride_offer':
      Object.assign(s, INITIAL); s.current = 'ride_offer'; s.rideOfferSeenAt = now;
      break;

    case 'in_trip_to_pickup':
      // Permissive: if rideOffer was missed (auto-accept too fast), mark it implicitly
      if (!s.rideOfferSeenAt) s.rideOfferSeenAt = now;
      s.current = 'in_trip_to_pickup'; s.pickupSeenAt = now;
      break;

    case 'at_pickup_waiting':
      if (!s.rideOfferSeenAt) s.rideOfferSeenAt = now;
      if (!s.pickupSeenAt) s.pickupSeenAt = now;
      s.current = 'at_pickup_waiting'; s.waitingSeenAt = now;
      break;

    case 'in_trip_active':
      if (!s.rideOfferSeenAt) s.rideOfferSeenAt = now;
      if (!s.waitingSeenAt) s.waitingSeenAt = now;
      s.current = 'in_trip_active'; s.activeSeenAt = now;
      break;

    case 'post_trip_confirm':
      if (s.activeSeenAt || s.waitingSeenAt) {
        if (!s.activeSeenAt) s.activeSeenAt = now;
        s.current = 'post_trip_confirm'; s.confirmSeenAt = now;
        // SAFETY NET 1: count at confirm (earliest reliable signal of completed ride)
        incremented = await tryIncrementWithDebounce(now);
      } else {
        Object.assign(s, INITIAL);
      }
      break;

    case 'post_trip_rate':
      if (s.confirmSeenAt || s.activeSeenAt) {
        if (!s.confirmSeenAt) s.confirmSeenAt = now;
        s.current = 'post_trip_rate'; s.rateSeenAt = now;
        // SAFETY NET 2: count at rate (debounce dedupes if confirm already counted)
        const inc = await tryIncrementWithDebounce(now);
        if (inc) incremented = true;
      } else { Object.assign(s, INITIAL); }
      break;

    case 'home_idle':
      // SAFETY NET 3: count on return-to-home from any ride state
      // (handles cash flows that skip post_trip_rate, or polling missing screens)
      if (prev === 'post_trip_rate' || prev === 'post_trip_confirm' ||
          prev === 'in_trip_active' || prev === 'at_pickup_waiting') {
        const inc = await tryIncrementWithDebounce(now);
        if (inc) incremented = true;
      }
      Object.assign(s, INITIAL); s.current = 'home_idle';
      break;

    case 'map_idle':
      s.current = 'map_idle';
      break;
  }

  await saveState(s);
  return { screen, counterIncremented: incremented };
}


async function tryIncrementWithDebounce(now: number): Promise<boolean> {
  const lastIncRaw = await AsyncStorage.getItem(LAST_INCREMENT_KEY);
  const lastInc = lastIncRaw ? parseInt(lastIncRaw, 10) : 0;
  if (now - lastInc > DEBOUNCE_MS) {
    await incrementRideCounter();
    await AsyncStorage.setItem(LAST_INCREMENT_KEY, String(now));
    return true;
  }
  return false;
}

export async function resetFSM(): Promise<void> {
  await AsyncStorage.removeItem(FSM_KEY);
  await AsyncStorage.removeItem(LAST_INCREMENT_KEY);
}
