import { beforeAll, describe, expect, it } from 'vitest';
import { as, createApp, createBusiness, createUser, prisma, type TestBusiness, type TestUser } from './helpers/fixtures';

const app = createApp();
let ops: TestUser;
let seq = 0;

beforeAll(async () => {
  ops = await createUser('operations');
});

async function delivered(biz: TestBusiness, fee: number, deliveredAt: Date | null) {
  const s = await prisma.shipment.create({
    data: {
      trackingCode: `CPS-INV${++seq}${Date.now()}`,
      businessId: biz.businessId,
      externalReference: `ref-${seq}`,
      prepaid: true,
      vehicleType: 'motorbike',
      packageType: 'parcel',
      senderName: 'S', senderNumber: '1', pickupRegion: 'Kumasi', pickupLocation: 'Adum',
      receiverName: 'R', receiverNumber: '2', dropoffRegion: 'Accra', dropoffLocation: 'Osu',
      deliveryFee: fee,
      status: deliveredAt ? 'delivered' : 'pending',
    },
  });
  if (deliveredAt) await prisma.shipmentStatusEvent.create({ data: { shipmentId: s.id, status: 'delivered', createdAt: deliveredAt } });
  return s;
}

describe('what a business owes CPS', () => {
  it('applies the default 85% CPS share to the statement', async () => {
    const biz = await createBusiness();
    await delivered(biz, 45, new Date('2026-09-10T10:00:00Z'));
    await delivered(biz, 20, new Date('2026-09-20T10:00:00Z'));

    const res = await as(app, biz).get('/api/business/statement?from=2026-09-01&to=2026-10-01');
    expect(res.body).toMatchObject({ cpsSharePercent: 85, count: 2, totalFees: 65, cpsShare: 55.25, businessShare: 9.75 });
    expect(res.body.rows[0]).toMatchObject({ fee: 45, cpsShare: 38.25, invoiced: false });
  });

  it("shows today's amount due, uninvoiced and unpaid totals", async () => {
    const biz = await createBusiness();
    await delivered(biz, 35, new Date());
    await delivered(biz, 60, new Date());
    await delivered(biz, 45, new Date('2026-01-05T10:00:00Z'));
    await delivered(biz, 50, null);

    const res = await as(app, biz).get('/api/business/balance');
    expect(res.status).toBe(200);
    expect(res.body.today).toMatchObject({ count: 2, totalFees: 95, cpsShare: 80.75, businessShare: 14.25 });
    expect(res.body.uninvoiced).toMatchObject({ count: 3, totalFees: 140, cpsShare: 119 });
    expect(res.body.unpaidInvoices).toEqual({ count: 0, amountDue: 0 });
  });
});

describe('ops invoices', () => {
  it('invoices a period at the business share, once, and keeps that share', async () => {
    const biz = await createBusiness();
    expect((await as(app, ops).patch(`/api/admin/businesses/${biz.businessId}`, { cpsSharePercent: 90 })).body.cpsSharePercent).toBe(90);
    await delivered(biz, 40, new Date('2026-09-10T10:00:00Z'));
    await delivered(biz, 25.5, new Date('2026-09-11T10:00:00Z'));
    await delivered(biz, 30, new Date('2026-09-15T10:00:00Z')); // outside the period

    const period = { businessId: biz.businessId, from: '2026-09-10', to: '2026-09-12' };
    const preview = await as(app, ops).get(`/api/admin/invoices/preview?businessId=${biz.businessId}&from=2026-09-10&to=2026-09-12`);
    expect(preview.body).toMatchObject({ count: 2, totalFees: 65.5, cpsShare: 58.95, cpsSharePercent: 90 });

    const created = await as(app, ops).post('/api/admin/invoices', period);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ deliveryCount: 2, totalFees: 65.5, amountDue: 58.95, businessShare: 6.55, status: 'unpaid' });
    expect(created.body.number).toMatch(/^INV-\d{5}$/);
    expect(created.body.lines).toHaveLength(2);

    // The same deliveries can't be billed twice.
    expect((await as(app, ops).post('/api/admin/invoices', period)).status).toBe(409);

    // A later rate change doesn't alter the invoice.
    await as(app, ops).patch(`/api/admin/businesses/${biz.businessId}`, { cpsSharePercent: 80 });
    const mine = await as(app, biz).get(`/api/business/invoices/${created.body.id}`);
    expect(mine.body).toMatchObject({ amountDue: 58.95, cpsSharePercent: 90 });
    expect(mine.body.lines[0]).not.toHaveProperty('shipmentId');

    const balance = await as(app, biz).get('/api/business/balance');
    expect(balance.body.unpaidInvoices).toEqual({ count: 1, amountDue: 58.95 });
    expect(balance.body.uninvoiced).toMatchObject({ count: 1, cpsShare: 24 });

    const paid = await as(app, ops).post(`/api/admin/invoices/${created.body.id}/paid`, { paymentReference: 'MoMo 12345' });
    expect(paid.body).toMatchObject({ status: 'paid', paymentReference: 'MoMo 12345' });
    expect((await as(app, ops).post(`/api/admin/invoices/${created.body.id}/void`)).status).toBe(409);
  });

  it('voiding frees deliveries to be invoiced again', async () => {
    const biz = await createBusiness();
    await delivered(biz, 50, new Date('2026-08-01T10:00:00Z'));
    const period = { businessId: biz.businessId, from: '2026-08-01', to: '2026-08-02' };
    const first = await as(app, ops).post('/api/admin/invoices', period);
    const voided = await as(app, ops).post(`/api/admin/invoices/${first.body.id}/void`);
    expect(voided.body.status).toBe('void');
    expect((await as(app, biz).get('/api/business/invoices')).body).toHaveLength(0);

    const second = await as(app, ops).post('/api/admin/invoices', period);
    expect(second.status).toBe(201);
    expect(second.body.amountDue).toBe(42.5);
  });

  it('lists outstanding amounts per business and refuses non-staff', async () => {
    const biz = await createBusiness();
    await delivered(biz, 20, new Date());
    const res = await as(app, ops).get('/api/admin/invoices/outstanding');
    const row = res.body.find((r: { business: { id: string } }) => r.business.id === biz.businessId);
    expect(row).toMatchObject({ cpsSharePercent: 85, today: { count: 1, cpsShare: 17 }, uninvoiced: { count: 1 } });

    expect((await as(app, biz).get('/api/admin/invoices')).status).toBe(403);
    expect((await as(app, ops).post('/api/admin/invoices', { businessId: biz.businessId, from: '2020-01-01', to: '2020-01-02' })).status).toBe(409);
  });
});
