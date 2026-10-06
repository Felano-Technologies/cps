import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendSms } from '../server/lib/sms';
import { notify, notifyRoles } from '../server/lib/notifications';
import { as, createApp, createShipment, createUser, prisma, type TestUser } from './helpers/fixtures';

const app = createApp();
const sendSmsMock = vi.mocked(sendSms);

let customer: TestUser;
let otherCustomer: TestUser;
let ops: TestUser;
let riderA: TestUser;
let riderB: TestUser;

beforeAll(async () => {
  [customer, otherCustomer, ops, riderA, riderB] = await Promise.all([
    createUser('customer'),
    createUser('customer'),
    createUser('operations'),
    createUser('rider'),
    createUser('rider'),
  ]);
});

beforeEach(() => {
  sendSmsMock.mockClear();
});

const singleOrder = {
  vehicleType: 'motorbike',
  priority: 'standard',
  speed: 'next_day',
  packageType: 'parcel',
  packageSize: 'medium',
  senderName: 'Ama',
  senderNumber: '+233200000010',
  pickupRegion: 'Kumasi',
  pickupLocation: 'Adum',
  receiverName: 'Kofi',
  receiverNumber: '+233200000011',
  dropoffRegion: 'Accra',
  dropoffLocation: 'Osu',
};

describe('GET /shipments scoping and search', () => {
  it('never lets a rider search outside their own assignments', async () => {
    const mine = await createShipment({ pickupRiderId: riderA.riderProfileId, receiverName: 'Searchable Mine' });
    await createShipment({ pickupRiderId: riderB.riderProfileId, receiverName: 'Searchable Theirs' });

    const res = await as(app, riderA).get('/api/shipments?search=Searchable');
    expect(res.status).toBe(200);
    expect(res.body.map((s: { id: string }) => s.id)).toEqual([mine.id]);
  });

  it('never lets a customer search outside their own orders', async () => {
    const mine = await createShipment({ customerId: customer.id, receiverName: 'CustSearch' });
    await createShipment({ customerId: otherCustomer.id, receiverName: 'CustSearch' });

    const res = await as(app, customer).get('/api/shipments?search=custsearch');
    expect(res.body.map((s: { id: string }) => s.id)).toEqual([mine.id]);
  });

  it('searches phone numbers and station locations', async () => {
    const byPhone = await createShipment({ senderNumber: '+233555123987' });
    const byStation = await createShipment({ deliveryType: 'station', stationLocation: 'Neoplan Station Circle' });

    const phone = await as(app, ops).get('/api/shipments?search=555123987');
    expect(phone.body.map((s: { id: string }) => s.id)).toEqual([byPhone.id]);

    const station = await as(app, ops).get('/api/shipments?search=neoplan');
    expect(station.body.map((s: { id: string }) => s.id)).toEqual([byStation.id]);
  });

  it('returns a plain array without paging params and a page object with them', async () => {
    const plain = await as(app, ops).get('/api/shipments');
    expect(Array.isArray(plain.body)).toBe(true);

    const paged = await as(app, ops).get('/api/shipments?page=1&pageSize=2');
    expect(paged.status).toBe(200);
    expect(paged.body.items).toHaveLength(2);
    expect(paged.body).toMatchObject({ page: 1, pageSize: 2, total: plain.body.length });
  });

  it('rejects page sizes above the limit', async () => {
    const res = await as(app, ops).get('/api/shipments?pageSize=500');
    expect(res.status).toBe(400);
  });
});

describe('GET /shipments/export and /regions', () => {
  it('is restricted to operations and admin', async () => {
    expect((await as(app, riderA).get('/api/shipments/export')).status).toBe(403);
    expect((await as(app, customer).get('/api/shipments/regions')).status).toBe(403);
  });

  it('returns the complete filtered set, unpaginated', async () => {
    await createShipment({ deliveryType: 'station', stationLocation: 'Export Station' });
    const total = await prisma.shipment.count({ where: { deliveryType: 'station' } });

    const res = await as(app, ops).get('/api/shipments/export?deliveryType=station');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(total);
    expect(res.body[0]).toHaveProperty('receiverNumber');
    expect(res.body[0]).not.toHaveProperty('statusEvents');
  });

  it('lists distinct receiver regions', async () => {
    const res = await as(app, ops).get('/api/shipments/regions');
    expect(res.body).toContain('Accra');
    expect(new Set(res.body).size).toBe(res.body.length);
  });
});

describe('GET /shipments/:trackingCode', () => {
  it('hides shipments a rider is not assigned to', async () => {
    const theirs = await createShipment({ dropoffRiderId: riderB.riderProfileId });
    expect((await as(app, riderA).get(`/api/shipments/${theirs.trackingCode}`)).status).toBe(404);
    expect((await as(app, riderB).get(`/api/shipments/${theirs.trackingCode}`)).status).toBe(200);
  });
});

describe('PATCH /shipments/:id/status', () => {
  it('rejects statuses riders may not set', async () => {
    const s = await createShipment({ dropoffRiderId: riderA.riderProfileId, status: 'out_for_delivery' });
    const res = await as(app, riderA).patch(`/api/shipments/${s.id}/status`, { status: 'delivered' });
    expect(res.status).toBe(400);
  });

  it('rejects changes to a final shipment', async () => {
    const s = await createShipment({ status: 'delivered' });
    const res = await as(app, ops).patch(`/api/shipments/${s.id}/status`, { status: 'in_transit' });
    expect(res.status).toBe(409);
  });

  it('rejects moving back to awaiting_price', async () => {
    const s = await createShipment();
    const res = await as(app, ops).patch(`/api/shipments/${s.id}/status`, { status: 'awaiting_price' });
    expect(res.status).toBe(400);
  });

  it('records an event and credits the pickup bonus exactly once', async () => {
    const s = await createShipment({ pickupRiderId: riderA.riderProfileId });

    const first = await as(app, riderA).patch(`/api/shipments/${s.id}/status`, { status: 'picked_up' });
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('picked_up');
    expect(first.body.statusEvents.at(-1)).toMatchObject({ status: 'picked_up' });

    await as(app, riderA).patch(`/api/shipments/${s.id}/status`, { status: 'picked_up' });

    await vi.waitFor(async () => {
      expect(await prisma.riderBonus.count({ where: { shipmentId: s.id, type: 'pickup' } })).toBe(1);
    });
    const bonusNotifications = await prisma.notification.count({ where: { shipmentId: s.id, type: 'bonus_earned' } });
    expect(bonusNotifications).toBe(1);
  });
});

describe('PATCH /shipments/:id/station-handover', () => {
  const handover = { stationDriverName: 'Yaw', stationDriverNumber: '+233244000000', stationCarNumber: 'AS 1234-20' };

  it('rejects doorstep shipments', async () => {
    const s = await createShipment({ dropoffRiderId: riderA.riderProfileId });
    const res = await as(app, riderA).patch(`/api/shipments/${s.id}/station-handover`, handover);
    expect(res.status).toBe(400);
  });

  it('delivers once, texts sender and receiver, and refuses a second handover', async () => {
    const s = await createShipment({
      deliveryType: 'station',
      stationLocation: 'Kejetia Station',
      dropoffRiderId: riderA.riderProfileId,
      status: 'out_for_delivery',
      senderNumber: '+233200000100',
      receiverNumber: '+233200000101',
    });

    const res = await as(app, riderA).patch(`/api/shipments/${s.id}/station-handover`, handover);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'delivered', stationDriverName: 'Yaw', stationCarNumber: 'AS 1234-20' });
    expect(res.body.stationHandoverAt).toBeTruthy();

    const recipients = sendSmsMock.mock.calls.map(([to]) => to);
    expect(recipients).toEqual(expect.arrayContaining(['+233200000100', '+233200000101']));
    const stationText = sendSmsMock.mock.calls.find(([to]) => to === '+233200000100')![1];
    expect(stationText).toContain(s.trackingCode);
    expect(stationText).toContain('Kejetia Station');
    expect(stationText).toContain('+233244000000');

    const again = await as(app, riderA).patch(`/api/shipments/${s.id}/station-handover`, handover);
    expect(again.status).toBe(409);

    await vi.waitFor(async () => {
      expect(await prisma.notification.count({ where: { shipmentId: s.id, type: 'bonus_earned' } })).toBe(1);
    });
  });

  it('texts once when sender and receiver share a number', async () => {
    const s = await createShipment({
      deliveryType: 'station',
      stationLocation: 'VIP Station',
      dropoffRiderId: riderA.riderProfileId,
      senderNumber: '+233200000200',
      receiverNumber: '+233200000200',
    });
    await as(app, riderA).patch(`/api/shipments/${s.id}/station-handover`, handover);
    expect(sendSmsMock.mock.calls.filter(([to]) => to === '+233200000200')).toHaveLength(1);
  });
});

describe('pricing and processing', () => {
  it.each([['abc'], [-5]])('rejects a delivery fee of %s', async fee => {
    const s = await createShipment({ status: 'awaiting_price' });
    const res = await as(app, ops).patch(`/api/shipments/${s.id}/process`, { deliveryFee: fee });
    expect(res.status).toBe(400);
  });

  it('confirms an awaiting_price order as pending', async () => {
    const s = await createShipment({ status: 'awaiting_price' });
    const res = await as(app, ops).patch(`/api/shipments/${s.id}/process`, { deliveryFee: '55', pickupRiderId: riderA.riderProfileId });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'pending', pickupRiderId: riderA.riderProfileId });
    expect(Number(res.body.deliveryFee)).toBe(55);
  });

  it('clears a rider when null is sent', async () => {
    const s = await createShipment({ pickupRiderId: riderA.riderProfileId, dropoffRiderId: riderB.riderProfileId });
    const res = await as(app, ops).patch(`/api/shipments/${s.id}/process`, { deliveryFee: 45, dropoffRiderId: null });
    expect(res.body).toMatchObject({ dropoffRiderId: null, pickupRiderId: riderA.riderProfileId, assignedRiderId: riderA.riderProfileId });
  });

  it('rejects an unknown rider', async () => {
    const s = await createShipment();
    const res = await as(app, ops).patch(`/api/shipments/${s.id}/process`, { deliveryFee: 45, pickupRiderId: 'nope' });
    expect(res.status).toBe(404);
  });
});

describe('creating orders', () => {
  it('requires a station location for the Station Delivery region', async () => {
    const res = await as(app, customer).post('/api/shipments', { ...singleOrder, dropoffRegion: 'Station Delivery' });
    expect(res.status).toBe(400);
  });

  it('creates a station order at zero fee without a rate for its region', async () => {
    const res = await as(app, customer).post('/api/shipments', {
      ...singleOrder,
      dropoffRegion: 'Nowhere',
      deliveryType: 'station',
      stationLocation: 'Kejetia',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'awaiting_price', deliveryType: 'station', stationLocation: 'Kejetia' });
    expect(Number(res.body.deliveryFee)).toBe(0);
  });
});

describe('bulk orders', () => {
  async function createBatch(receivers = 3) {
    const res = await as(app, customer).post('/api/shipments/bulk', {
      pickup: {
        vehicleType: 'van',
        packageType: 'parcel',
        packageSize: 'medium',
        senderName: 'Shop',
        senderNumber: '+233200000300',
        pickupRegion: 'Kumasi',
        pickupLocation: 'Adum',
      },
      receivers: Array.from({ length: receivers }, (_, i) => ({
        receiverName: `R${i}`,
        receiverNumber: `+23320000031${i}`,
        dropoffRegion: 'Accra',
        dropoffLocation: 'Osu',
        deliveryType: 'doorstep',
        speed: 'next_day',
        priority: 'standard',
      })),
    });
    expect(res.status).toBe(201);
    return res.body[0].batchId as string;
  }

  it('accepts every member once, free of charge, with the pickup rider', async () => {
    const batchId = await createBatch();

    const res = await as(app, ops).patch(`/api/shipments/batch/${batchId}/accept`, { pickupRiderId: riderA.riderProfileId });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    for (const s of res.body) {
      expect(s).toMatchObject({ status: 'pending', pickupRiderId: riderA.riderProfileId, dropoffRiderId: null });
      expect(Number(s.deliveryFee)).toBe(0);
      expect(s.statusEvents.map((e: { status: string }) => e.status)).toEqual(['awaiting_price', 'pending']);
    }

    const again = await as(app, ops).patch(`/api/shipments/batch/${batchId}/accept`, { pickupRiderId: riderA.riderProfileId });
    expect(again.status).toBe(404);
    expect(await prisma.shipmentStatusEvent.count({ where: { shipment: { batchId }, status: 'pending' } })).toBe(3);

    expect(await prisma.notification.count({ where: { userId: riderA.id, type: 'shipment_assigned', title: 'Bulk pickup assigned' } })).toBeGreaterThan(0);
  });

  it('changes nothing when the pickup rider does not exist', async () => {
    const batchId = await createBatch(2);
    const res = await as(app, ops).patch(`/api/shipments/batch/${batchId}/accept`, { pickupRiderId: 'missing' });
    expect(res.status).toBe(404);
    expect(await prisma.shipment.count({ where: { batchId, status: 'awaiting_price' } })).toBe(2);
  });

  it('declines every member with the reason', async () => {
    const batchId = await createBatch(2);
    const res = await as(app, ops).patch(`/api/shipments/batch/${batchId}/decline`, { reason: 'Out of area' });
    expect(res.status).toBe(200);
    for (const s of res.body) {
      expect(s).toMatchObject({ status: 'cancelled', opsRemarks: 'Out of area' });
      expect(s.statusEvents.at(-1)).toMatchObject({ status: 'cancelled', note: 'Out of area' });
    }
  });
});

describe('notifications', () => {
  it('sends staff broadcasts in-app only, but direct notifications by SMS', async () => {
    const staff = await createUser('admin');
    await prisma.user.update({ where: { id: staff.id }, data: { phone: '+233200000900' } });

    await notifyRoles(['admin'], 'test', 'Staff alert', 'hello');
    expect(await prisma.notification.count({ where: { userId: staff.id, title: 'Staff alert' } })).toBe(1);
    expect(sendSmsMock.mock.calls.some(([to]) => to === '+233200000900')).toBe(false);

    await notify(staff.id, 'test', 'Direct', 'hello');
    await vi.waitFor(() => {
      expect(sendSmsMock.mock.calls.some(([to]) => to === '+233200000900')).toBe(true);
    });
  });
});

describe('GET /bonuses/my-bonuses', () => {
  it('sums stored bonus amounts', async () => {
    const rider = await createUser('rider');
    const s1 = await createShipment();
    const s2 = await createShipment();
    await prisma.riderBonus.createMany({
      data: [
        { riderId: rider.riderProfileId!, shipmentId: s1.id, type: 'pickup', amount: 2.5 },
        { riderId: rider.riderProfileId!, shipmentId: s2.id, type: 'pickup', amount: 1 },
      ],
    });

    const res = await as(app, rider).get('/api/bonuses/my-bonuses');
    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({ pickupCount: 2, pickupAmount: 3.5, dropoffAmount: 0 });
  });
});
