import { randomUUID } from 'crypto';
import { Router } from 'express';
import { Prisma, type ShipmentStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { calculateDeliveryCost } from '../lib/pricing';
import { generateTrackingCode } from '../lib/trackingCode';
import { requireAuth, requireRole } from '../middleware/auth';
import { notify, notifyRoles } from '../lib/notifications';
import { sendSms } from '../lib/sms';

const router = Router();
router.use(requireAuth);

const VEHICLE_TYPES = ['motorbike', 'van', 'truck'] as const;
const PRIORITIES = ['standard', 'high'] as const;
const SPEEDS = ['same_day', 'next_day', 'express'] as const;
const PACKAGE_TYPES = ['document', 'parcel', 'electronics', 'fragile', 'food', 'other'] as const;
const PACKAGE_SIZES = ['small', 'medium', 'big'] as const;
const DELIVERY_TYPES = ['doorstep', 'station'] as const;
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

const shipmentInputBaseSchema = z.object({
  vehicleType: z.enum(VEHICLE_TYPES),
  priority: z.enum(PRIORITIES),
  speed: z.enum(SPEEDS),
  packageType: z.enum(PACKAGE_TYPES),
  packageSize: z.enum(PACKAGE_SIZES),
  deliveryType: z.enum(DELIVERY_TYPES).default('doorstep'),
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
  stationLocation: z.string().min(1).optional(),
  productFee: z.number().optional(),
  weightKg: z.number().optional(),
  additionalInstructions: z.string().optional(),
  packageImageUrl: z.string().optional(),
});

const STATION_REGION = 'Station Delivery';
const FINAL_STATUSES = ['delivered', 'cancelled', 'failed'] as const;
const RIDER_SETTABLE_STATUSES = ['picked_up', 'in_transit', 'out_for_delivery', 'delayed'] as const;

function isStationDelivery(data: { deliveryType?: string; dropoffRegion: string }) {
  return data.deliveryType === 'station' || data.dropoffRegion === STATION_REGION;
}

const hasStationLocationIfNeeded = (data: { deliveryType?: string; dropoffRegion: string; stationLocation?: string }) =>
  !isStationDelivery(data) || !!data.stationLocation;
const stationLocationError = { message: 'Station location is required for station deliveries', path: ['stationLocation'] };

const shipmentInputSchema = shipmentInputBaseSchema.refine(hasStationLocationIfNeeded, stationLocationError);

const feeSchema = z.coerce
  .number({ invalid_type_error: 'Delivery fee must be a number' })
  .finite('Delivery fee must be a number')
  .nonnegative('Delivery fee cannot be negative');

async function riderProfileIdFor(userId: string): Promise<string | null> {
  const profile = await prisma.riderProfile.findUnique({ where: { userId }, select: { id: true } });
  return profile?.id ?? null;
}

function riderScope(riderProfileId: string): Prisma.ShipmentWhereInput {
  return {
    OR: [
      { assignedRiderId: riderProfileId },
      { pickupRiderId: riderProfileId },
      { dropoffRiderId: riderProfileId },
    ],
  };
}

function isAssignedRider(
  shipment: { assignedRiderId: string | null; pickupRiderId: string | null; dropoffRiderId: string | null },
  riderProfileId: string | null
) {
  return !!riderProfileId && (
    shipment.assignedRiderId === riderProfileId ||
    shipment.pickupRiderId === riderProfileId ||
    shipment.dropoffRiderId === riderProfileId
  );
}

const shipmentInclude = {
  statusEvents: { orderBy: { createdAt: 'asc' as const } },
  assignedRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
  pickupRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
  dropoffRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
  bonuses: true,
  customer: { select: { id: true, name: true, email: true, phone: true, role: true } },
};

async function notifyReceiverOfStatus(
  shipment: {
    trackingCode: string;
    receiverNumber: string;
    deliveryFee: any;
    productFee?: any;
    dropoffLocation: string;
    dropoffRider?: { user?: { name: string; phone?: string | null } } | null;
  },
  status: string,
  note?: string
) {
  if (!shipment.receiverNumber) return;

  const fee = Number(shipment.deliveryFee || 0).toFixed(2);
  const cod = shipment.productFee && Number(shipment.productFee) > 0 
    ? ` + COD: GHS ${Number(shipment.productFee).toFixed(2)}` 
    : '';
  const total = (Number(shipment.deliveryFee || 0) + Number(shipment.productFee || 0)).toFixed(2);

  let message = '';
  switch (status) {
    case 'pending':
      message = `CPS Logistics: Your package #${shipment.trackingCode} is confirmed! Delivery Fee: GHS ${fee}${cod}. Track: https://cpslogistics.com/track/${shipment.trackingCode}`;
      break;
    case 'picked_up':
      message = `CPS Logistics: Package #${shipment.trackingCode} has been picked up from sender and is heading to our hub. Total to pay: GHS ${total}.`;
      break;
    case 'in_transit':
      message = `CPS Logistics: Package #${shipment.trackingCode} is in transit towards ${shipment.dropoffLocation}.`;
      break;
    case 'out_for_delivery': {
      const riderName = shipment.dropoffRider?.user?.name || 'our rider';
      const riderPhone = shipment.dropoffRider?.user?.phone ? ` (${shipment.dropoffRider.user.phone})` : '';
      message = `CPS Logistics: Package #${shipment.trackingCode} is OUT FOR DELIVERY by ${riderName}${riderPhone}. Amount to pay: GHS ${total}.`;
      break;
    }
    case 'delivered':
      message = `CPS Logistics: Package #${shipment.trackingCode} was delivered successfully. Thank you for choosing CPS!`;
      break;
    case 'delayed':
      message = `CPS Logistics: Package #${shipment.trackingCode} has encountered a temporary delay${note ? `: ${note}` : ''}. Our dispatch team is working on it.`;
      break;
    default:
      return;
  }

  try {
    await sendSms(shipment.receiverNumber, message);
  } catch (err) {
    console.error('[sms] Failed to send receiver status SMS:', err);
  }
}

async function creditRiderBonus(
  shipmentId: string,
  riderId: string,
  type: 'pickup' | 'dropoff',
  trackingCode: string,
  riderUserId?: string
) {
  try {
    // skipDuplicates + the (shipmentId, type) unique key make this idempotent;
    // only notify when a bonus row was actually created.
    const { count } = await prisma.riderBonus.createMany({
      data: [{ riderId, shipmentId, type, amount: 1.00 }],
      skipDuplicates: true,
    });

    if (count > 0 && riderUserId) {
      const typeLabel = type === 'pickup' ? 'Pickup' : 'Dropoff';
      notify(
        riderUserId,
        'bonus_earned',
        `GHS 1.00 ${typeLabel} Bonus Earned!`,
        `You earned a GHS 1.00 bonus for ${typeLabel.toLowerCase()} on order #${trackingCode}.`,
        shipmentId
      ).catch(() => {});
    }
  } catch (err) {
    console.error(`[bonus] Failed to credit ${type} bonus:`, err);
  }
}

function buildShipmentCreateData(
  input: z.infer<typeof shipmentInputSchema>,
  customerId: string | null,
  batchId: string | null
) {
  const isStation = isStationDelivery(input);
  let deliveryFee = 0;
  if (!isStation) {
    const calculated = calculateDeliveryCost({
      region: input.dropoffRegion,
      kumasiSubArea: input.dropoffKumasiSubArea,
    });
    if (calculated === null) {
      throw new Error(`No delivery rate configured for region "${input.dropoffRegion}"`);
    }
    deliveryFee = calculated;
  }

  return {
    trackingCode: generateTrackingCode(),
    batchId,
    vehicleType: input.vehicleType,
    priority: input.priority,
    speed: input.speed,
    packageType: input.packageType,
    packageSize: input.packageSize,
    deliveryType: isStation ? 'station' : input.deliveryType,
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
    stationLocation: isStation ? input.stationLocation : undefined,
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

const bulkReceiverSchema = shipmentInputBaseSchema.pick({
  receiverName: true,
  receiverNumber: true,
  dropoffRegion: true,
  dropoffKumasiSubArea: true,
  dropoffLocation: true,
  deliveryType: true,
  stationLocation: true,
  speed: true,
  priority: true,
}).refine(hasStationLocationIfNeeded, stationLocationError);

const bulkCreateSchema = z.object({
  pickup: shipmentInputBaseSchema.pick({
    vehicleType: true,
    packageType: true,
    packageSize: true,
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
    .array(bulkReceiverSchema)
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

const listQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().trim().optional(),
  deliveryType: z.enum(DELIVERY_TYPES).optional(),
  dropoffRegion: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

/**
 * Builds the list/export filter. Role scope and the optional filters are
 * combined with AND so a search can never widen the set of shipments a
 * customer or rider is allowed to see.
 */
async function buildListWhere(
  auth: { userId: string; role: string },
  query: z.infer<typeof listQuerySchema>
): Promise<Prisma.ShipmentWhereInput> {
  const { status, search, deliveryType, dropoffRegion } = query;
  const filters: Prisma.ShipmentWhereInput[] = [];

  if (auth.role === 'customer') {
    filters.push({ customerId: auth.userId });
  } else if (auth.role === 'rider') {
    const riderProfileId = await riderProfileIdFor(auth.userId);
    filters.push(riderScope(riderProfileId ?? '__none__'));
  }

  if (status && (STATUSES as readonly string[]).includes(status)) {
    filters.push({ status: status as ShipmentStatus });
  }
  if (deliveryType) filters.push({ deliveryType });
  if (dropoffRegion) filters.push({ dropoffRegion });

  if (search) {
    const contains = { contains: search, mode: 'insensitive' as const };
    filters.push({
      OR: [
        { trackingCode: contains },
        { senderName: contains },
        { senderNumber: contains },
        { receiverName: contains },
        { receiverNumber: contains },
        { pickupRegion: contains },
        { pickupLocation: contains },
        { dropoffRegion: contains },
        { dropoffLocation: contains },
        { stationLocation: contains },
      ],
    });
  }

  return { AND: filters };
}

router.get('/', async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid query' });
  }
  const where = await buildListWhere(req.auth!, parsed.data);

  // Pagination is opt-in so existing callers that expect a plain array keep working.
  const { page, pageSize } = parsed.data;
  if (page === undefined && pageSize === undefined) {
    const shipments = await prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: shipmentInclude,
    });
    return res.json(shipments);
  }

  const currentPage = page ?? 1;
  const size = pageSize ?? 50;
  const [items, total] = await prisma.$transaction([
    prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: shipmentInclude,
      skip: (currentPage - 1) * size,
      take: size,
    }),
    prisma.shipment.count({ where }),
  ]);

  res.json({ items, total, page: currentPage, pageSize: size });
});

/**
 * Complete filtered record set for the Records page Excel export — never
 * paginated, and limited to the flat fields the workbook needs.
 */
router.get('/export', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid query' });
  }

  const records = await prisma.shipment.findMany({
    where: await buildListWhere(req.auth!, parsed.data),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      trackingCode: true,
      status: true,
      deliveryType: true,
      senderName: true,
      senderNumber: true,
      pickupRegion: true,
      pickupLocation: true,
      receiverName: true,
      receiverNumber: true,
      dropoffRegion: true,
      dropoffLocation: true,
      stationLocation: true,
      deliveryFee: true,
      createdAt: true,
    },
  });

  res.json(records);
});

/** Distinct receiver regions, for the Records page region filter. */
router.get('/regions', requireRole('operations', 'admin'), async (_req, res) => {
  const rows = await prisma.shipment.findMany({
    distinct: ['dropoffRegion'],
    select: { dropoffRegion: true },
    orderBy: { dropoffRegion: 'asc' },
  });
  res.json(rows.map(r => r.dropoffRegion).filter(Boolean));
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

  if (req.auth!.role === 'rider' && !isAssignedRider(shipment, await riderProfileIdFor(req.auth!.userId))) {
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
    if (!isAssignedRider(shipment, await riderProfileIdFor(req.auth!.userId))) {
      return res.status(403).json({ error: 'Not assigned to this shipment' });
    }
    if (!(RIDER_SETTABLE_STATUSES as readonly string[]).includes(parsed.data.status)) {
      return res.status(400).json({ error: `Riders cannot set status to ${parsed.data.status}` });
    }
  }

  if (parsed.data.status === 'awaiting_price') {
    return res.status(400).json({ error: 'Use the process endpoint to price an order' });
  }

  if ((FINAL_STATUSES as readonly string[]).includes(shipment.status)) {
    return res.status(409).json({ error: `Shipment is already ${shipment.status}` });
  }

  // Conditional on the status we validated against, so a concurrent update
  // (e.g. a POD landing at the same time) cannot be silently overwritten.
  const changed = await prisma.$transaction(async tx => {
    const { count } = await tx.shipment.updateMany({
      where: { id: shipment.id, status: shipment.status },
      data: { status: parsed.data.status },
    });
    if (count === 0) return false;
    await tx.shipmentStatusEvent.create({
      data: { shipmentId: shipment.id, status: parsed.data.status, note: parsed.data.note },
    });
    return true;
  });

  if (!changed) {
    return res.status(409).json({ error: 'Shipment was updated by someone else; refresh and try again' });
  }

  const updated = await prisma.shipment.findUniqueOrThrow({
    where: { id: shipment.id },
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

  // Credit 1 Cedi pickup bonus when order is picked up
  if (parsed.data.status === 'picked_up') {
    const pRiderId = updated.pickupRiderId || updated.assignedRiderId;
    if (pRiderId) {
      creditRiderBonus(
        updated.id,
        pRiderId,
        'pickup',
        updated.trackingCode,
        updated.pickupRider?.userId || updated.assignedRider?.userId
      );
    }
  }

  // Credit 1 Cedi dropoff bonus when order is delivered
  if (parsed.data.status === 'delivered') {
    const dRiderId = updated.dropoffRiderId || updated.assignedRiderId;
    if (dRiderId) {
      creditRiderBonus(
        updated.id,
        dRiderId,
        'dropoff',
        updated.trackingCode,
        updated.dropoffRider?.userId || updated.assignedRider?.userId
      );
    }
  }

  // Send real-time SMS to package receiver
  notifyReceiverOfStatus(updated, parsed.data.status, parsed.data.note);

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

  // Credit 1 Cedi dropoff bonus on successful POD delivery
  const dRiderId = updated.dropoffRiderId || updated.assignedRiderId;
  if (dRiderId) {
    creditRiderBonus(
      updated.id,
      dRiderId,
      'dropoff',
      updated.trackingCode,
      updated.dropoffRider?.userId || updated.assignedRider?.userId
    );
  }

  // Notify package receiver via SMS
  notifyReceiverOfStatus(updated, 'delivered');

  res.json(updated);
});

const stationHandoverSchema = z.object({
  stationDriverName: z.string().min(1),
  stationDriverNumber: z.string().min(1),
  stationCarNumber: z.string().min(1),
  stationReceiptUrl: z.string().url().optional(),
});

router.patch('/:id/station-handover', requireRole('rider'), async (req, res) => {
  const parsed = stationHandoverSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid station handover details' });
  }

  const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id as string } });
  if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
  if (shipment.deliveryType !== 'station') {
    return res.status(400).json({ error: 'This shipment is not a station delivery' });
  }

  const riderProfileId = await riderProfileIdFor(req.auth!.userId);
  if (!riderProfileId || (shipment.assignedRiderId !== riderProfileId && shipment.dropoffRiderId !== riderProfileId)) {
    return res.status(403).json({ error: 'Not assigned to deliver this shipment' });
  }

  if ((FINAL_STATUSES as readonly string[]).includes(shipment.status)) {
    return res.status(409).json({ error: `Shipment is already ${shipment.status}` });
  }

  const updated = await prisma.shipment.update({
    where: { id: shipment.id, status: { notIn: [...FINAL_STATUSES] } },
    data: {
      ...parsed.data,
      stationHandoverAt: new Date(),
      status: 'delivered',
      statusEvents: { create: { status: 'delivered', note: `Station handover completed at ${shipment.stationLocation}` } },
    },
    include: shipmentInclude,
  }).catch(() => null);

  if (!updated) {
    return res.status(409).json({ error: 'Shipment was already completed' });
  }

  if (updated.customerId) {
    notify(updated.customerId, 'station_handover', `Station handover completed for ${updated.trackingCode}`,
      `Your package has been handed to the station vehicle at ${updated.stationLocation}.`, updated.id).catch(() => {});
  }
  notifyRoles(['operations', 'admin'], 'station_handover', `Station handover completed: ${updated.trackingCode}`,
    `Driver and receipt details are ready for review.`, updated.id).catch(() => {});

  const stationSms = `CPS Logistics: Package #${updated.trackingCode} has been delivered to ${updated.stationLocation || 'the station'} for onward travel. Driver: ${parsed.data.stationDriverName}, ${parsed.data.stationDriverNumber}. Car: ${parsed.data.stationCarNumber}.`;
  // Notify both parties independently; sendSms handles provider failures without failing the handover.
  [updated.senderNumber, updated.receiverNumber]
    .filter((phone, index, phones) => !!phone && phones.indexOf(phone) === index)
    .forEach(phone => { void sendSms(phone, stationSms); });

  const dRiderId = updated.dropoffRiderId || updated.assignedRiderId;
  if (dRiderId) {
    creditRiderBonus(updated.id, dRiderId, 'dropoff', updated.trackingCode,
      updated.dropoffRider?.userId || updated.assignedRider?.userId);
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
  deliveryFee: feeSchema,
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
  deliveryFee: feeSchema,
  riderId: z.string().nullable().optional(),
  pickupRiderId: z.string().nullable().optional(),
  dropoffRiderId: z.string().nullable().optional(),
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

  // undefined = leave unchanged, null/'' = clear, string = assign (same semantics as /assign)
  const pickupInput = parsed.data.pickupRiderId !== undefined ? parsed.data.pickupRiderId : parsed.data.riderId;
  const dropoffInput = parsed.data.dropoffRiderId !== undefined ? parsed.data.dropoffRiderId : parsed.data.riderId;
  const pRiderId = pickupInput === undefined ? shipment.pickupRiderId : pickupInput || null;
  const dRiderId = dropoffInput === undefined ? shipment.dropoffRiderId : dropoffInput || null;

  for (const [label, riderId] of [['Pickup', pRiderId], ['Dropoff', dRiderId]] as const) {
    if (riderId && !(await prisma.riderProfile.findUnique({ where: { id: riderId }, select: { id: true } }))) {
      return res.status(404).json({ error: `${label} rider not found` });
    }
  }

  const updated = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      deliveryFee: parsed.data.deliveryFee,
      // Leave legacy assignedRiderId alone unless a rider field was actually sent.
      assignedRiderId: pickupInput === undefined && dropoffInput === undefined
        ? undefined
        : dRiderId || pRiderId || null,
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

  // Notify receiver via SMS of confirmed price
  notifyReceiverOfStatus(updated, 'pending');

  res.json(updated);
});

const bulkAcceptSchema = z.object({ pickupRiderId: z.string().optional(), opsRemarks: z.string().optional() });

class BatchConflictError extends Error {
  constructor() {
    super('Bulk order was processed by someone else; refresh and try again');
  }
}

/**
 * Moves every `awaiting_price` member of a batch to `status` in one transaction.
 * The member ids are re-read inside the transaction and updated with a status
 * guard, so two concurrent accept/decline calls cannot both process the batch.
 * Returns null when no eligible members remain.
 */
async function transitionAwaitingBatch(
  batchId: string,
  status: 'pending' | 'cancelled',
  data: Prisma.ShipmentUncheckedUpdateManyInput,
  note: string
) {
  const ids = await prisma.$transaction(async tx => {
    const members = await tx.shipment.findMany({
      where: { batchId, status: 'awaiting_price' },
      select: { id: true },
    });
    if (!members.length) return null;
    const memberIds = members.map(m => m.id);

    const { count } = await tx.shipment.updateMany({
      where: { id: { in: memberIds }, status: 'awaiting_price' },
      data: { ...data, status },
    });
    // Another request processed part of the batch first: abort so it's all-or-nothing.
    if (count !== memberIds.length) throw new BatchConflictError();

    await tx.shipmentStatusEvent.createMany({
      data: memberIds.map(shipmentId => ({ shipmentId, status, note })),
    });
    return memberIds;
  });
  if (!ids) return null;

  return prisma.shipment.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: 'asc' },
    include: shipmentInclude,
  });
}

router.patch('/batch/:batchId/accept', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = bulkAcceptSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid bulk acceptance details' });

  const pickupRiderId = parsed.data.pickupRiderId || null;
  if (pickupRiderId && !(await prisma.riderProfile.findUnique({ where: { id: pickupRiderId }, select: { id: true } }))) {
    return res.status(404).json({ error: 'Pickup rider not found' });
  }

  let updated;
  try {
    updated = await transitionAwaitingBatch(
      req.params.batchId as string,
      'pending',
      {
        // Bulk pickup is free. Individual delivery pricing happens after office processing.
        deliveryFee: 0,
        pickupRiderId,
        assignedRiderId: pickupRiderId,
        opsRemarks: parsed.data.opsRemarks,
      },
      'Bulk pickup accepted; awaiting office processing'
    );
  } catch (err) {
    if (err instanceof BatchConflictError) return res.status(409).json({ error: err.message });
    throw err;
  }
  if (!updated) return res.status(404).json({ error: 'Bulk order not found or already processed' });

  const first = updated[0]!;
  if (first.customerId) {
    notify(first.customerId, 'shipment_price_updated', 'Bulk pickup accepted',
      `Your bulk pickup of ${updated.length} package(s) from ${first.pickupLocation} has been accepted.`, first.id).catch(() => {});
  }
  if (first.pickupRider) {
    notify(first.pickupRider.userId, 'shipment_assigned', 'Bulk pickup assigned',
      `You've been assigned a bulk pickup of ${updated.length} package(s) from ${first.pickupLocation}.`, first.id).catch(() => {});
  }

  res.json(updated);
});

const bulkDeclineSchema = z.object({ reason: z.string().trim().optional() });

router.patch('/batch/:batchId/decline', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = bulkDeclineSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid bulk decline details' });
  const reason = parsed.data.reason || 'Bulk order declined by operations';

  let updated;
  try {
    updated = await transitionAwaitingBatch(req.params.batchId as string, 'cancelled', { opsRemarks: reason }, reason);
  } catch (err) {
    if (err instanceof BatchConflictError) return res.status(409).json({ error: err.message });
    throw err;
  }
  if (!updated) return res.status(404).json({ error: 'Bulk order not found or already processed' });

  const first = updated[0]!;
  if (first.customerId) {
    notify(first.customerId, 'shipment_cancelled', 'Bulk pickup declined',
      `Your bulk pickup of ${updated.length} package(s) was declined: ${reason}`, first.id).catch(() => {});
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
