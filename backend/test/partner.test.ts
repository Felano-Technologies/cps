import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { deliverDueWebhooks, deliverWebhookEvent, signWebhook, verifyWebhookSignature } from '../server/lib/webhooks';
import {
  as,
  createApp,
  createBusiness,
  createUser,
  prisma,
  withKey,
  type TestBusiness,
  type TestUser,
} from './helpers/fixtures';

const app = createApp();

let shop: TestBusiness;
let ops: TestUser;
let rider: TestUser;

beforeAll(async () => {
  [shop, ops, rider] = await Promise.all([createBusiness(), createUser('operations'), createUser('rider')]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

let refCounter = 0;
function shipmentBody(overrides: Record<string, unknown> = {}) {
  return {
    externalReference: `order-${++refCounter}`,
    pickup: { name: 'Ama Store', phone: '+233200001000', region: 'Kumasi', location: 'Adum, shop 12' },
    dropoff: { name: 'Kofi', phone: '+233200001001', region: 'Accra', location: 'Osu, Oxford St' },
    expectedFee: 45,
    ...overrides,
  };
}

async function createPartnerShipment(overrides: Record<string, unknown> = {}, business = shop) {
  const res = await withKey(app, business.apiKey).post('/api/partner/v1/shipments', shipmentBody(overrides));
  expect(res.status).toBe(201);
  return res.body;
}

async function internalShipment(trackingCode: string) {
  return prisma.shipment.findUniqueOrThrow({ where: { trackingCode } });
}

describe('authentication', () => {
  it('rejects missing, malformed and unknown keys', async () => {
    const request = (await import('supertest')).default;
    expect((await request(app).get('/api/partner/v1/coverage')).status).toBe(401);
    expect((await withKey(app, 'not-a-key').get('/api/partner/v1/coverage')).status).toBe(401);
    const unknown = await withKey(app, 'cps_live_doesnotexist').get('/api/partner/v1/coverage');
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.code).toBe('unauthorized');
  });

  it('rejects keys of unapproved or suspended businesses', async () => {
    const pending = await createBusiness({ status: 'pending' });
    const res = await withKey(app, pending.apiKey).get('/api/partner/v1/coverage');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('forbidden');
  });

  it('rejects revoked keys', async () => {
    const biz = await createBusiness();
    await prisma.apiKey.updateMany({ where: { businessId: biz.businessId }, data: { revokedAt: new Date() } });
    expect((await withKey(app, biz.apiKey).get('/api/partner/v1/coverage')).status).toBe(401);
  });
});

describe('coverage and quotes', () => {
  it('lists pickup regions and dropoff fees', async () => {
    const res = await withKey(app, shop.apiKey).get('/api/partner/v1/coverage');
    expect(res.status).toBe(200);
    expect(res.body.pickupRegions).toEqual(['Kumasi']);
    expect(res.body.dropoffRegions).toEqual(expect.arrayContaining([
      expect.objectContaining({ region: 'Accra', fee: 45 }),
      expect.objectContaining({ region: 'Kumasi', kumasiSubArea: 'CampusAndEnvirons', fee: 20 }),
    ]));
  });

  it('quotes served routes case-insensitively', async () => {
    const res = await withKey(app, shop.apiKey).post('/api/partner/v1/quotes', { pickupRegion: 'kumasi', dropoffRegion: 'ACCRA' });
    expect(res.body).toMatchObject({ serviceable: true, fee: 45, currency: 'GHS', dropoffRegion: 'Accra' });
  });

  it('reports pickups outside CPS pickup zones as not serviceable', async () => {
    const res = await withKey(app, shop.apiKey).post('/api/partner/v1/quotes', { pickupRegion: 'Accra', dropoffRegion: 'Kumasi' });
    expect(res.body).toMatchObject({ serviceable: false, reason: 'pickup_region_not_served' });
  });

  it('reports unknown drop-off regions as not serviceable', async () => {
    const res = await withKey(app, shop.apiKey).post('/api/partner/v1/quotes', { pickupRegion: 'Kumasi', dropoffRegion: 'Ho' });
    expect(res.body).toMatchObject({ serviceable: false, reason: 'dropoff_region_not_served' });
  });
});

describe('creating shipments', () => {
  it('creates a prepaid pending shipment with the quoted fee', async () => {
    const body = await createPartnerShipment({ deliveryCode: '482913' });
    expect(body).toMatchObject({
      status: 'pending',
      fee: { amount: 45, currency: 'GHS' },
      deliveryCodeRequired: true,
      rider: null,
    });
    expect(body.trackingCode).toMatch(/^CPS-/);
    expect(body).not.toHaveProperty('id');

    const stored = await internalShipment(body.trackingCode);
    expect(stored).toMatchObject({ prepaid: true, businessId: shop.businessId, status: 'pending' });
    expect(stored.deliveryCodeHash).toBeTruthy();
    expect(stored.deliveryCodeHash).not.toContain('482913');
  });

  it('is idempotent on externalReference', async () => {
    const payload = shipmentBody();
    const first = await withKey(app, shop.apiKey).post('/api/partner/v1/shipments', payload);
    const second = await withKey(app, shop.apiKey).post('/api/partner/v1/shipments', payload);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.trackingCode).toBe(first.body.trackingCode);
    expect(await prisma.shipment.count({ where: { externalReference: payload.externalReference } })).toBe(1);
  });

  it('lets two businesses use the same externalReference', async () => {
    const other = await createBusiness();
    const a = await createPartnerShipment({ externalReference: 'shared-ref' });
    const b = await createPartnerShipment({ externalReference: 'shared-ref' }, other);
    expect(a.trackingCode).not.toBe(b.trackingCode);
  });

  it('rejects a fee that does not match the current price', async () => {
    const res = await withKey(app, shop.apiKey).post('/api/partner/v1/shipments', shipmentBody({ expectedFee: 30 }));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'fee_mismatch', details: { fee: 45 } });
  });

  it('rejects routes CPS does not serve', async () => {
    const res = await withKey(app, shop.apiKey).post('/api/partner/v1/shipments', shipmentBody({
      pickup: { name: 'Accra Shop', phone: '+233200001002', region: 'Accra', location: 'Osu' },
    }));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('not_serviceable');
  });

  it('returns field-level validation errors', async () => {
    const res = await withKey(app, shop.apiKey).post('/api/partner/v1/shipments', shipmentBody({ deliveryCode: '12ab' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_request');
    expect(res.body.error.details[0].path).toBe('deliveryCode');
  });

  it('prices Kumasi campus deliveries at the campus rate', async () => {
    const body = await createPartnerShipment({
      dropoff: { name: 'Esi', phone: '+233200001003', region: 'Kumasi', location: 'Ayeduase', kumasiSubArea: 'CampusAndEnvirons' },
      expectedFee: 20,
    });
    expect(body.fee.amount).toBe(20);
  });

  it('answers invalid JSON with the partner error shape', async () => {
    const request = (await import('supertest')).default;
    const res = await request(app)
      .post('/api/partner/v1/shipments')
      .set('Authorization', `Bearer ${shop.apiKey}`)
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_request');
  });
});

describe('reading shipments', () => {
  it('looks up by external reference or tracking code, only within the business', async () => {
    const created = await createPartnerShipment();
    const byRef = await withKey(app, shop.apiKey).get(`/api/partner/v1/shipments/${created.externalReference}`);
    const byCode = await withKey(app, shop.apiKey).get(`/api/partner/v1/shipments/${created.trackingCode}`);
    expect(byRef.body.trackingCode).toBe(created.trackingCode);
    expect(byCode.body.externalReference).toBe(created.externalReference);

    const stranger = await createBusiness();
    expect((await withKey(app, stranger.apiKey).get(`/api/partner/v1/shipments/${created.trackingCode}`)).status).toBe(404);
  });

  it('pages through updates with a cursor', async () => {
    const biz = await createBusiness();
    for (let i = 0; i < 3; i++) await createPartnerShipment({}, biz);

    const first = await withKey(app, biz.apiKey).get('/api/partner/v1/shipments?limit=2');
    expect(first.body.data).toHaveLength(2);
    expect(first.body.nextCursor).toBeTruthy();

    const second = await withKey(app, biz.apiKey).get(`/api/partner/v1/shipments?limit=2&cursor=${first.body.nextCursor}`);
    expect(second.body.data).toHaveLength(1);
    expect(second.body.nextCursor).toBeNull();

    const seen = [...first.body.data, ...second.body.data].map((s: { trackingCode: string }) => s.trackingCode);
    expect(new Set(seen).size).toBe(3);
  });
});

describe('cancelling', () => {
  it('cancels before pickup and refuses after', async () => {
    const before = await createPartnerShipment();
    const res = await withKey(app, shop.apiKey).post(`/api/partner/v1/shipments/${before.externalReference}/cancel`, { reason: 'Buyer changed mind' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'cancelled', cancellationReason: 'Buyer changed mind' });

    const after = await createPartnerShipment();
    await prisma.shipment.update({ where: { trackingCode: after.trackingCode }, data: { status: 'picked_up' } });
    const refused = await withKey(app, shop.apiKey).post(`/api/partner/v1/shipments/${after.trackingCode}/cancel`);
    expect(refused.status).toBe(409);
  });
});

describe('ops on partner shipments', () => {
  it('cannot change the fee of a prepaid order', async () => {
    const created = await createPartnerShipment();
    const s = await internalShipment(created.trackingCode);
    const res = await as(app, ops).patch(`/api/shipments/${s.id}/price`, { deliveryFee: 60 });
    expect(res.status).toBe(409);
  });

  it('cannot mark a coded order delivered without the code', async () => {
    const created = await createPartnerShipment({ deliveryCode: '1234' });
    const s = await internalShipment(created.trackingCode);
    const res = await as(app, ops).patch(`/api/shipments/${s.id}/status`, { status: 'delivered' });
    expect(res.status).toBe(409);
  });

  it('can override the code with an audited note', async () => {
    const created = await createPartnerShipment({ deliveryCode: '1234' });
    const s = await internalShipment(created.trackingCode);
    const res = await as(app, ops).patch(`/api/shipments/${s.id}/delivery-code-override`, { note: 'Customer lost SMS, confirmed by phone' });
    expect(res.status).toBe(200);
    expect(res.body.deliveryCodeOverrideNote).toContain('Customer lost SMS');
    expect((await as(app, ops).patch(`/api/shipments/${s.id}/status`, { status: 'delivered' })).status).toBe(200);
  });
});

describe('delivery code at proof of delivery', () => {
  const pod = { podMethod: 'photo', podRecipientName: 'Kofi', podPhotoUrl: 'https://img.test/pod.jpg' };

  async function assignedCodedShipment() {
    const created = await createPartnerShipment({ deliveryCode: '482913' });
    const s = await internalShipment(created.trackingCode);
    await prisma.shipment.update({
      where: { id: s.id },
      data: { dropoffRiderId: rider.riderProfileId, assignedRiderId: rider.riderProfileId, status: 'out_for_delivery' },
    });
    return s;
  }

  it('requires the code, rejects wrong ones, and accepts the right one', async () => {
    const s = await assignedCodedShipment();

    const missing = await as(app, rider).patch(`/api/shipments/${s.id}/pod`, pod);
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe('delivery_code_required');

    const wrong = await as(app, rider).patch(`/api/shipments/${s.id}/pod`, { ...pod, deliveryCode: '000000' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error).toContain('4 attempts left');

    const right = await as(app, rider).patch(`/api/shipments/${s.id}/pod`, { ...pod, deliveryCode: '482913' });
    expect(right.status).toBe(200);
    expect(right.body.status).toBe('delivered');
    expect(right.body.deliveryCodeVerifiedAt).toBeTruthy();
  });

  it('locks after five wrong codes', async () => {
    const s = await assignedCodedShipment();
    for (let i = 0; i < 4; i++) {
      expect((await as(app, rider).patch(`/api/shipments/${s.id}/pod`, { ...pod, deliveryCode: '111111' })).status).toBe(400);
    }
    const fifth = await as(app, rider).patch(`/api/shipments/${s.id}/pod`, { ...pod, deliveryCode: '111111' });
    expect(fifth.status).toBe(423);
    const afterLock = await as(app, rider).patch(`/api/shipments/${s.id}/pod`, { ...pod, deliveryCode: '482913' });
    expect(afterLock.status).toBe(423);
  });
});

describe('webhooks', () => {
  it('queues an event for each change of a partner shipment', async () => {
    const created = await createPartnerShipment();
    const s = await internalShipment(created.trackingCode);

    await as(app, ops).patch(`/api/shipments/${s.id}/assign`, { pickupRiderId: rider.riderProfileId });
    await as(app, rider).patch(`/api/shipments/${s.id}/status`, { status: 'picked_up' });

    const events = await prisma.webhookEvent.findMany({ where: { shipmentId: s.id }, orderBy: { sequence: 'asc' } });
    expect(events.map(e => e.type)).toEqual(['shipment.created', 'shipment.rider_assigned', 'shipment.status_changed']);
    const last = events.at(-1)!.payload as { shipment: { status: string; rider: { name: string } } };
    expect(last.shipment.status).toBe('picked_up');
    expect(last.shipment.rider?.name).toBeTruthy();
  });

  it('queues nothing for businesses without a webhook URL', async () => {
    const quiet = await createBusiness({ webhookUrl: null });
    const created = await createPartnerShipment({}, quiet);
    const s = await internalShipment(created.trackingCode);
    expect(await prisma.webhookEvent.count({ where: { shipmentId: s.id } })).toBe(0);
  });

  it('delivers signed events and retries failures with backoff', async () => {
    const biz = await createBusiness();
    const created = await createPartnerShipment({}, biz);
    const event = await prisma.webhookEvent.findFirstOrThrow({ where: { businessId: biz.businessId } });

    const fetchMock = vi.fn(async () => new Response('nope', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await deliverWebhookEvent(event.id)).toBe(false);

    const failed = await prisma.webhookEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(failed).toMatchObject({ attempts: 1, lastStatusCode: 500, deliveredAt: null, failedAt: null });
    expect(failed.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 30_000);

    fetchMock.mockImplementation(async () => new Response('ok', { status: 200 }));
    expect(await deliverWebhookEvent(event.id)).toBe(true);

    const [, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const body = init.body as string;
    expect(headers['CPS-Event-Id']).toBe(event.id);
    expect(verifyWebhookSignature(biz.webhookSecret, body, headers['CPS-Signature']!)).toBe(true);
    expect(JSON.parse(body)).toMatchObject({ id: event.id, type: 'shipment.created', data: { shipment: { trackingCode: created.trackingCode } } });

    const delivered = await prisma.webhookEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(delivered.deliveredAt).toBeTruthy();
  });

  it('gives up after the retry schedule is exhausted', async () => {
    const biz = await createBusiness();
    await createPartnerShipment({}, biz);
    const event = await prisma.webhookEvent.findFirstOrThrow({ where: { businessId: biz.businessId } });
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { attempts: 7 } });

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connect ECONNREFUSED'); }));
    await deliverWebhookEvent(event.id);
    const dead = await prisma.webhookEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(dead.failedAt).toBeTruthy();
    expect(dead.lastError).toContain('ECONNREFUSED');
  });

  it('the worker only sends events that are due', async () => {
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await prisma.webhookEvent.updateMany({ where: { deliveredAt: null }, data: { nextAttemptAt: new Date(Date.now() + 3600_000) } });
    const biz = await createBusiness();
    await createPartnerShipment({}, biz);

    const sent = await deliverDueWebhooks();
    expect(sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects tampered or stale signatures', () => {
    const body = '{"a":1}';
    const header = signWebhook('whsec_x', body);
    expect(verifyWebhookSignature('whsec_x', body, header)).toBe(true);
    expect(verifyWebhookSignature('whsec_x', '{"a":2}', header)).toBe(false);
    expect(verifyWebhookSignature('whsec_y', body, header)).toBe(false);
    const stale = signWebhook('whsec_x', body, Math.floor(Date.now() / 1000) - 3600);
    expect(verifyWebhookSignature('whsec_x', body, stale)).toBe(false);
  });
});

describe('business accounts on internal routes', () => {
  it('cannot list, read or cancel internal shipments', async () => {
    const created = await createPartnerShipment();
    const s = await internalShipment(created.trackingCode);

    const list = await as(app, shop).get('/api/shipments');
    expect(list.body).toEqual([]);
    expect((await as(app, shop).get(`/api/shipments/${s.trackingCode}`)).status).toBe(404);
    expect((await as(app, shop).patch(`/api/shipments/${s.id}/cancel`, {})).status).toBe(403);
  });
});
