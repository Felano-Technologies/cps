import { CPS_CITIES, KUMASI_RATES, calculateRouteCost } from './pricing';
import {
  SIZE_CATEGORIES, priceWithRateCard, rateCardView, sizedFee,
  type Point, type RateCardPrice, type RateCardTerms, type SizeCategory,
} from './rateCard';

/**
 * Cities CPS riders collect from. CPS has people in every city it delivers
 * to, so by default that's all of them. Override with
 * CPS_PICKUP_ZONES="Kumasi,Accra" to narrow it.
 */
export function pickupZones(): string[] {
  const fromEnv = process.env.CPS_PICKUP_ZONES?.split(',').map(z => z.trim()).filter(Boolean);
  return fromEnv?.length ? fromEnv : [...CPS_CITIES];
}

export const OPERATING_HOURS = {
  timezone: 'Africa/Accra',
  /** When the API accepts requests. Outside this window requests fail to connect. */
  api: { days: 'Mon-Sun', open: '05:00', close: '20:00' },
  /** When riders collect and deliver. Orders created later are handled next working day. */
  riders: { days: 'Mon-Sat', open: '08:00', close: '19:30' },
};

const KUMASI_SUB_AREA_LABELS: Record<keyof typeof KUMASI_RATES, string> = {
  CampusAndEnvirons: 'KNUST campus, Ayeduase, Ayigya, Bomso, Kotei',
  Other: 'Rest of Kumasi',
};

function canonicalRegion(region: string, known: string[]): string | null {
  const wanted = region.trim().toLowerCase();
  return known.find(k => k.toLowerCase() === wanted) ?? null;
}

type RouteRow = {
  pickupRegion: string;
  dropoffRegion: string;
  kumasiSubArea: string | null;
  fee: number;
  /** Rate-card businesses only: the fee for each parcel size (before outskirts and express). */
  sizeFees?: Record<SizeCategory, number>;
};

/** Every priced route, so partners can price locally from a cached copy. */
function routes(terms: RateCardTerms | null) {
  const rows: RouteRow[] = [];
  const row = (pickupRegion: string, dropoffRegion: string, kumasiSubArea: keyof typeof KUMASI_RATES | null) => {
    const fee = calculateRouteCost({ pickupRegion, dropoffRegion, kumasiSubArea: kumasiSubArea ?? undefined })!;
    rows.push({
      pickupRegion, dropoffRegion, kumasiSubArea, fee,
      ...(terms ? { sizeFees: Object.fromEntries(SIZE_CATEGORIES.map(s => [s, sizedFee(terms, fee, s)])) as Record<SizeCategory, number> } : {}),
    });
  };
  for (const from of pickupZones()) {
    for (const to of CPS_CITIES) {
      if (from === 'Kumasi' && to === 'Kumasi') {
        for (const subArea of Object.keys(KUMASI_RATES) as (keyof typeof KUMASI_RATES)[]) row(from, to, subArea);
      } else {
        row(from, to, null);
      }
    }
  }
  return rows;
}

/** The price list. A business with a rate card also gets its sizes, outer areas and express terms. */
export function coverage(terms: RateCardTerms | null = null) {
  return {
    currency: 'GHS',
    pickupRegions: pickupZones(),
    dropoffRegions: [...CPS_CITIES],
    kumasiSubAreas: (Object.keys(KUMASI_RATES) as (keyof typeof KUMASI_RATES)[]).map(subArea => ({
      kumasiSubArea: subArea,
      description: KUMASI_SUB_AREA_LABELS[subArea],
    })),
    routes: routes(terms),
    ...(terms ? { rateCard: rateCardView(terms) } : {}),
    operatingHours: OPERATING_HOURS,
  };
}

export type QuoteResult =
  | {
      serviceable: true; fee: number; currency: 'GHS'; pickupRegion: string; dropoffRegion: string;
      /** Rate-card businesses only: how the fee was worked out. */
      breakdown?: RateCardPrice;
    }
  | { serviceable: false; reason: 'pickup_region_not_served' | 'dropoff_region_not_served'; message: string };

/**
 * Binding price for a partner delivery. Region names are matched
 * case-insensitively. Size, express and map pins only change the price for
 * a business with a rate card; everyone else pays the route price.
 */
export function quote(input: {
  pickupRegion: string;
  dropoffRegion: string;
  dropoffKumasiSubArea?: 'CampusAndEnvirons' | 'Other';
  sizeCategory?: SizeCategory;
  express?: boolean;
  pickup?: Point | null;
  dropoff?: Point | null;
}, terms: RateCardTerms | null = null): QuoteResult {
  const pickupRegion = canonicalRegion(input.pickupRegion, pickupZones());
  if (!pickupRegion) {
    return {
      serviceable: false,
      reason: 'pickup_region_not_served',
      message: `CPS does not collect from "${input.pickupRegion}". Pickup regions: ${pickupZones().join(', ')}.`,
    };
  }

  const dropoffRegion = canonicalRegion(input.dropoffRegion, CPS_CITIES);
  const fee = dropoffRegion
    ? calculateRouteCost({ pickupRegion, dropoffRegion, kumasiSubArea: input.dropoffKumasiSubArea })
    : null;
  if (!dropoffRegion || fee === null) {
    return {
      serviceable: false,
      reason: 'dropoff_region_not_served',
      message: `CPS does not deliver to "${input.dropoffRegion}". Delivery regions: ${CPS_CITIES.join(', ')}.`,
    };
  }

  if (!terms) return { serviceable: true, fee, currency: 'GHS', pickupRegion, dropoffRegion };

  const breakdown = priceWithRateCard(terms, {
    routeFee: fee, sizeCategory: input.sizeCategory, express: input.express, pickup: input.pickup, dropoff: input.dropoff,
  });
  return { serviceable: true, fee: breakdown.fee, currency: 'GHS', pickupRegion, dropoffRegion, breakdown };
}
