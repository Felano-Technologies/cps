import express from 'express';
import request from 'supertest';
import type { DeliveryType, ShipmentStatus, UserRole } from '@prisma/client';
import { prisma } from '../../server/lib/prisma';
import { signToken } from '../../server/lib/auth';
import shipmentsRoutes from '../../server/routes/shipments';
import bonusesRoutes from '../../server/routes/bonuses';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/shipments', shipmentsRoutes);
  app.use('/api/bonuses', bonusesRoutes);
  return app;
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
  };
}

export { prisma };
