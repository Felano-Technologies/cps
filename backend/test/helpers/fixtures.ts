import express from 'express';
import request from 'supertest';
import type { DeliveryType, ShipmentStatus, UserRole } from '@prisma/client';
import { prisma } from '../../server/lib/prisma';
import { signToken } from '../../server/lib/auth';
import shipmentsRoutes from '../../server/routes/shipments';
import bonusesRoutes from '../../server/routes/bonuses';
import businessRoutes from '../../server/routes/business';
import ridersRoutes from '../../server/routes/riders';
import authRoutes from '../../server/routes/auth';
import businessAdminRoutes from '../../server/routes/businessAdmin';
import invoicesAdminRoutes from '../../server/routes/invoicesAdmin';
import partnerV1Routes, { partnerErrorHandler } from '../../server/routes/partner/v1';
import { generateApiKey, generateWebhookSecret } from '../../server/lib/apiKeys';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/riders', ridersRoutes);
  app.use('/api/shipments', shipmentsRoutes);
  app.use('/api/bonuses', bonusesRoutes);
  app.use('/api/business', businessRoutes);
  app.use('/api/admin/businesses', businessAdminRoutes);
  app.use('/api/admin/invoices', invoicesAdminRoutes);
  app.use('/api/partner/v1', partnerV1Routes, partnerErrorHandler);
  return app;
}

export interface TestBusiness extends TestUser {
  businessId: string;
  apiKey: string;
  webhookSecret: string;
}

/** A business account (approved by default) with one active API key. */
export async function createBusiness(options: {
  status?: 'pending' | 'approved' | 'suspended';
  webhookUrl?: string | null;
} = {}): Promise<TestBusiness> {
  const owner = await createUser('business');
  const webhookSecret = generateWebhookSecret();
  const business = await prisma.business.create({
    data: {
      ownerUserId: owner.id,
      name: `Shop ${unique()}`,
      status: options.status ?? 'approved',
      webhookUrl: options.webhookUrl === undefined ? 'https://partner.test/webhooks/cps' : options.webhookUrl,
      webhookSecret,
    },
  });
  const { key, prefix, keyHash } = generateApiKey();
  await prisma.apiKey.create({ data: { businessId: business.id, name: 'test', prefix, keyHash } });
  return { ...owner, businessId: business.id, apiKey: key, webhookSecret };
}

/** supertest request authenticated with a Partner API key. */
export function withKey(app: express.Express, apiKey: string) {
  const auth = { Authorization: `Bearer ${apiKey}` };
  return {
    get: (url: string) => request(app).get(url).set(auth),
    post: (url: string, body?: object) => request(app).post(url).set(auth).send(body ?? {}),
  };
}

let counter = 0;
const unique = () => `${Date.now()}${++counter}`;

export interface TestUser {
  id: string;
  token: string;
  riderProfileId?: string;
}

export async function createUser(role: UserRole): Promise<TestUser> {
  const n = unique();
  const user = await prisma.user.create({
    data: {
      name: `${role} ${n}`,
      email: `${role}-${n}@test.local`,
      passwordHash: 'x',
      role,
      ...(role === 'rider' ? { riderProfile: { create: { vehicleType: 'motorbike' } } } : {}),
    },
    include: { riderProfile: true },
  });
  return {
    id: user.id,
    token: signToken({ userId: user.id, role }),
    riderProfileId: user.riderProfile?.id,
  };
}

export async function createShipment(overrides: {
  status?: ShipmentStatus;
  deliveryType?: DeliveryType;
  stationLocation?: string;
  customerId?: string;
  pickupRiderId?: string;
  dropoffRiderId?: string;
  assignedRiderId?: string;
  batchId?: string;
  receiverName?: string;
  senderNumber?: string;
  receiverNumber?: string;
} = {}) {
  return prisma.shipment.create({
    data: {
      trackingCode: `CPS-T${unique()}`,
      vehicleType: 'motorbike',
      packageType: 'parcel',
      senderName: 'Sender',
      senderNumber: overrides.senderNumber ?? '+233200000001',
      pickupRegion: 'Kumasi',
      pickupLocation: 'Adum',
      receiverName: overrides.receiverName ?? 'Receiver',
      receiverNumber: overrides.receiverNumber ?? '+233200000002',
      dropoffRegion: 'Accra',
      dropoffLocation: 'Osu',
      deliveryFee: 45,
      status: overrides.status ?? 'pending',
      deliveryType: overrides.deliveryType ?? 'doorstep',
      stationLocation: overrides.stationLocation,
      customerId: overrides.customerId,
      pickupRiderId: overrides.pickupRiderId,
      dropoffRiderId: overrides.dropoffRiderId,
      assignedRiderId: overrides.assignedRiderId ?? overrides.dropoffRiderId ?? overrides.pickupRiderId,
      batchId: overrides.batchId,
    },
  });
}

/** supertest request with the user's bearer token attached. */
export function as(app: express.Express, user: TestUser) {
  const auth = { Authorization: `Bearer ${user.token}` };
  return {
    get: (url: string) => request(app).get(url).set(auth),
    post: (url: string, body?: object) => request(app).post(url).set(auth).send(body ?? {}),
    patch: (url: string, body?: object) => request(app).patch(url).set(auth).send(body ?? {}),
    put: (url: string, body?: object) => request(app).put(url).set(auth).send(body ?? {}),
    delete: (url: string) => request(app).delete(url).set(auth),
  };
}

export { prisma };
