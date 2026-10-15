import { beforeAll, describe, expect, it } from 'vitest';
import { calculateRouteCost } from '../server/lib/pricing';
import { priceWithRateCard, sizedFee, type RateCardTerms } from '../server/lib/rateCard';
import { as, createApp, createBusiness, createUser, prisma, withKey, type TestBusiness, type TestUser } from './helpers/fixtures';

const app = createApp();

const TERMS: RateCardTerms = {
  sizeKumasiPrices: { standard: 35, medium: 70, big: 100, big_plus: 150 },
  roundTo: 5,
  outskirtsFee: 10,
  outskirtsAreas: [{ name: 'Test outskirts', latitude: 6.8, longitude: -1.55, radiusKm: 3 }],
  expressMultiplier: 2,
  extraPickupFee: 15,
  extraPickupRadiusKm: 3,
};
const IN_OUTSKIRTS = { latitude: 6.801, longitude: -1.551 };
const ADUM = { latitude: 6.693, longitude: -1.623 };

describe('rate card pricing', () => {
  it.each([
    // route,                       standard, medium, big, big+
    ['Kumasi (rest of city)', 35, 35, 70, 100, 150],
    ['KNUST campus area', 20, 20, 40, 60, 90],
    ['Kumasi → Accra', 45, 45, 90, 130, 195],
    ['Kumasi → Tamale', 60, 60, 120, 175, 260],
  ])('%s: sizes scale from the Kumasi prices, rounded up to ₵5', (_route, routeFee, ...expected) => {
    expect((['standard', 'medium', 'big', 'big_plus'] as const).map(s => sizedFee(TERMS, routeFee, s))).toEqual(expected);
  });

  it('adds the outskirts fee once, then doubles for express', () => {
    const price = priceWithRateCard(TERMS, { routeFee: 35, sizeCategory: 'medium', express: true, pickup: IN_OUTSKIRTS, dropoff: IN_OUTSKIRTS });
    expect(price).toMatchObject({ sizeFee: 70, outskirtsFee: 10, outskirtsArea: 'Test outskirts', fee: 160 });
  });

  it('charges no outskirts fee inside the city', () => {
    expect(priceWithRateCard(TERMS, { routeFee: 35, pickup: ADUM, dropoff: ADUM })).toMatchObject({ fee: 35, outskirtsFee: 0 });
  });
});

let shopyos: TestBusiness;
let other: TestBusiness;
let ops: TestUser;
let ref = 0;

beforeAll(async () => {
  [shopyos, other, ops] = await Promise.all([createBusiness(), createBusiness(), createUser('operations')]);
  const card = await as(app, ops).put(`/api/admin/businesses/${shopyos.businessId}/rate-card`, { outskirtsAreas: TERMS.outskirtsAreas });
  expect(card.status).toBe(200);
});

function body(overrides: Record<string, unknown> = {}) {
  return {
    externalReference: `rc-${++ref}`,
    pickup: { name: 'Ama Store', phone: '+233200001000', region: 'Kumasi', location: 'Adum', ...ADUM },
    dropoff: { name: 'Kofi', phone: '+233200001001', region: 'Kumasi', location: 'Bantama', latitude: 6.705, longitude: -1.635 },
    expectedFee: 35,
    ...overrides,
  };
}

describe('Partner API with a rate card', () => {
  it('prices by size, outskirts and express, and saves how', async () => {
    const res = await withKey(app, shopyos.apiKey).post('/api/partner/v1/shipments', body({
      package: { sizeCategory: 'big' },
      dropoff: { name: 'Kofi', phone: '+233200001001', region: 'Kumasi', location: 'Outskirts', ...IN_OUTSKIRTS },
      speed: 'express',
      expectedFee: 220, // (100 + 10) × 2
    }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      fee: { amount: 220 },
      package: { size: 'big', sizeCategory: 'big' },
      priceBreakdown: { routeFee: 35, sizeCategory: 'big', outskirtsFee: 10, express: true },
    });
    const saved = await prisma.shipment.findUniqueOrThrow({ where: { trackingCode: res.body.trackingCode } });
    expect(saved.rateCardTerms).toMatchObject({ expressMultiplier: 2, sizeKumasiPrices: { big: 100 } });
  });

  it("refuses a fee that doesn't match the size price", async () => {
    const res = await withKey(app, shopyos.apiKey).post('/api/partner/v1/shipments', body({ package: { sizeCategory: 'medium' }, expectedFee: 35 }));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'fee_mismatch', details: { fee: 70 } });
  });

  it('keeps the old price when no size or express is sent', async () => {
    const res = await withKey(app, shopyos.apiKey).post('/api/partner/v1/shipments', body({ package: { size: 'medium' } }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ fee: { amount: 35 }, package: { size: 'medium', sizeCategory: 'standard' } });
  });

  it('quotes and lists its own size prices', async () => {
    const q = await withKey(app, shopyos.apiKey).post('/api/partner/v1/quotes', {
      pickupRegion: 'Kumasi', dropoffRegion: 'Accra', sizeCategory: 'big_plus', speed: 'express',
    });
    expect(q.body).toMatchObject({ serviceable: true, fee: 390, breakdown: { sizeFee: 195, express: true } });

    const cov = await withKey(app, shopyos.apiKey).get('/api/partner/v1/coverage');
    expect(cov.body.rateCard).toMatchObject({ outskirtsFee: 10, expressMultiplier: 2 });
    const accra = cov.body.routes.find((r: { pickupRegion: string; dropoffRegion: string }) => r.pickupRegion === 'Kumasi' && r.dropoffRegion === 'Accra');
    expect(accra.sizeFees).toEqual({ standard: 45, medium: 90, big: 130, big_plus: 195 });
  });
});

describe('businesses without a rate card', () => {
  it('pay standard prices whatever size, speed or location they send', async () => {
    const res = await withKey(app, other.apiKey).post('/api/partner/v1/shipments', body({
      package: { sizeCategory: 'big_plus', size: 'small' },
      dropoff: { name: 'Kofi', phone: '+233200001001', region: 'Kumasi', location: 'Outskirts', ...IN_OUTSKIRTS },
      speed: 'express',
      expectedFee: 35,
    }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ fee: { amount: 35 }, package: { size: 'small', sizeCategory: null }, priceBreakdown: null });

    const q = await withKey(app, other.apiKey).post('/api/partner/v1/quotes', { pickupRegion: 'Kumasi', dropoffRegion: 'Accra', sizeCategory: 'big', speed: 'express' });
    expect(q.body).toEqual({ serviceable: true, fee: 45, currency: 'GHS', pickupRegion: 'Kumasi', dropoffRegion: 'Accra' });

    const cov = await withKey(app, other.apiKey).get('/api/partner/v1/coverage');
    expect(cov.body.rateCard).toBeUndefined();
    expect(cov.body.routes[0].sizeFees).toBeUndefined();
  });

  it('standard route prices are unchanged', () => {
    expect(calculateRouteCost({ pickupRegion: 'Kumasi', dropoffRegion: 'Kumasi' })).toBe(35);
    expect(calculateRouteCost({ pickupRegion: 'Kumasi', dropoffRegion: 'Accra' })).toBe(45);
  });
});

describe('ops correct the parcel size', () => {
  it('reprices from the booked terms, keeps the original fee and notifies the business', async () => {
    const created = await withKey(app, shopyos.apiKey).post('/api/partner/v1/shipments', body({ package: { sizeCategory: 'medium' }, expectedFee: 70 }));
    const shipment = await prisma.shipment.findUniqueOrThrow({ where: { trackingCode: created.body.trackingCode } });

    // Later edits to the rate card don't change booked deliveries.
    await as(app, ops).put(`/api/admin/businesses/${shopyos.businessId}/rate-card`, { bigKumasiPrice: 120 });

    const res = await as(app, ops).patch(`/api/shipments/${shipment.id}/size`, { sizeCategory: 'big', note: 'Weighed 11 kg' });
    expect(res.status).toBe(200);
    expect(Number(res.body.deliveryFee)).toBe(100);
    expect(Number(res.body.originalFee)).toBe(70);

    const partnerView = await withKey(app, shopyos.apiKey).get(`/api/partner/v1/shipments/${created.body.externalReference}`);
    expect(partnerView.body.sizeCorrection).toMatchObject({ originalFee: 70, fee: 100, sizeCategory: 'big' });
    const event = await prisma.webhookEvent.findFirst({ where: { shipmentId: shipment.id, type: 'shipment.size_corrected' } });
    expect(event).not.toBeNull();

    await as(app, ops).put(`/api/admin/businesses/${shopyos.businessId}/rate-card`, { bigKumasiPrice: 100 });
  });

  it("refuses deliveries that weren't priced by size", async () => {
    const created = await withKey(app, other.apiKey).post('/api/partner/v1/shipments', body());
    const shipment = await prisma.shipment.findUniqueOrThrow({ where: { trackingCode: created.body.trackingCode } });
    expect((await as(app, ops).patch(`/api/shipments/${shipment.id}/size`, { sizeCategory: 'big' })).status).toBe(409);
  });
});

describe('rate card admin', () => {
  it('shows the terms with example prices, and is staff-only', async () => {
    const res = await as(app, ops).get(`/api/admin/businesses/${shopyos.businessId}/rate-card`);
    expect(res.body).toMatchObject({ enabled: true, outskirtsFee: 10, examples: [{ route: 'Kumasi → Kumasi', big: 100 }, { route: 'Kumasi → Accra', big: 130 }] });
    expect((await as(app, ops).get(`/api/admin/businesses/${other.businessId}/rate-card`)).body).toBeNull();
    expect((await as(app, shopyos).get(`/api/admin/businesses/${shopyos.businessId}/rate-card`)).status).toBe(403);
    expect((await as(app, ops).put(`/api/admin/businesses/${shopyos.businessId}/rate-card`, { expressMultiplier: 0.5 })).status).toBe(400);
  });
});
