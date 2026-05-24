// Build 14 parser — screen classifier + per-screen extraction.
// Replaces broken pickup/trip naming from B12 (those used trip fields for pickup data).

import type { PaymentMethod } from '../types';
import { classifyBoltScreen, type BoltScreen } from './rideStateMachine';

export interface ParsedBoltRide {
  screen: BoltScreen;
  /** Net price displayed by Bolt (after Bolt commission, before income tax) */
  grossNet?: number;
  /** Pickup distance in km — distance from driver to pickup point */
  pickupKm?: number;
  /** Pickup duration in minutes */
  pickupMin?: number;
  /** Trip distance — Bolt does NOT show this pre-accept (only post-start in Maps/Waze) */
  tripKm?: number;
  /** Trip duration */
  tripMin?: number;
  /** Passenger rating */
  passengerRating?: number;
  /** Passenger first name */
  passengerName?: string;
  /** Card or cash */
  paymentMethod?: PaymentMethod;
  /** "În afara razei" flag */
  outsideRange?: boolean;
  /** Surge multiplier (e.g. 1.2, 2.0). Already baked into grossNet. */
  surgeMultiplier?: number;
  /** Pickup address */
  pickupAddress?: string;
  /** Destination address */
  destinationAddress?: string;
  /** Has multi-stop ride */
  hasStops?: boolean;
  /** Tip/bacsis amount (parsed from post-trip screens) */
  tipAmount?: number;
  /** Final confirmed earnings (from post_trip_confirm / post_trip_rate) */
  finalEarnings?: number;
  /** Raw text for debugging */
  raw?: string;
}

export function parseBoltRide(text: string): ParsedBoltRide {
  const screen = classifyBoltScreen(text);
  const result: ParsedBoltRide = { screen, raw: text };
  if (!text || text.trim().length === 0) return result;

  switch (screen) {
    case 'ride_offer':
      return parseRideOffer(text, result);
    case 'in_trip_to_pickup':
    case 'at_pickup_waiting':
    case 'in_trip_active':
      return parseInTrip(text, result);
    case 'post_trip_confirm':
      return parsePostTripConfirm(text, result);
    case 'post_trip_rate':
      return parsePostTripRate(text, result);
    default:
      // home_idle, map_idle, unknown — no data extraction
      return result;
  }
}

function parseRideOffer(text: string, r: ParsedBoltRide): ParsedBoltRide {
  // Format observed in real captures:
  //   "Refuză\nBolt\n(Cerere mare 1.2x\n)?În afara razei?\nNumerar?\n9,75 lei (NET, taxe incluse)\n
  //    Refuzul cursei nu-ți va afecta rata de acceptare\nNume • 5.0 ★\n2 min • 1.5 km\n
  //    StradaA, Baia Mare\nStradaB, Baia Mare\nAcceptă"

  const priceMatch = text.match(/(\d+[.,]\d+)\s*lei\s*\(NET/i);
  if (priceMatch) r.grossNet = parseFloat(priceMatch[1].replace(',', '.'));

  // Pickup: "X min • Y km" — these are distance & time TO PICKUP POINT, not trip
  const pickupMatch = text.match(/(\d+)\s*min\s*[•·*]\s*(\d+(?:[.,]\d+)?)\s*km/);
  if (pickupMatch) {
    r.pickupMin = parseInt(pickupMatch[1], 10);
    r.pickupKm  = parseFloat(pickupMatch[2].replace(',', '.'));
  }

  const ratingMatch = text.match(/([A-ZĂÂÎȘȚ][a-zăâîșț]+(?:[ -][A-ZĂÂÎȘȚa-zăâîșț]+)*)\s*[•·]\s*(\d(?:[.,]\d)?)\s*★/);
  if (ratingMatch) {
    r.passengerName     = ratingMatch[1];
    r.passengerRating   = parseFloat(ratingMatch[2].replace(',', '.'));
  }

  if (/[Îî]n afara razei/.test(text)) r.outsideRange = true;
  if (/Numerar/i.test(text))         r.paymentMethod = 'cash';
  else                               r.paymentMethod = 'card';

  const surgeMatch = text.match(/Cerere mare\s+(\d+(?:[.,]\d+)?)x/i);
  if (surgeMatch) r.surgeMultiplier = parseFloat(surgeMatch[1].replace(',', '.'));

  if (/\d+\s*oprir[ei]/i.test(text)) r.hasStops = true;

  // Addresses — lines between "X min • Y km" pickup line and "Acceptă"
  // Positional extraction is more robust than keyword whitelist (catches streets
  // without "Strada" prefix, named boulevards, locations like "Metro", etc.)
  const lines = text.split('\n').map((l) => l.trim());
  const acceptIdx = lines.findIndex((l) => /^(Acceptă|Acceptă următoarea cursă|Acceptare automată)$/i.test(l));
  const pickupLineIdx = lines.findIndex((l) => /\d+\s*min\s*[•·*]\s*\d+(?:[.,]\d+)?\s*km/.test(l));
  const addrStart = pickupLineIdx >= 0 ? pickupLineIdx + 1 : 0;
  // When "Acceptă" missing from accessibility tree (newer Bolt), cap window to 7 lines after pickup
  const addrEnd   = acceptIdx >= 0 ? acceptIdx
    : (pickupLineIdx >= 0 ? Math.min(pickupLineIdx + 8, lines.length) : lines.length);
  // LOW-8: This regex filters out known non-address lines from the Bolt UI accessibility tree.
  // It needs updating whenever Bolt changes their screen text/labels.
  const NON_ADDR  = /^(Refuz|Respingerea|Cerere\s|Numerar|Card\b|lei\s*\(|Refuzul|rata\s*de|\d+\s*oprire|Accepta|★|\d+[.,]\d+\s*lei|Hart[aă]|[Îî]n afara|Loca[tț]ie|Bolt\b)/i;
  const addrCandidates = lines
    .slice(addrStart, addrEnd)
    .filter((l) => l.length >= 5 && l.length < 100 && !NON_ADDR.test(l));
  if (addrCandidates.length >= 1) r.pickupAddress      = addrCandidates[0];
  if (addrCandidates.length >= 2) r.destinationAddress = addrCandidates[addrCandidates.length - 1];

  return r;
}

function parseInTrip(text: string, r: ParsedBoltRide): ParsedBoltRide {
  // Format: "X min\nAdresă pickup\nNume\n5.0\n28,12 lei · Net, cu TVA.\nAm ajuns/Începe cursa/Finalizează cursa"
  const priceMatch = text.match(/(\d+[.,]\d+)\s*lei\s*[·•]\s*Net,?\s*cu\s*TVA/i);
  if (priceMatch) r.grossNet = parseFloat(priceMatch[1].replace(',', '.'));

  // HIGH-3 FIX: restrict to valid Bolt rating range (1.0-5.0) to avoid matching
  // any isolated digit (e.g. stop counts, minute values)
  const ratingLine = text.match(/^([1-5][.,]\d)\s*$/m);
  if (ratingLine) r.passengerRating = parseFloat(ratingLine[1].replace(',', '.'));

  // Time to pickup remaining: "<1 min" or "X min" (only on in_trip_to_pickup)
  if (r.screen === 'in_trip_to_pickup') {
    const minMatch = text.match(/^(<1|\d+)\s*min$/m);
    if (minMatch) r.pickupMin = minMatch[1] === '<1' ? 0 : parseInt(minMatch[1], 10);
  }

  // Destination extraction for active trip (detect address changes)
  if (r.screen === 'in_trip_active') {
    const lines = text.split('\n').map((l) => l.trim());
    const SKIP = /^(Finalizează|Începe|Am ajuns|Sună|lei|Net|Evaluează|Bolt|Refuz|\d+[.,]\d+\s*lei|Hartă|Locație|<1|\d+\s*min$)/i;
    const addrCandidates = lines.filter((l) => l.length >= 5 && l.length < 100 && !SKIP.test(l));
    if (addrCandidates.length > 0) {
      r.destinationAddress = addrCandidates[addrCandidates.length - 1];
    }
  }

  return r;
}

function parsePostTripConfirm(text: string, r: ParsedBoltRide): ParsedBoltRide {
  // "Confirmă tariful\n28,12 lei\nPlata prin aplicație..."
  const priceMatch = text.match(/Confirmă tariful\s*\n\s*(\d+[.,]\d+)\s*lei/);
  if (priceMatch) {
    r.grossNet = parseFloat(priceMatch[1].replace(',', '.'));
    r.finalEarnings = r.grossNet;
  }
  const tipMatch = text.match(/[Bb]ac[sș]i[sș]\s*[:\-]?\s*(\d+[.,]?\d*)\s*lei/i)
    || text.match(/[Pp]ropin[aă]\s*[:\-]?\s*(\d+[.,]?\d*)\s*lei/i)
    || text.match(/(\d+[.,]\d+)\s*lei\s*[Bb]ac[sș]i[sș]/i);
  if (tipMatch) r.tipAmount = parseFloat(tipMatch[1].replace(',', '.'));
  return r;
}

function parsePostTripRate(text: string, r: ParsedBoltRide): ParsedBoltRide {
  // "Evaluează pasagerul\n★★★★★\nCâștigurile tale\n28,12 lei..."
  const earningsMatch = text.match(/[Cc]â[sș]tigurile tale\s*\n\s*(\d+[.,]\d+)\s*lei/i)
    || text.match(/[Aa]i câ[sș]tigat\s*\n?\s*(\d+[.,]\d+)\s*lei/i);
  if (earningsMatch) {
    r.finalEarnings = parseFloat(earningsMatch[1].replace(',', '.'));
    r.grossNet = r.finalEarnings;
  }
  const tipMatch = text.match(/[Bb]ac[sș]i[sș]\s*[:\-]?\s*(\d+[.,]?\d*)\s*lei/i)
    || text.match(/[Pp]ropin[aă]\s*[:\-]?\s*(\d+[.,]?\d*)\s*lei/i)
    || text.match(/(\d+[.,]\d+)\s*lei\s*[Bb]ac[sș]i[sș]/i);
  if (tipMatch) r.tipAmount = parseFloat(tipMatch[1].replace(',', '.'));
  return r;
}
