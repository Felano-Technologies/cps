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
});

async function riderProfileIdFor(userId: string): Promise<string | null> {
  const profile = await prisma.riderProfile.findUnique({ where: { userId }, select: { id: true } });
  return profile?.id ?? null;
}

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
    where.assignedRiderId = riderProfileId ?? '__none__';
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
    include: {
      assignedRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      customer: { select: { id: true, name: true, email: true, phone: true, role: true } },
    },
  });

  res.json(shipments);
});

router.get('/:trackingCode', async (req, res) => {
  const shipment = await prisma.shipment.findUnique({
    where: { trackingCode: req.params.trackingCode },
    include: {
      statusEvents: { orderBy: { createdAt: 'asc' } },
      assignedRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      customer: { select: { id: true, name: true, email: true, phone: true, role: true } },
    },
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
    if (!riderProfileId || shipment.assignedRiderId !== riderProfileId) {
      return res.status(403).json({ error: 'Not assigned to this shipment' });
    }
  }

  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status: parsed.data.status,
      statusEvents: { create: { status: parsed.data.status, note: parsed.data.note } },
    },
    include: {
      assignedRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      customer: { select: { id: true, name: true, email: true, phone: true, role: true } },
      statusEvents: { orderBy: { createdAt: 'asc' } },
    },
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

  if (updated.assignedRider) {
    notify(
      updated.assignedRider.userId,
      'shipment_status',
      `Shipment ${updated.trackingCode} update`,
      `Status updated to: ${parsed.data.status.replace('_', ' ')}.${parsed.data.note ? ` Note: ${parsed.data.note}` : ''}`,
      updated.id
    ).catch(() => {});
  }

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
  if (!riderProfileId || shipment.assignedRiderId !== riderProfileId) {
    return res.status(403).json({ error: 'Not assigned to this shipment' });
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
    include: {
      assignedRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      customer: { select: { id: true, name: true, email: true, phone: true, role: true } },
      statusEvents: { orderBy: { createdAt: 'asc' } },
    },
  }).catch(() => null);

  if (!updated) {
    const current = await prisma.shipment.findUnique({
      where: { id: shipment.id },
      include: {
        assignedRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
        customer: { select: { id: true, name: true, email: true, phone: true, role: true } },
        statusEvents: { orderBy: { createdAt: 'asc' } },
      },
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

const assignSchema = z.object({ riderId: z.string().min(1) });

router.patch('/:id/assign', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'riderId is required' });
  }

  const rider = await prisma.riderProfile.findUnique({
    where: { id: parsed.data.riderId },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });
  if (!rider) {
    return res.status(404).json({ error: 'Rider not found' });
  }

  const shipment = await prisma.shipment.update({
    where: { id: req.params.id as string },
    data: { assignedRiderId: rider.id },
    include: {
      assignedRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      customer: { select: { id: true, name: true, email: true, phone: true, role: true } },
      statusEvents: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (shipment.customerId) {
    notify(
      shipment.customerId,
      'shipment_assigned',
      `Shipment ${shipment.trackingCode} assigned`,
      `A rider has been assigned to your delivery.`,
      shipment.id
    ).catch(() => {});
  }
  notify(
    rider.userId,
    'shipment_assigned',
    'New delivery assigned',
    `You've been assigned a delivery to ${shipment.dropoffLocation}.`,
    shipment.id
  ).catch(() => {});

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
    include: {
      assignedRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      customer: { select: { id: true, name: true, email: true, phone: true, role: true } },
      statusEvents: { orderBy: { createdAt: 'asc' } },
    },
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

  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      deliveryFee: parsed.data.deliveryFee,
      assignedRiderId: parsed.data.riderId || undefined,
      opsRemarks: parsed.data.opsRemarks,
      ...(shipment.status === 'awaiting_price' ? {
        status: 'pending',
        statusEvents: { create: { status: 'pending', note: 'Order processed by operations' } }
      } : {})
    },
    include: {
      assignedRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      customer: { select: { id: true, name: true, email: true, phone: true, role: true } },
      statusEvents: { orderBy: { createdAt: 'asc' } },
    }
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

  if (updated.assignedRiderId && updated.assignedRiderId !== shipment.assignedRiderId) {
    notify(
      updated.assignedRider!.userId,
      'shipment_assigned',
      'New delivery assigned',
      `You've been assigned a delivery to ${updated.dropoffLocation}.`,
      updated.id
    ).catch(() => {});
  }

  res.json(updated);
});

export default router;
