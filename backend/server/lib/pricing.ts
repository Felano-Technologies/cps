export const DELIVERY_RATES: Record<string, number> = {
  Sunyani: 55,
  Tamale: 60,
  Takoradi: 55,
  Accra: 45,
};

export const KUMASI_RATES = {
  CampusAndEnvirons: 20, // KNUST campus, Ayeduase, Ayigya, Bomso, Kotei
  Other: 35,
};

export interface DeliveryParams {
  region: string;
  kumasiSubArea?: 'CampusAndEnvirons' | 'Other';
}

export function calculateDeliveryCost(params: DeliveryParams): number | null {
  const { region, kumasiSubArea } = params;

  if (region === 'Kumasi') {
    if (kumasiSubArea === 'CampusAndEnvirons') {
      return KUMASI_RATES.CampusAndEnvirons;
    }
    return KUMASI_RATES.Other;
  }

  if (DELIVERY_RATES[region]) {
    return DELIVERY_RATES[region];
  }

  return null;
}

/** Cities CPS operates in: riders collect and deliver in each. */
export const CPS_CITIES = ['Kumasi', ...Object.keys(DELIVERY_RATES)];

/** Price of a delivery within any one city (Kumasi's KNUST area is cheaper, see KUMASI_RATES). */
export const SAME_CITY_RATE = 35;

/**
 * Price of a delivery between two CPS cities, in either direction.
 * - Same city: 35 (inside Kumasi, the KNUST campus area is 20).
 * - Kumasi ↔ another city: that city's rate (Accra 45, Takoradi/Sunyani 55, Tamale 60), both ways.
 * - Between two non-Kumasi cities: the higher of their two Kumasi rates (Accra ↔ Takoradi 55).
 * Returns null when either city isn't served.
 */
export function calculateRouteCost(params: {
  pickupRegion: string;
  dropoffRegion: string;
  kumasiSubArea?: 'CampusAndEnvirons' | 'Other';
}): number | null {
  const { pickupRegion: from, dropoffRegion: to, kumasiSubArea } = params;
  if (!CPS_CITIES.includes(from) || !CPS_CITIES.includes(to)) return null;

  if (from === to) {
    return from === 'Kumasi' && kumasiSubArea === 'CampusAndEnvirons'
      ? KUMASI_RATES.CampusAndEnvirons
      : SAME_CITY_RATE;
  }
  if (from === 'Kumasi') return DELIVERY_RATES[to]!;
  if (to === 'Kumasi') return DELIVERY_RATES[from]!;
  return Math.max(DELIVERY_RATES[from]!, DELIVERY_RATES[to]!);
}
