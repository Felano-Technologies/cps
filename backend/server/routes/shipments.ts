import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { calculateDeliveryCost } from '../lib/pricing';
import { generateTrackingCode } from '../lib/trackingCode';
import { requireAuth, requireRole } from '../middleware/auth';
import { notify, notifyRoles } from '../lib/notifications';

const router = Router();
router.use(requireAuth);

const VEHICLE_TYPES = ['motorbike', 'van', 'truck'] as const;
const PRIORITIES = ['standard', 'high'] as const;
const SPEEDS = ['same_day', 'next_day', 'express'] as const;
const PACKAGE_TYPES = ['document', 'parcel', 'electronics', 'fragile', 'food', 'other'] as const;
const STATUSES = [
  'awaiting_price',
  'pending',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'delayed',
  'failed',
  'cancelled',
] as const;

const shipmentInputSchema = z.object({
  vehicleType: z.enum(VEHICLE_TYPES),
  priority: z.enum(PRIORITIES),
  speed: z.enum(SPEEDS),
  packageType: z.enum(PACKAGE_TYPES),
  senderName: z.string().min(1),
  senderNumber: z.string().min(1),
  senderContact: z.string().optional(),
  pickupRegion: z.string().min(1),
  pickupLocation: z.string().min(1),
  pickupDate: z.string().optional(),
  receiverName: z.string().min(1),
  receiverNumber: z.string().min(1),
  dropoffRegion: z.string().min(1),
  dropoffKumasiSubArea: z.enum(['CampusAndEnvirons', 'Other']).optional(),
  dropoffLocation: z.string().min(1),
  productFee: z.number().optional(),
  weightKg: z.number().optional(),
  additionalInstructions: z.string().optional(),
  packageImageUrl: z.string().optional(),
});

async function riderProfileIdFor(userId: string): Promise<string | null> {
  const profile = await prisma.riderProfile.findUnique({ where: { userId }, select: { id: true } });
  return profile?.id ?? null;
}

const shipmentInclude = {
  statusEvents: { orderBy: { createdAt: 'asc' as const } },
  assignedRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
  pickupRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
  dropoffRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
  customer: { select: { id: true, name: true, email: true, phone: true, role: true } },
};

function buildShipmentCreateData(
  input: z.infer<typeof shipmentInputSchema>,
  customerId: string | null,
  batchId: string | null
) {
  const deliveryFee = calculateDeliveryCost({
    region: input.dropoffRegion,
    kumasiSubArea: input.dropoffKumasiSubArea,
  });
  if (deliveryFee === null) {
    throw new Error(`No delivery rate configured for region "${input.dropoffRegion}"`);
  }

  return {
    trackingCode: generateTrackingCode(),
    batchId,
    vehicleType: input.vehicleType,
    priority: input.priority,
    speed: input.speed,
    packageType: input.packageType,
    customerId,
    senderName: input.senderName,
    senderNumber: input.senderNumber,
    senderContact: input.senderContact,
    pickupRegion: input.pickupRegion,
    pickupLocation: input.pickupLocation,
    pickupDate: input.pickupDate,
    receiverName: input.receiverName,
    receiverNumber: input.receiverNumber,
    dropoffRegion: input.dropoffRegion,
    dropoffKumasiSubArea: input.dropoffKumasiSubArea,
    dropoffLocation: input.dropoffLocation,
    deliveryFee,
    productFee: input.productFee,
    weightKg: input.weightKg,
    additionalInstructions: input.additionalInstructions,
    packageImageUrl: input.packageImageUrl,
    statusEvents: { create: { status: 'awaiting_price' as const } },
  };
}

router.post('/', requireRole('customer', 'operations', 'admin'), async (req, res) => {
  const parsed = shipmentInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const customerId = req.auth!.role === 'customer' ? req.auth!.userId : null;

  try {
    const shipment = await prisma.shipment.create({
      data: buildShipmentCreateData(parsed.data, customerId, null),
      include: shipmentInclude,
    });
    if (customerId) {
      notify(
        customerId,
        'shipment_created',
        'Pickup request received',
        `Your pickup request ${shipment.trackingCode} has been received and is being processed.`,
        shipment.id
      ).catch(() => {});
    }
    // Notify operations & admin team of new incoming order
    notifyRoles(
      ['operations', 'admin'],
      'new_order',
      'New Pickup Order Placed',
      `New order ${shipment.trackingCode} from ${shipment.senderName} (${shipment.pickupLocation} -> ${shipment.dropoffLocation}) is awaiting review.`,
      shipment.id
    ).catch(() => {});
    res.status(201).json(shipment);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create shipment' });
  }
});

const bulkCreateSchema = z.object({
  pickup: shipmentInputSchema.pick({
    vehicleType: true,
    packageType: true,
    senderName: true,
    senderNumber: true,
    senderContact: true,
    pickupRegion: true,
    pickupLocation: true,
    pickupDate: true,
    productFee: true,
    additionalInstructions: true,
    packageImageUrl: true,
  }),
  receivers: z
    .array(
      shipmentInputSchema.pick({
        receiverName: true,
        receiverNumber: true,
        dropoffRegion: true,
        dropoffKumasiSubArea: true,
        dropoffLocation: true,
        speed: true,
        priority: true,
      })
    )
    .min(1),
});

router.post('/bulk', requireRole('customer', 'operations', 'admin'), async (req, res) => {
  const parsed = bulkCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const customerId = req.auth!.role === 'customer' ? req.auth!.userId : null;
  const batchId = randomUUID();

  try {
    const created = await prisma.$transaction(
      parsed.data.receivers.map((receiver) =>
        prisma.shipment.create({
          data: buildShipmentCreateData(
            { ...parsed.data.pickup, ...receiver },
            customerId,
            batchId
          ),
          include: shipmentInclude,
        })
      )
    );
    if (customerId) {
      notify(
        customerId,
        'shipment_created',
        'Bulk pickup request received',
        `Your bulk pickup request with ${created.length} package(s) has been received and is being processed.`
      ).catch(() => {});
    }
    // Notify operations & admin team of new incoming bulk order
    notifyRoles(
      ['operations', 'admin'],
      'new_order',
      'New Bulk Order Placed',
      `New bulk pickup request with ${created.length} package(s) from ${parsed.data.pickup.senderName} is awaiting review.`,
      created[0]?.id
    ).catch(() => {});
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create shipments' });
  }
});

router.get('/', async (req, res) => {
  const { status, search } = req.query as { status?: string; search?: string };

  const where: Record<string, unknown> = {};

  if (req.auth!.role === 'customer') {
    where.customerId = req.auth!.userId;
  } else if (req.auth!.role === 'rider') {
    const riderProfileId = await riderProfileIdFor(req.auth!.userId);
    const rId = riderProfileId ?? '__none__';
    where.OR = [
      { assignedRiderId: rId },
      { pickupRiderId: rId },
      { dropoffRiderId: rId },
    ];
  }

  if (status && (STATUSES as readonly string[]).includes(status)) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { trackingCode: { contains: search, mode: 'insensitive' } },
      { receiverName: { contains: search, mode: 'insensitive' } },
      { dropoffLocation: { contains: search, mode: 'insensitive' } },
    ];
  }

  const shipments = await prisma.shipment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: shipmentInclude,
  });

  res.json(shipments);
});

router.get('/:trackingCode', async (req, res) => {
  // Notifications store the shipment's id, while shipment lists/search use
  // the human-facing trackingCode — accept either so links from either
  // source resolve to the right shipment.
  const shipment = await prisma.shipment.findFirst({
    where: { OR: [{ trackingCode: req.params.trackingCode }, { id: req.params.trackingCode }] },
    include: shipmentInclude,
  });

  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  if (req.auth!.role === 'customer' && shipment.customerId !== req.auth!.userId) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  res.json(shipment);
});

const statusUpdateSchema = z.object({
  status: z.enum(STATUSES),
  note: z.string().optional(),
});

router.patch('/:id/status', requireRole('rider', 'operations', 'admin'), async (req, res) => {
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id as string } });
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  if (req.auth!.role === 'rider') {
    const riderProfileId = await riderProfileIdFor(req.auth!.userId);
    if (
      !riderProfileId ||
      (shipment.assignedRiderId !== riderProfileId &&
        shipment.pickupRiderId !== riderProfileId &&
        shipment.dropoffRiderId !== riderProfileId)
    ) {
      return res.status(403).json({ error: 'Not assigned to this shipment' });
    }
  }

  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: parsed.data.status,
      statusEvents: { create: { status: parsed.data.status, note: parsed.data.note } },
    },
    include: shipmentInclude,
  });

  if (updated.customerId) {
    notify(
      updated.customerId,
      'shipment_status',
      `Shipment ${updated.trackingCode} update`,
      `Your shipment is now: ${parsed.data.status.replace('_', ' ')}.${parsed.data.note ? ` Note: ${parsed.data.note}` : ''}`,
      updated.id
    ).catch(() => {});
  }

  const notifyRiderUserIds = new Set<string>();
  if (updated.pickupRider) notifyRiderUserIds.add(updated.pickupRider.userId);
  if (updated.dropoffRider) notifyRiderUserIds.add(updated.dropoffRider.userId);
  if (updated.assignedRider) notifyRiderUserIds.add(updated.assignedRider.userId);

  notifyRiderUserIds.forEach(uId => {
    notify(
      uId,
      'shipment_status',
      `Shipment ${updated.trackingCode} update`,
      `Status updated to: ${parsed.data.status.replace('_', ' ')}.${parsed.data.note ? ` Note: ${parsed.data.note}` : ''}`,
      updated.id
    ).catch(() => {});
  });

  if (parsed.data.status === 'delayed') {
    notifyRoles(
      ['operations', 'admin'],
      'shipment_delayed',
      `Shipment ${updated.trackingCode} delayed`,
      `Rider reported a delay for ${updated.dropoffLocation}: ${parsed.data.note ?? 'no reason given'}.`,
      updated.id
    ).catch(() => {});
  }

  res.json(updated);
});

const podSchema = z.object({
  podMethod: z.enum(['signature', 'photo']),
  podRecipientName: z.string().min(1),
  podSignatureData: z.string().optional(),
  podPhotoUrl: z.string().url().optional(),
}).refine(data => data.podMethod !== 'photo' || !!data.podPhotoUrl, {
  message: 'A delivery photo is required for photo proof of delivery',
  path: ['podPhotoUrl'],
}).refine(data => data.podMethod !== 'signature' || !!data.podSignatureData, {
  message: 'A signature is required for signature proof of delivery',
  path: ['podSignatureData'],
});

router.patch('/:id/pod', requireRole('rider'), async (req, res) => {
  const parsed = podSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id as string } });
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const riderProfileId = await riderProfileIdFor(req.auth!.userId);
  if (
    !riderProfileId ||
    (shipment.assignedRiderId !== riderProfileId &&
      shipment.dropoffRiderId !== riderProfileId)
  ) {
    return res.status(403).json({ error: 'Not assigned to deliver this shipment' });
  }

  if (shipment.status === 'delivered') {
    return res.json(shipment);
  }

  const updated = await prisma.shipment.update({
    where: { id: shipment.id, status: { not: 'delivered' } },
    data: {
      status: 'delivered',
      podMethod: parsed.data.podMethod,
      podRecipientName: parsed.data.podRecipientName,
      podSignatureData: parsed.data.podSignatureData,
      podPhotoUrl: parsed.data.podPhotoUrl,
      statusEvents: { create: { status: 'delivered', note: `POD via ${parsed.data.podMethod}` } },
    },
    include: shipmentInclude,
  }).catch(() => null);

  if (!updated) {
    const current = await prisma.shipment.findUnique({
      where: { id: shipment.id },
      include: shipmentInclude,
    });
    return res.json(current);
  }

  if (updated.customerId) {
    notify(
      updated.customerId,
      'shipment_delivered',
      `Shipment ${updated.trackingCode} delivered`,
      `Your package was delivered to ${updated.podRecipientName ?? 'the recipient'}.`,
      updated.id
    ).catch(() => {});
  }

  res.json(updated);
});

const assignSchema = z.object({
  riderId: z.string().nullable().optional(),
  pickupRiderId: z.string().nullable().optional(),
  dropoffRiderId: z.string().nullable().optional(),
  type: z.enum(['pickup', 'dropoff', 'both']).optional(),
}).refine(data => data.riderId !== undefined || data.pickupRiderId !== undefined || data.dropoffRiderId !== undefined, {
  message: 'At least one rider field must be provided',
});

router.patch('/:id/assign', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const existingShipment = await prisma.shipment.findUnique({
    where: { id: req.params.id as string },
    include: shipmentInclude,
  });

  if (!existingShipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  let nextPickupRiderId = existingShipment.pickupRiderId;
  let nextDropoffRiderId = existingShipment.dropoffRiderId;

  if (parsed.data.pickupRiderId !== undefined) {
    nextPickupRiderId = parsed.data.pickupRiderId || null;
  }
  if (parsed.data.dropoffRiderId !== undefined) {
    nextDropoffRiderId = parsed.data.dropoffRiderId || null;
  }

  // Support legacy/convenience riderId and type parameter
  if (parsed.data.riderId !== undefined) {
    const rId = parsed.data.riderId || null;
    const type = parsed.data.type || 'both';
    if (type === 'pickup') {
      nextPickupRiderId = rId;
    } else if (type === 'dropoff') {
      nextDropoffRiderId = rId;
    } else {
      nextPickupRiderId = rId;
      nextDropoffRiderId = rId;
    }
  }

  // Validate rider existence if specified
  if (nextPickupRiderId) {
    const pRider = await prisma.riderProfile.findUnique({ where: { id: nextPickupRiderId } });
    if (!pRider) return res.status(404).json({ error: 'Pickup rider not found' });
  }
  if (nextDropoffRiderId) {
    const dRider = await prisma.riderProfile.findUnique({ where: { id: nextDropoffRiderId } });
    if (!dRider) return res.status(404).json({ error: 'Dropoff rider not found' });
  }

  const nextAssignedRiderId = nextDropoffRiderId || nextPickupRiderId || null;

  const shipment = await prisma.shipment.update({
    where: { id: existingShipment.id },
    data: {
      pickupRiderId: nextPickupRiderId,
      dropoffRiderId: nextDropoffRiderId,
      assignedRiderId: nextAssignedRiderId,
    },
    include: shipmentInclude,
  });

  // Notifications
  if (nextPickupRiderId && nextPickupRiderId !== existingShipment.pickupRiderId) {
    if (shipment.pickupRider) {
      notify(
        shipment.pickupRider.userId,
        'shipment_assigned',
        'Pickup delivery assigned',
        `You've been assigned for pickup from ${shipment.pickupLocation}.`,
        shipment.id
      ).catch(() => {});
    }
  }

  if (nextDropoffRiderId && nextDropoffRiderId !== existingShipment.dropoffRiderId && nextDropoffRiderId !== nextPickupRiderId) {
    if (shipment.dropoffRider) {
      notify(
        shipment.dropoffRider.userId,
        'shipment_assigned',
        'Dropoff delivery assigned',
        `You've been assigned for delivery to ${shipment.dropoffLocation}.`,
        shipment.id
      ).catch(() => {});
    }
  }

  if (shipment.customerId && (!existingShipment.pickupRiderId && !existingShipment.dropoffRiderId && (nextPickupRiderId || nextDropoffRiderId))) {
    notify(
      shipment.customerId,
      'shipment_assigned',
      `Shipment ${shipment.trackingCode} assigned`,
      `A rider has been assigned to your delivery.`,
      shipment.id
    ).catch(() => {});
  }

  res.json(shipment);
});

const priceSchema = z.object({
  deliveryFee: z.union([z.string(), z.number()]).transform((val) => Number(val)),
});

router.patch('/:id/price', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = priceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id as string } });
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      deliveryFee: parsed.data.deliveryFee,
    },
    include: shipmentInclude,
  });

  if (updated.customerId) {
    notify(
      updated.customerId,
      'shipment_price_updated',
      `Shipment ${updated.trackingCode} price updated`,
      `The delivery fee for ${updated.trackingCode} has been updated to GHS ${Number(updated.deliveryFee).toFixed(2)}.`,
      updated.id
    ).catch(() => {});
  }

  res.json(updated);
});

const processSchema = z.object({
  deliveryFee: z.union([z.string(), z.number()]).transform((val) => Number(val)),
  riderId: z.string().optional(),
  pickupRiderId: z.string().optional(),
  dropoffRiderId: z.string().optional(),
  opsRemarks: z.string().optional(),
});

router.patch('/:id/process', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = processSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id as string } });
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const pRiderId = parsed.data.pickupRiderId || parsed.data.riderId || undefined;
  const dRiderId = parsed.data.dropoffRiderId || parsed.data.riderId || undefined;
  const aRiderId = dRiderId || pRiderId || undefined;

  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      deliveryFee: parsed.data.deliveryFee,
      assignedRiderId: aRiderId,
      pickupRiderId: pRiderId,
      dropoffRiderId: dRiderId,
      opsRemarks: parsed.data.opsRemarks,
      ...(shipment.status === 'awaiting_price' ? {
        status: 'pending',
        statusEvents: { create: { status: 'pending', note: 'Order processed by operations' } }
      } : {})
    },
    include: shipmentInclude,
  });

  if (updated.customerId) {
    notify(
      updated.customerId,
      'shipment_price_updated',
      `Order ${updated.trackingCode} Confirmed`,
      `Your order ${updated.trackingCode} has been confirmed. Delivery Fee: GHS ${Number(updated.deliveryFee).toFixed(2)}.`,
      updated.id
    ).catch(() => {});
  }

  if (updated.pickupRider && updated.pickupRiderId !== shipment.pickupRiderId) {
    notify(
      updated.pickupRider.userId,
      'shipment_assigned',
      'Pickup delivery assigned',
      `You've been assigned for pickup from ${updated.pickupLocation}.`,
      updated.id
    ).catch(() => {});
  }

  if (updated.dropoffRider && updated.dropoffRiderId !== shipment.dropoffRiderId && updated.dropoffRiderId !== updated.pickupRiderId) {
    notify(
      updated.dropoffRider.userId,
      'shipment_assigned',
      'Dropoff delivery assigned',
      `You've been assigned for delivery to ${updated.dropoffLocation}.`,
      updated.id
    ).catch(() => {});
  }

  res.json(updated);
});

const cancelSchema = z.object({
  reason: z.string().optional(),
});

router.patch('/:id/cancel', async (req, res) => {
  const parsed = cancelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const shipment = await prisma.shipment.findUnique({
    where: { id: req.params.id as string },
    include: shipmentInclude,
  });

  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  // Check authorization for customer
  if (req.auth!.role === 'customer' && shipment.customerId !== req.auth!.userId) {
    return res.status(403).json({ error: 'Not authorized to cancel this shipment' });
  }

  // Only allow cancellation if order has not been picked up yet
  const nonCancellableStatuses: (typeof STATUSES)[number][] = [
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'failed',
    'cancelled',
  ];

  if (nonCancellableStatuses.includes(shipment.status)) {
    if (shipment.status === 'cancelled') {
      return res.status(400).json({ error: 'Order is already cancelled' });
    }
    return res.status(400).json({
      error: `Cannot cancel order because it is already ${shipment.status.replace(/_/g, ' ')}. Orders can only be cancelled before rider pickup.`,
    });
  }

  const cancelReason = parsed.data.reason?.trim() || (req.auth!.role === 'customer' ? 'Cancelled by customer' : 'Cancelled by operations');

  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: 'cancelled',
      statusEvents: {
        create: {
          status: 'cancelled',
          note: cancelReason,
        },
      },
    },
    include: shipmentInclude,
  });

  // Notify customer
  if (updated.customerId) {
    notify(
      updated.customerId,
      'shipment_cancelled',
      `Shipment ${updated.trackingCode} Cancelled`,
      `Order ${updated.trackingCode} has been cancelled.${cancelReason ? ` Note: ${cancelReason}` : ''}`,
      updated.id
    ).catch(() => {});
  }

  // Notify assigned riders
  const cancelNotifyRiders = new Set<string>();
  if (updated.pickupRider) cancelNotifyRiders.add(updated.pickupRider.userId);
  if (updated.dropoffRider) cancelNotifyRiders.add(updated.dropoffRider.userId);
  if (updated.assignedRider) cancelNotifyRiders.add(updated.assignedRider.userId);

  cancelNotifyRiders.forEach(userId => {
    notify(
      userId,
      'shipment_cancelled',
      `Delivery ${updated.trackingCode} Cancelled`,
      `The assigned delivery for ${updated.dropoffLocation} was cancelled.`,
      updated.id
    ).catch(() => {});
  });

  // Notify operations & admin team
  if (req.auth!.role === 'customer') {
    notifyRoles(
      ['operations', 'admin'],
      'shipment_cancelled',
      `Order ${updated.trackingCode} Cancelled by Customer`,
      `Customer cancelled order ${updated.trackingCode}. Reason: ${cancelReason}`,
      updated.id
    ).catch(() => {});
  }

  res.json(updated);
});

export default router;
