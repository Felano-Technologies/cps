import type { Prisma } from '@prisma/client';
import { shipmentInclude } from './shipmentService';

export type ShipmentWithRelations = Prisma.ShipmentGetPayload<{ include: typeof shipmentInclude }>;

type RiderWithUser = ShipmentWithRelations['pickupRider'];

function riderContact(rider: RiderWithUser) {
  return rider ? { name: rider.user.name, phone: rider.user.phone ?? null } : null;
}

const BEFORE_PICKUP = new Set(['awaiting_price', 'pending']);

/**
 * The public, versioned shape of a shipment in the Partner API (v1) and in
 * webhook payloads. Deliberately excludes internal ids, rider bonuses,
 * signature images and anything else partners shouldn't depend on.
 * Changing a field here is a breaking API change — add, don't rename.
 */
export function toPartnerShipment(s: ShipmentWithRelations) {
  const pickupRider = riderContact(s.pickupRider ?? s.assignedRider);
  const dropoffRider = riderContact(s.dropoffRider ?? s.assignedRider);

  return {
    trackingCode: s.trackingCode,
    externalReference: s.externalReference,
    status: s.status,
    deliveryType: s.deliveryType,
    fee: { amount: Number(s.deliveryFee), currency: 'GHS' as const },
    pickup: {
      name: s.senderName,
      phone: s.senderNumber,
      region: s.pickupRegion,
      location: s.pickupLocation,
    },
    dropoff: {
      name: s.receiverName,
      phone: s.receiverNumber,
      region: s.dropoffRegion,
      kumasiSubArea: s.dropoffKumasiSubArea,
      location: s.dropoffLocation,
    },
    package: { type: s.packageType, size: s.packageSize },
    /** The rider currently responsible: the pickup rider until pickup, then the dropoff rider. */
    rider: BEFORE_PICKUP.has(s.status) ? pickupRider : dropoffRider,
    riders: { pickup: pickupRider, dropoff: dropoffRider },
    deliveryCodeRequired: !!s.deliveryCodeHash,
    proofOfDelivery: s.status === 'delivered'
      ? {
          method: s.podMethod,
          recipientName: s.podRecipientName,
          photoUrl: s.podPhotoUrl,
          deliveryCodeVerified: !!s.deliveryCodeVerifiedAt,
        }
      : null,
    cancellationReason: s.status === 'cancelled'
      ? s.statusEvents.filter(e => e.status === 'cancelled').at(-1)?.note ?? null
      : null,
    events: s.statusEvents.map(e => ({ status: e.status, note: e.note, at: e.createdAt })),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export type PartnerShipment = ReturnType<typeof toPartnerShipment>;
