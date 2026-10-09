import { CPS_CITIES, KUMASI_RATES, calculateRouteCost } from './pricing';

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

/** Every priced route, so partners can price locally from a cached copy. */
function routes() {
  const rows: { pickupRegion: string; dropoffRegion: string; kumasiSubArea: string | null; fee: number }[] = [];
  for (const from of pickupZones()) {
    for (const to of CPS_CITIES) {
      if (from === 'Kumasi' && to === 'Kumasi') {
        for (const subArea of Object.keys(KUMASI_RATES) as (keyof typeof KUMASI_RATES)[]) {
          rows.push({ pickupRegion: from, dropoffRegion: to, kumasiSubArea: subArea, fee: calculateRouteCost({ pickupRegion: from, dropoffRegion: to, kumasiSubArea: subArea })! });
        }
      } else {
        rows.push({ pickupRegion: from, dropoffRegion: to, kumasiSubArea: null, fee: calculateRouteCost({ pickupRegion: from, dropoffRegion: to })! });
      }
    }
  }
  return rows;
}

export function coverage() {
  return {
    currency: 'GHS',
    pickupRegions: pickupZones(),
    dropoffRegions: [...CPS_CITIES],
    kumasiSubAreas: (Object.keys(KUMASI_RATES) as (keyof typeof KUMASI_RATES)[]).map(subArea => ({
      kumasiSubArea: subArea,
      description: KUMASI_SUB_AREA_LABELS[subArea],
    })),
    routes: routes(),
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

  return { serviceable: true, fee, currency: 'GHS', pickupRegion, dropoffRegion };
}
