/**
 * CPS Partner API v1 — for businesses (e.g. Shopyos) that create deliveries
 * programmatically. Authenticated with a secret API key, not a user session.
 * Reference: docs/partner-api/README.md and backend/openapi/partner-v1.yaml.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { Router, type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { Prisma, type ShipmentStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { generateTrackingCode } from '../../lib/trackingCode';
import { notifyRoles } from '../../lib/notifications';
import { coverage, quote } from '../../lib/coverage';
import { SIZE_CATEGORIES, packageSizeFor, rateCardFor, type Point } from '../../lib/rateCard';
import { DELIVERY_CODE_PATTERN, hashDeliveryCode } from '../../lib/deliveryCode';
import { notifyReceiverOfStatus, shipmentInclude } from '../../lib/shipmentService';
import { toPartnerShipment } from '../../lib/partnerSerializer';
import { recordShipmentEvent } from '../../lib/webhooks';
import { partnerError, requireApiKey } from '../../middleware/apiKey';

const router = Router();

const OPENAPI_PATH = fileURLToPath(new URL('../../../openapi/partner-v1.yaml', import.meta.url));

// Public: lets the docs page and code generators fetch the spec.
router.get('/openapi.yaml', (_req, res) => {
  try {
    res.type('application/yaml').send(readFileSync(OPENAPI_PATH, 'utf8'));
  } catch {
    partnerError(res, 404, 'not_found', 'OpenAPI spec not available.');
  }
});

router.use(requireApiKey);
router.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => req.business!.apiKeyId,
  handler: (_req, res) => partnerError(res, 429, 'rate_limited', 'Too many requests. Limit is 120 per minute per key.'),
}));

function invalid(res: Parameters<typeof partnerError>[0], error: z.ZodError) {
  const issue = error.issues[0];
  return partnerError(res, 400, 'invalid_request', issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'Invalid request',
    error.issues.map(i => ({ path: i.path.join('.'), message: i.message })));
}

const kumasiSubArea = z.enum(['CampusAndEnvirons', 'Other']);
const sizeCategory = z.enum(SIZE_CATEGORIES);
const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

/** Most extra shops one rider collects on a multi-pickup trip. */
const MAX_EXTRA_PICKUPS = 5;

function pointOf(p: { latitude?: number; longitude?: number }): Point | null {
  return p.latitude !== undefined && p.longitude !== undefined ? { latitude: p.latitude, longitude: p.longitude } : null;
}

// ── Coverage & quotes ────────────────────────────────────────────────────────

router.get('/coverage', async (req, res) => {
  res.json(coverage(await rateCardFor(req.business!.id)));
});

const quoteSchema = z.object({
  pickupRegion: z.string().trim().min(1),
  dropoffRegion: z.string().trim().min(1),
  dropoffKumasiSubArea: kumasiSubArea.optional(),
  // Only change the price for a business with a rate card.
  sizeCategory: sizeCategory.optional(),
  speed: z.enum(['same_day', 'next_day', 'express']).optional(),
  pickupLatitude: latitude.optional(),
  pickupLongitude: longitude.optional(),
  dropoffLatitude: latitude.optional(),
  dropoffLongitude: longitude.optional(),
  /** Multi-pickup (rate-card businesses): the other shops' map pins, collected on the same trip. */
  extraPickups: z.array(z.object({ latitude, longitude })).max(MAX_EXTRA_PICKUPS).optional(),
});

router.post('/quotes', async (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  const q = parsed.data;
  res.json(quote({
    pickupRegion: q.pickupRegion,
    dropoffRegion: q.dropoffRegion,
    dropoffKumasiSubArea: q.dropoffKumasiSubArea,
    sizeCategory: q.sizeCategory,
    express: q.speed === 'express',
    pickup: pointOf({ latitude: q.pickupLatitude, longitude: q.pickupLongitude }),
    dropoff: pointOf({ latitude: q.dropoffLatitude, longitude: q.dropoffLongitude }),
    extraPickups: q.extraPickups?.map(pointOf),
  }, await rateCardFor(req.business!.id)));
});

// ── Shipments ────────────────────────────────────────────────────────────────

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(20),
  region: z.string().trim().min(1),
  location: z.string().trim().min(1).max(300),
});

const createShipmentSchema = z.object({
  externalReference: z.string().trim().min(1).max(100),
  pickup: contactSchema.extend({
    latitude: latitude.optional(),
    longitude: longitude.optional(),
  }),
  dropoff: contactSchema.extend({
    kumasiSubArea: kumasiSubArea.optional(),
    latitude: latitude.optional(),
    longitude: longitude.optional(),
  }),
  /**
   * Multi-pickup (rate-card businesses): other shops the same rider collects
   * from before the one drop-off, in collection order. Each needs a map pin
   * within the rate card's radius of `pickup` (which then needs one too).
   */
  extraPickups: z.array(contactSchema.extend({
    latitude,
    longitude,
    /** Your own reference for this shop's parcel (e.g. your order id). */
    reference: z.string().trim().max(100).optional(),
  })).max(MAX_EXTRA_PICKUPS).optional(),
  package: z.object({
    type: z.enum(['document', 'parcel', 'electronics', 'fragile', 'food', 'other']).default('parcel'),
    size: z.enum(['small', 'medium', 'big']).default('medium'),
    /** Rate-card businesses: the parcel size the price is worked out from. */
    sizeCategory: sizeCategory.optional(),
    weightKg: z.number().positive().optional(),
    description: z.string().max(300).optional(),
  }).default({}),
  speed: z.enum(['same_day', 'next_day', 'express']).default('next_day'),
  priority: z.enum(['standard', 'high']).default('standard'),
  /** The fee the partner quoted to its customer. Must match the current CPS price. */
  expectedFee: z.number().nonnegative(),
  /** Code the recipient gives the rider at the door (4–8 digits). */
  deliveryCode: z.string().trim().regex(DELIVERY_CODE_PATTERN, 'must be 4 to 8 digits').optional(),
  instructions: z.string().max(1000).optional(),
});

async function findOwnShipment(businessId: string, ref: string) {
  return prisma.shipment.findFirst({
    where: { businessId, OR: [{ externalReference: ref }, { trackingCode: ref }] },
    include: shipmentInclude,
  });
}

function buildInstructions(data: z.infer<typeof createShipmentSchema>) {
  const parts = [data.instructions, data.package.description && `Package: ${data.package.description}`];
  if (data.extraPickups?.length) {
    parts.push(`Collect from ${data.extraPickups.length + 1} shops: ${data.pickup.name}, ${data.extraPickups.map(p => p.name).join(', ')}`);
  }
  if (data.dropoff.latitude !== undefined && data.dropoff.longitude !== undefined) {
    parts.push(`Map: https://maps.google.com/?q=${data.dropoff.latitude},${data.dropoff.longitude}`);
  }
  return parts.filter(Boolean).join('\n') || undefined;
}

router.post('/shipments', async (req, res) => {
  const parsed = createShipmentSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);
  const data = parsed.data;
  const business = req.business!;

  // Idempotency: retries with the same externalReference return the original shipment.
  const existing = await findOwnShipment(business.id, data.externalReference);
  if (existing && existing.externalReference === data.externalReference) {
    return res.status(200).json(toPartnerShipment(existing));
  }

  const terms = await rateCardFor(business.id);
  const price = quote({
    pickupRegion: data.pickup.region,
    dropoffRegion: data.dropoff.region,
    dropoffKumasiSubArea: data.dropoff.kumasiSubArea,
    sizeCategory: data.package.sizeCategory,
    express: data.speed === 'express',
    pickup: pointOf(data.pickup),
    dropoff: pointOf(data.dropoff),
    extraPickups: data.extraPickups?.map(pointOf),
  }, terms);
  if (!price.serviceable) {
    return partnerError(res, 422, 'not_serviceable', price.message,
      { reason: price.reason, ...(price.tooFar ? { tooFar: price.tooFar } : {}) });
  }
  // Every shop on a multi-pickup trip must be in the city the trip starts from.
  if (data.extraPickups?.some(p => p.region.trim().toLowerCase() !== price.pickupRegion.toLowerCase())) {
    return partnerError(res, 422, 'not_serviceable',
      `Every shop on one trip must be in ${price.pickupRegion}. Book the others separately.`,
      { reason: 'pickups_too_far' });
  }
  if (Math.round(price.fee * 100) !== Math.round(data.expectedFee * 100)) {
    return partnerError(res, 409, 'fee_mismatch',
      `The delivery fee is GHS ${price.fee.toFixed(2)}, not GHS ${data.expectedFee.toFixed(2)}. Re-quote and retry.`,
      { fee: price.fee });
  }

  const trackingCode = generateTrackingCode();
  const breakdown = price.breakdown;
  let shipment;
  try {
    shipment = await prisma.shipment.create({
      data: {
        trackingCode,
        businessId: business.id,
        externalReference: data.externalReference,
        prepaid: true,
        // Partner orders are priced by the binding quote, so they skip ops pricing.
        status: 'pending',
        vehicleType: 'motorbike',
        priority: data.priority,
        speed: data.speed,
        packageType: data.package.type,
        // A rate-card size decides what riders see; otherwise the partner's own size.
        packageSize: breakdown && data.package.sizeCategory ? packageSizeFor(data.package.sizeCategory) : data.package.size,
        deliveryType: 'doorstep',
        weightKg: data.package.weightKg,
        senderName: data.pickup.name,
        senderNumber: data.pickup.phone,
        pickupRegion: price.pickupRegion,
        pickupLocation: data.pickup.location,
        receiverName: data.dropoff.name,
        receiverNumber: data.dropoff.phone,
        dropoffRegion: price.dropoffRegion,
        dropoffKumasiSubArea: price.dropoffRegion === 'Kumasi' ? (data.dropoff.kumasiSubArea ?? 'Other') : undefined,
        dropoffLocation: data.dropoff.location,
        deliveryFee: price.fee,
        // The share agreed when this delivery was booked. Invoices bill each
        // delivery at its own share, so changing the business's share later
        // only affects deliveries booked after the change.
        cpsSharePercent: business.cpsSharePercent,
        ...(breakdown && terms ? {
          sizeCategory: breakdown.sizeCategory,
          baseFee: breakdown.routeFee,
          outskirtsFee: breakdown.outskirtsFee,
          rateCardTerms: terms as unknown as Prisma.InputJsonValue,
        } : {}),
        ...(data.extraPickups?.length ? {
          extraPickupsFee: breakdown?.extraPickupsFee ?? 0,
          pickupLatitude: data.pickup.latitude,
          pickupLongitude: data.pickup.longitude,
          extraPickups: {
            create: data.extraPickups.map((p, i) => ({
              sequence: i + 1,
              name: p.name,
              phone: p.phone,
              region: price.pickupRegion,
              location: p.location,
              latitude: p.latitude,
              longitude: p.longitude,
              reference: p.reference,
            })),
          },
        } : {}),
        additionalInstructions: buildInstructions(data),
        deliveryCodeHash: data.deliveryCode ? hashDeliveryCode(trackingCode, data.deliveryCode) : undefined,
        statusEvents: { create: { status: 'pending', note: `Created via Partner API by ${business.name}` } },
      },
      include: shipmentInclude,
    });
  } catch (err) {
    // Two concurrent creates with the same reference: return the winner.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const winner = await findOwnShipment(business.id, data.externalReference);
      if (winner) return res.status(200).json(toPartnerShipment(winner));
    }
    throw err;
  }

  const extraShops = shipment.extraPickups?.length ?? 0;
  notifyRoles(['operations', 'admin'], 'new_order', `New ${business.name} order`,
    `${business.name} order ${shipment.trackingCode} (${shipment.pickupLocation}${extraShops ? ` + ${extraShops} more shop${extraShops > 1 ? 's' : ''}` : ''} -> ${shipment.dropoffLocation}) needs a rider.`,
    shipment.id).catch(() => {});
  void notifyReceiverOfStatus(shipment, 'pending');
  await recordShipmentEvent(shipment.id, 'shipment.created');

  res.status(201).json(toPartnerShipment(shipment));
});

const listSchema = z.object({
  status: z.enum(['awaiting_price', 'pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'delayed', 'failed', 'cancelled']).optional(),
  updatedSince: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

function encodeCursor(s: { updatedAt: Date; id: string }) {
  return Buffer.from(`${s.updatedAt.toISOString()}|${s.id}`).toString('base64url');
}

function decodeCursor(cursor: string) {
  const [at, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const updatedAt = new Date(at ?? '');
  return id && !Number.isNaN(updatedAt.getTime()) ? { updatedAt, id } : null;
}

/** Oldest-updated first, so partners can page forward with `updatedSince` to reconcile. */
router.get('/shipments', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error);
  const { status, updatedSince, limit, cursor } = parsed.data;

  const after = cursor ? decodeCursor(cursor) : null;
  if (cursor && !after) return partnerError(res, 400, 'invalid_request', 'cursor: invalid cursor');

  const filters: Prisma.ShipmentWhereInput[] = [{ businessId: req.business!.id }];
  if (status) filters.push({ status: status as ShipmentStatus });
  if (updatedSince) filters.push({ updatedAt: { gte: updatedSince } });
  if (after) {
    filters.push({
      OR: [
        { updatedAt: { gt: after.updatedAt } },
        { updatedAt: after.updatedAt, id: { gt: after.id } },
      ],
    });
  }

  const rows = await prisma.shipment.findMany({
    where: { AND: filters },
    orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    take: limit + 1,
    include: shipmentInclude,
  });
  const page = rows.slice(0, limit);
  res.json({
    data: page.map(toPartnerShipment),
    nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1]!) : null,
  });
});

router.get('/shipments/:ref', async (req, res) => {
  const shipment = await findOwnShipment(req.business!.id, req.params.ref as string);
  if (!shipment) return partnerError(res, 404, 'not_found', 'Shipment not found.');
  res.json(toPartnerShipment(shipment));
});

const cancelSchema = z.object({ reason: z.string().trim().max(500).optional() });
const PARTNER_CANCELLABLE: ShipmentStatus[] = ['awaiting_price', 'pending'];

router.post('/shipments/:ref/cancel', async (req, res) => {
  const parsed = cancelSchema.safeParse(req.body ?? {});
  if (!parsed.success) return invalid(res, parsed.error);

  const shipment = await findOwnShipment(req.business!.id, req.params.ref as string);
  if (!shipment) return partnerError(res, 404, 'not_found', 'Shipment not found.');
  if (shipment.status === 'cancelled') return res.json(toPartnerShipment(shipment));
  if (!PARTNER_CANCELLABLE.includes(shipment.status)) {
    return partnerError(res, 409, 'conflict',
      `Shipment is ${shipment.status} and can no longer be cancelled through the API. Contact CPS operations.`);
  }

  const reason = parsed.data.reason || `Cancelled by ${req.business!.name}`;
  const cancelled = await prisma.$transaction(async tx => {
    // Conditional so a rider picking up at the same moment wins cleanly.
    const { count } = await tx.shipment.updateMany({
      where: { id: shipment.id, status: { in: PARTNER_CANCELLABLE } },
      data: { status: 'cancelled', opsRemarks: reason },
    });
    if (count === 0) return false;
    await tx.shipmentStatusEvent.create({ data: { shipmentId: shipment.id, status: 'cancelled', note: reason } });
    return true;
  });
  if (!cancelled) {
    return partnerError(res, 409, 'conflict', 'Shipment changed while cancelling; fetch it and try again.');
  }

  notifyRoles(['operations', 'admin'], 'shipment_cancelled', `${req.business!.name} cancelled ${shipment.trackingCode}`,
    reason, shipment.id).catch(() => {});
  await recordShipmentEvent(shipment.id, 'shipment.cancelled');

  const updated = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id }, include: shipmentInclude });
  res.json(toPartnerShipment(updated));
});

router.use((_req, res) => partnerError(res, 404, 'not_found', 'Unknown endpoint.'));

/**
 * Partners always get the JSON error shape, never Express's HTML error page.
 * Mounted at app level after the router so it also catches body-parser errors.
 */
export const partnerErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return partnerError(res, 400, 'invalid_request', 'Request body is not valid JSON.');
  }
  console.error('[partner-api] Unhandled error:', err);
  partnerError(res, 500, 'internal_error', 'Something went wrong on our side. Retry, or contact CPS if it persists.');
};

export default router;
