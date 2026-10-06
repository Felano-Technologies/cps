import { DELIVERY_RATES, KUMASI_RATES, calculateDeliveryCost } from './pricing';

/**
 * Regions CPS riders collect from. CPS is based in Kumasi; add a region here
 * (or via CPS_PICKUP_ZONES="Kumasi,Accra") once riders operate there.
 */
export function pickupZones(): string[] {
  const fromEnv = process.env.CPS_PICKUP_ZONES?.split(',').map(z => z.trim()).filter(Boolean);
  return fromEnv?.length ? fromEnv : ['Kumasi'];
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

const DROPOFF_REGIONS = ['Kumasi', ...Object.keys(DELIVERY_RATES)];

export function coverage() {
  return {
    currency: 'GHS',
    pickupRegions: pickupZones(),
    dropoffRegions: [
      ...(Object.keys(KUMASI_RATES) as (keyof typeof KUMASI_RATES)[]).map(subArea => ({
        region: 'Kumasi',
        kumasiSubArea: subArea,
        description: KUMASI_SUB_AREA_LABELS[subArea],
        fee: KUMASI_RATES[subArea],
      })),
      ...Object.entries(DELIVERY_RATES).map(([region, fee]) => ({ region, kumasiSubArea: null, description: null, fee })),
    ],
    operatingHours: OPERATING_HOURS,
  };
}

export type QuoteResult =
  | { serviceable: true; fee: number; currency: 'GHS'; pickupRegion: string; dropoffRegion: string }
  | { serviceable: false; reason: 'pickup_region_not_served' | 'dropoff_region_not_served'; message: string };

/** Binding price for a partner delivery. Region names are matched case-insensitively. */
export function quote(input: {
  pickupRegion: string;
  dropoffRegion: string;
  dropoffKumasiSubArea?: 'CampusAndEnvirons' | 'Other';
}): QuoteResult {
  const pickupRegion = canonicalRegion(input.pickupRegion, pickupZones());
  if (!pickupRegion) {
    return {
      serviceable: false,
      reason: 'pickup_region_not_served',
      message: `CPS does not collect from "${input.pickupRegion}". Pickup regions: ${pickupZones().join(', ')}.`,
    };
  }

  const dropoffRegion = canonicalRegion(input.dropoffRegion, DROPOFF_REGIONS);
  const fee = dropoffRegion
    ? calculateDeliveryCost({ region: dropoffRegion, kumasiSubArea: input.dropoffKumasiSubArea })
    : null;
  if (!dropoffRegion || fee === null) {
    return {
      serviceable: false,
      reason: 'dropoff_region_not_served',
      message: `CPS does not deliver to "${input.dropoffRegion}". Delivery regions: ${DROPOFF_REGIONS.join(', ')}.`,
    };
  }

  return { serviceable: true, fee, currency: 'GHS', pickupRegion, dropoffRegion };
}
