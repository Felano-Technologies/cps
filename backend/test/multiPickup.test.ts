import { beforeAll, describe, expect, it } from 'vitest';
import { pickupsTooFar, priceWithRateCard, repriceForSize, type RateCardTerms } from '../server/lib/rateCard';
import { as, createApp, createBusiness, createUser, prisma, withKey, type TestBusiness, type TestUser } from './helpers/fixtures';

const app = createApp();

const TERMS: RateCardTerms = {
  sizeKumasiPrices: { standard: 35, medium: 70, big: 100, big_plus: 150 },
  roundTo: 5,
  outskirtsFee: 10,
  outskirtsAreas: [],
  expressMultiplier: 2,
  extraPickupFee: 15,
  extraPickupRadiusKm: 3,
};

// Kumasi pins: Adum → Kejetia is ~1 km, Adum → KNUST is ~7 km.
const ADUM = { latitude: 6.693, longitude: -1.623 };
const KEJETIA = { latitude: 6.6985, longitude: -1.6194 };
const BANTAMA = { latitude: 6.705, longitude: -1.635 };
const KNUST = { latitude: 6.6745, longitude: -1.5716 };

describe('multi-pickup pricing', () => {
  it('first shop full price, each extra nearby shop a flat fee', () => {
    expect(priceWithRateCard(TERMS, { routeFee: 35, pickup: ADUM, extraPickups: [KEJETIA] }))
      .toMatchObject({ fee: 50, sizeFee: 35, extraPickups: 1, extraPickupsFee: 15 });
    expect(priceWithRateCard(TERMS, { routeFee: 35, pickup: ADUM, extraPickups: [KEJETIA, BANTAMA] }))
      .toMatchObject({ fee: 65, extraPickups: 2, extraPickupsFee: 30 });
  });

  it("express doubles the trip but not the extra shops' fee", () => {
    expect(priceWithRateCard(TERMS, { routeFee: 35, express: true, pickup: ADUM, extraPickups: [KEJETIA] }))
      .toMatchObject({ fee: 85 }); // 35 × 2 + 15
  });

  it('flags shops that are too far, or have no pin', () => {
    expect(pickupsTooFar(TERMS, ADUM, [KEJETIA, KNUST, null])).toEqual([1, 2]);
    expect(pickupsTooFar(TERMS, null, [KEJETIA])).toEqual([0]);
  });

  it('a size correction keeps the extra shops as booked', () => {
    expect(repriceForSize(TERMS, { routeFee: 35, outskirtsFee: 0, express: false, extraPickupsFee: 15 }, 'big')).toBe(115);
  });
});

let shopyos: TestBusiness;
let other: TestBusiness;
let ops: TestUser;
let ref = 0;

beforeAll(async () => {
  [shopyos, other, ops] = await Promise.all([createBusiness(), createBusiness(), createUser('operations')]);
  const card = await as(app, ops).put(`/api/admin/businesses/${shopyos.businessId}/rate-card`, { extraPickupFee: 15, extraPickupRadiusKm: 3 });
  expect(card.status).toBe(200);
  expect(card.body).toMatchObject({ extraPickupFee: 15, extraPickupRadiusKm: 3 });
});

const shop = (name: string, pin: { latitude: number; longitude: number }, reference?: string) => ({
  name, phone: '+233200002000', region: 'Kumasi', location: `${name} shop`, ...pin, ...(reference ? { reference } : {}),
});

function body(overrides: Record<string, unknown> = {}) {
  return {
    externalReference: `mp-${++ref}`,
    pickup: shop('Ama Store', ADUM),
    dropoff: { name: 'Kofi', phone: '+233200002001', region: 'Kumasi', location: 'Bantama', ...BANTAMA },
    expectedFee: 50,
    ...overrides,
  };
}

describe('Partner API: one rider, several shops', () => {
  it('quotes the bundle', async () => {
    const q = await withKey(app, shopyos.apiKey).post('/api/partner/v1/quotes', {
      pickupRegion: 'Kumasi', dropoffRegion: 'Kumasi',
      pickupLatitude: ADUM.latitude, pickupLongitude: ADUM.longitude,
      extraPickups: [KEJETIA],
    });
    expect(q.body).toMatchObject({ serviceable: true, fee: 50, breakdown: { extraPickups: 1, extraPickupsFee: 15 } });
  });

  it('books it: every shop is saved, in order, with its own reference', async () => {
    const res = await withKey(app, shopyos.apiKey).post('/api/partner/v1/shipments', body({
      extraPickups: [shop('Kojo Fashion', KEJETIA, 'order-2')],
    }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      fee: { amount: 50 },
      priceBreakdown: { extraPickups: 1, extraPickupsFee: 15 },
      pickups: [
        { sequence: 0, name: 'Ama Store' },
        { sequence: 1, name: 'Kojo Fashion', reference: 'order-2' },
      ],
    });
    const saved = await prisma.shipment.findUniqueOrThrow({
      where: { trackingCode: res.body.trackingCode }, include: { extraPickups: true },
    });
    expect(Number(saved.extraPickupsFee)).toBe(15);
    expect(saved.extraPickups).toHaveLength(1);
    expect(saved.additionalInstructions).toContain('Collect from 2 shops');
  });

  it('refuses shops too far apart, saying which', async () => {
    const res = await withKey(app, shopyos.apiKey).post('/api/partner/v1/shipments', body({
      extraPickups: [shop('Campus Shop', KNUST)],
    }));
    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({ code: 'not_serviceable', details: { reason: 'pickups_too_far', tooFar: [0] } });
  });

  it('refuses a shop in another city', async () => {
    const res = await withKey(app, shopyos.apiKey).post('/api/partner/v1/shipments', body({
      extraPickups: [{ ...shop('Accra Shop', KEJETIA), region: 'Accra' }],
    }));
    expect(res.status).toBe(422);
  });

  it('needs a rate card', async () => {
    const res = await withKey(app, other.apiKey).post('/api/partner/v1/shipments', body({
      extraPickups: [shop('Kojo Fashion', KEJETIA)], expectedFee: 35,
    }));
    expect(res.status).toBe(422);
    expect(res.body.error.details).toMatchObject({ reason: 'multi_pickup_not_available' });
  });

  it('a single-pickup delivery is unchanged (one entry in pickups)', async () => {
    const res = await withKey(app, shopyos.apiKey).post('/api/partner/v1/shipments', body({ expectedFee: 35 }));
    expect(res.status).toBe(201);
    expect(res.body.pickups).toHaveLength(1);
    expect(res.body.priceBreakdown).toMatchObject({ extraPickups: 0, extraPickupsFee: 0 });
  });
});
