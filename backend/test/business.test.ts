import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { as, createApp, createBusiness, createUser, prisma, withKey, type TestBusiness, type TestUser } from './helpers/fixtures';

const app = createApp();

let admin: TestUser;
let shop: TestBusiness;

beforeAll(async () => {
  [admin, shop] = await Promise.all([createUser('admin'), createBusiness()]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('business portal', () => {
  it('is only for business accounts', async () => {
    const customer = await createUser('customer');
    expect((await as(app, customer).get('/api/business/me')).status).toBe(403);
  });

  it('shows the profile with key and shipment counts', async () => {
    const res = await as(app, shop).get('/api/business/me');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'approved', activeKeys: 1 });
  });

  it('creates a key once, then only shows its prefix', async () => {
    const created = await as(app, shop).post('/api/business/keys', { name: 'Production' });
    expect(created.status).toBe(201);
    expect(created.body.key).toMatch(/^cps_live_/);
    expect(created.body.key.startsWith(created.body.prefix)).toBe(true);

    const list = await as(app, shop).get('/api/business/keys');
    const listed = list.body.find((k: { id: string }) => k.id === created.body.id);
    expect(listed).toMatchObject({ name: 'Production', prefix: created.body.prefix });
    expect(listed).not.toHaveProperty('key');
    expect(listed).not.toHaveProperty('keyHash');

    // The new key works against the Partner API
    expect((await withKey(app, created.body.key).get('/api/partner/v1/coverage')).status).toBe(200);
  });

  it('revoking a key stops it working immediately', async () => {
    const created = await as(app, shop).post('/api/business/keys', { name: 'Temp' });
    expect((await as(app, shop).delete(`/api/business/keys/${created.body.id}`)).status).toBe(204);
    expect((await withKey(app, created.body.key).get('/api/partner/v1/coverage')).status).toBe(401);
  });

  it('cannot revoke another business\'s key', async () => {
    const other = await createBusiness();
    const key = await as(app, other).post('/api/business/keys', { name: 'Theirs' });
    expect((await as(app, shop).delete(`/api/business/keys/${key.body.id}`)).status).toBe(404);
  });

  it('does not issue keys until the business is approved', async () => {
    const pending = await createBusiness({ status: 'pending' });
    expect((await as(app, pending).post('/api/business/keys', { name: 'Too early' })).status).toBe(403);
  });

  it('sets the webhook URL and rotates the secret', async () => {
    const set = await as(app, shop).put('/api/business/webhook', { url: 'https://shop.test/hooks/cps' });
    expect(set.body.url).toBe('https://shop.test/hooks/cps');
    const rotated = await as(app, shop).post('/api/business/webhook/rotate-secret');
    expect(rotated.body.secret).toMatch(/^whsec_/);
    expect(rotated.body.secret).not.toBe(set.body.secret);
  });

  it('sends a test ping and logs the result', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })));
    const res = await as(app, shop).post('/api/business/webhook/test');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ type: 'ping', state: 'delivered', lastStatusCode: 200 });

    const log = await as(app, shop).get('/api/business/webhook/events');
    expect(log.body[0]).toMatchObject({ type: 'ping', state: 'delivered' });
  });

  it('retries a failed event on demand', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    const failed = await as(app, shop).post('/api/business/webhook/test');
    expect(failed.body.state).toBe('pending');

    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })));
    const retried = await as(app, shop).post(`/api/business/webhook/events/${failed.body.id}/retry`);
    expect(retried.body.state).toBe('delivered');
  });

  it('builds a statement of delivered orders in the period', async () => {
    const biz = await createBusiness();
    const make = async (ref: string, fee: number, deliveredAt: Date | null) => {
      const s = await prisma.shipment.create({
        data: {
          trackingCode: `CPS-ST${ref}${Date.now()}`,
          businessId: biz.businessId,
          externalReference: ref,
          prepaid: true,
          vehicleType: 'motorbike',
          packageType: 'parcel',
          senderName: 'S', senderNumber: '1', pickupRegion: 'Kumasi', pickupLocation: 'Adum',
          receiverName: 'R', receiverNumber: '2', dropoffRegion: 'Accra', dropoffLocation: 'Osu',
          deliveryFee: fee,
          status: deliveredAt ? 'delivered' : 'pending',
        },
      });
      if (deliveredAt) {
        await prisma.shipmentStatusEvent.create({ data: { shipmentId: s.id, status: 'delivered', createdAt: deliveredAt } });
      }
    };
    await make('in-1', 45, new Date('2026-09-10T10:00:00Z'));
    await make('in-2', 20, new Date('2026-09-20T10:00:00Z'));
    await make('out', 55, new Date('2026-10-02T10:00:00Z'));
    await make('open', 35, null);

    const res = await as(app, biz).get('/api/business/statement?from=2026-09-01&to=2026-10-01');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ count: 2, totalFees: 65, currency: 'GHS' });
    expect(res.body.rows.map((r: { externalReference: string }) => r.externalReference)).toEqual(['in-1', 'in-2']);
  });
});

describe('admin approval', () => {
  it('approves and suspends businesses, and suspension blocks keys', async () => {
    const biz = await createBusiness({ status: 'pending' });

    const list = await as(app, admin).get('/api/admin/businesses');
    expect(list.body.some((b: { id: string; status: string }) => b.id === biz.businessId && b.status === 'pending')).toBe(true);

    await as(app, admin).patch(`/api/admin/businesses/${biz.businessId}`, { status: 'approved' });
    expect((await withKey(app, biz.apiKey).get('/api/partner/v1/coverage')).status).toBe(200);
    expect(await prisma.notification.count({ where: { userId: biz.id, type: 'business_status' } })).toBe(1);

    await as(app, admin).patch(`/api/admin/businesses/${biz.businessId}`, { status: 'suspended' });
    expect((await withKey(app, biz.apiKey).get('/api/partner/v1/coverage')).status).toBe(403);
  });

  it('is admin only', async () => {
    const ops = await createUser('operations');
    expect((await as(app, ops).get('/api/admin/businesses')).status).toBe(403);
  });
});
