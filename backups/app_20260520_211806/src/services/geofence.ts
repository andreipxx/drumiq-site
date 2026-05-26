import * as Location from 'expo-location';

interface AllowedCity {
  name: string;
  country: string;
  lat: number;
  lng: number;
  radius: number; // km
}

const ALLOWED_CITIES: AllowedCity[] = [
  { name: 'Baia Mare', country: 'România', lat: 47.6587, lng: 23.5757, radius: 25 },
  // { name: 'Cluj-Napoca', country: 'România', lat: 46.7712, lng: 23.6236, radius: 30 },
  // { name: 'Timișoara', country: 'România', lat: 45.7489, lng: 21.2087, radius: 30 },
  // { name: 'București', country: 'România', lat: 44.4268, lng: 26.1025, radius: 40 },
];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type GeofenceResult =
  | { allowed: true; city: string }
  | { allowed: false; reason: 'permission_denied' }
  | { allowed: false; reason: 'outside_area'; detectedCity: string; eligibleCities: string[] };

export async function checkCityEligibility(): Promise<GeofenceResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { allowed: false, reason: 'permission_denied' };
  }

  const location = await Location.getCurrentPositionAsync({});
  const { latitude, longitude } = location.coords;

  for (const city of ALLOWED_CITIES) {
    const dist = haversineDistance(latitude, longitude, city.lat, city.lng);
    if (dist <= city.radius) {
      return { allowed: true, city: city.name };
    }
  }

  let detectedCity = 'Necunoscut';
  try {
    const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (reverse[0]) {
      const city = reverse[0].city || reverse[0].region || 'Necunoscut';
      const country = reverse[0].country || '';
      detectedCity = `${city}, ${country}`;
    }
  } catch {}

  return {
    allowed: false,
    reason: 'outside_area',
    detectedCity,
    eligibleCities: ALLOWED_CITIES.map(c => `${c.name}, ${c.country}`),
  };
}

export function getEligibleCityNames(): string[] {
  return ALLOWED_CITIES.map(c => `${c.name}, ${c.country}`);
}
