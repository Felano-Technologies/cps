import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { sendSms } from '../server/lib/sms';
import { as, createApp, createBusiness, createShipment, createUser, prisma, withKey, type TestUser } from './helpers/fixtures';

const app = createApp();
const sms = vi.mocked(sendSms);

let ops: TestUser;
let customer: TestUser;
let phoneSeq = 0;
const newPhone = () => `02400${String(++phoneSeq).padStart(5, '0')}`;

beforeAll(async () => {
  [ops, customer] = await Promise.all([createUser('operations'), createUser('customer')]);
});

beforeEach(() => sms.mockClear());

const login = (identifier: string, password: string) =>
  request(app).post('/api/auth/login').send({ identifier, password });

async function opsCreateRider(extra: Record<string, unknown> = {}) {
  const phone = newPhone();
  const res = await as(app, ops).post('/api/riders', { name: 'Kwame Rider', phone, vehicleType: 'motorbike', ...extra });
  expect(res.status).toBe(201);
  return { phone, rider: res.body };
}

describe('ops manage riders', () => {
  it('registers a rider and texts the login details, which work', async () => {
    const { phone, rider } = await opsCreateRider();
    expect(rider.tempPassword).toMatch(/^Cps-/);
    expect(rider.user).toMatchObject({ name: 'Kwame Rider', phone });

    const text = sms.mock.calls.find(([to]) => to === phone)?.[1];
    expect(text).toContain(rider.tempPassword);
    expect(text).toContain(phone);

    const res = await login(phone, rider.tempPassword);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('rider');
    expect(res.body.phoneVerified).toBe(true);
  });

  it('rejects a phone number already in use', async () => {
    const { phone } = await opsCreateRider();
    const dup = await as(app, ops).post('/api/riders', { name: 'Someone', phone });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatch(/phone/);
  });

  it('edits account and vehicle details', async () => {
    const { rider } = await opsCreateRider();
    const phone = newPhone();
    const res = await as(app, ops).patch(`/api/riders/${rider.id}`, { name: 'Kwame A.', phone, vehicleId: 'AS-123-24', vehicleType: 'van' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ vehicleId: 'AS-123-24', vehicleType: 'van', user: { name: 'Kwame A.', phone } });
  });

  it('suspends: blocks sign-in, existing sessions and assignment; reactivate restores', async () => {
    const { phone, rider } = await opsCreateRider();
    const session = (await login(phone, rider.tempPassword)).body.token as string;

    const suspended = await as(app, ops).post(`/api/riders/${rider.id}/suspend`, { suspended: true });
    expect(suspended.status).toBe(200);
    expect(suspended.body.user.suspendedAt).toBeTruthy();
    expect(suspended.body.currentStatus).toBe('offline');

    expect((await login(phone, rider.tempPassword)).status).toBe(403);
    const blocked = await request(app).get('/api/riders/me').set('Authorization', `Bearer ${session}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('account_suspended');

    const s = await createShipment();
    const assign = await as(app, ops).patch(`/api/shipments/${s.id}/assign`, { pickupRiderId: rider.id });
    expect(assign.status).toBe(400);
    expect(assign.body.error).toMatch(/suspended/);

    await as(app, ops).post(`/api/riders/${rider.id}/suspend`, { suspended: false });
    expect((await login(phone, rider.tempPassword)).status).toBe(200);
    expect((await as(app, ops).patch(`/api/shipments/${s.id}/assign`, { pickupRiderId: rider.id })).status).toBe(200);
  });

  it('resends login details with a new password', async () => {
    const { phone, rider } = await opsCreateRider();
    const res = await as(app, ops).post(`/api/riders/${rider.id}/resend-details`);
    expect(res.status).toBe(200);
    expect(res.body.tempPassword).not.toBe(rider.tempPassword);
    expect((await login(phone, rider.tempPassword)).status).toBe(401);
    expect((await login(phone, res.body.tempPassword)).status).toBe(200);
  });

  it('deletes a rider: account gone, past orders kept without the rider', async () => {
    const { phone, rider } = await opsCreateRider();
    const session = (await login(phone, rider.tempPassword)).body.token as string;
    const s = await createShipment({ pickupRiderId: rider.id });

    expect((await as(app, ops).delete(`/api/riders/${rider.id}`)).status).toBe(204);
    expect(await prisma.riderProfile.findUnique({ where: { id: rider.id } })).toBeNull();
    expect((await prisma.shipment.findUniqueOrThrow({ where: { id: s.id } })).pickupRiderId).toBeNull();
    expect((await request(app).get('/api/riders/me').set('Authorization', `Bearer ${session}`)).status).toBe(401);
  });

  it('is staff only', async () => {
    expect((await as(app, customer).post('/api/riders', { name: 'x', phone: newPhone() })).status).toBe(403);
  });
});

describe('ops manage businesses', () => {
  async function opsCreateBusiness() {
    const phone = newPhone();
    const res = await as(app, ops).post('/api/admin/businesses', { businessName: 'Ama Boutique', ownerName: 'Ama', phone });
    expect(res.status).toBe(201);
    return { phone, business: res.body };
  }

  it('registers an approved business and texts the owner their login', async () => {
    const { phone, business } = await opsCreateBusiness();
    expect(business).toMatchObject({ name: 'Ama Boutique', status: 'approved', owner: { name: 'Ama', phone } });
    expect(sms.mock.calls.find(([to]) => to === phone)?.[1]).toContain(business.tempPassword);

    const res = await login(phone, business.tempPassword);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('business');
    // The owner can create API keys straight away
    const key = await request(app).post('/api/business/keys').set('Authorization', `Bearer ${res.body.token}`).send({ name: 'Prod' });
    expect(key.status).toBe(201);
  });

  it('edits business and owner details', async () => {
    const { business } = await opsCreateBusiness();
    const ownerPhone = newPhone();
    const res = await as(app, ops).patch(`/api/admin/businesses/${business.id}`, { name: 'Ama Boutique Ltd', contactEmail: 'ama@shop.test', ownerName: 'Ama Mensah', ownerPhone });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Ama Boutique Ltd', contactEmail: 'ama@shop.test', owner: { name: 'Ama Mensah', phone: ownerPhone } });
  });

  it('suspends API access and reactivates it', async () => {
    const biz = await createBusiness();
    await as(app, ops).patch(`/api/admin/businesses/${biz.businessId}`, { status: 'suspended' });
    expect((await withKey(app, biz.apiKey).get('/api/partner/v1/coverage')).status).toBe(403);
    await as(app, ops).patch(`/api/admin/businesses/${biz.businessId}`, { status: 'approved' });
    expect((await withKey(app, biz.apiKey).get('/api/partner/v1/coverage')).status).toBe(200);
  });

  it('resends the owner login details', async () => {
    const { phone, business } = await opsCreateBusiness();
    const res = await as(app, ops).post(`/api/admin/businesses/${business.id}/resend-details`);
    expect(res.status).toBe(200);
    expect((await login(phone, res.body.tempPassword)).status).toBe(200);
  });

  it('deletes a business: keys stop working, orders kept but unlinked', async () => {
    const biz = await createBusiness();
    const s = await prisma.shipment.create({
      data: {
        trackingCode: `CPS-DEL${Date.now()}`, businessId: biz.businessId, externalReference: 'ord-del', prepaid: true,
        vehicleType: 'motorbike', packageType: 'parcel', senderName: 'S', senderNumber: '1', pickupRegion: 'Kumasi', pickupLocation: 'A',
        receiverName: 'R', receiverNumber: '2', dropoffRegion: 'Accra', dropoffLocation: 'B', deliveryFee: 45, status: 'pending',
      },
    });

    expect((await as(app, ops).delete(`/api/admin/businesses/${biz.businessId}`)).status).toBe(204);
    expect(await prisma.business.findUnique({ where: { id: biz.businessId } })).toBeNull();
    expect((await withKey(app, biz.apiKey).get('/api/partner/v1/coverage')).status).toBe(401);
    expect((await prisma.shipment.findUniqueOrThrow({ where: { id: s.id } })).businessId).toBeNull();
  });

  it('is staff only', async () => {
    expect((await as(app, customer).get('/api/admin/businesses')).status).toBe(403);
  });
});
