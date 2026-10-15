/**
 * CPS staff (operations and admin) manage business (Partner API) accounts:
 * register a business on its behalf (login details are texted to the
 * owner), edit, approve/suspend, resend login details, or delete.
 */
import { Router } from 'express';
import { Prisma, type BusinessRateCard } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { notify } from '../lib/notifications';
import { generateWebhookSecret } from '../lib/apiKeys';
import { generateTempPassword, hashPassword, sendLoginDetails } from '../lib/credentials';
import { calculateRouteCost } from '../lib/pricing';
import { SIZE_CATEGORIES, sizedFee, termsOf } from '../lib/rateCard';

const router = Router();
router.use(requireAuth, requireRole('admin', 'operations'));

const businessInclude = {
  owner: { select: { id: true, name: true, phone: true, email: true, suspendedAt: true } },
  _count: { select: { shipments: true, apiKeys: { where: { revokedAt: null } } } },
  rateCard: { select: { enabled: true } },
} as const;

type BusinessRow = Prisma.BusinessGetPayload<{ include: typeof businessInclude }>;

function view(b: BusinessRow) {
  return {
    id: b.id,
    name: b.name,
    status: b.status,
    contactEmail: b.contactEmail,
    contactPhone: b.contactPhone,
    webhookUrl: b.webhookUrl,
    cpsSharePercent: Number(b.cpsSharePercent),
    /** Custom pricing (sizes, outer areas, express) is on for this business. */
    hasRateCard: !!b.rateCard?.enabled,
    owner: b.owner,
    shipmentCount: b._count.shipments,
    activeKeyCount: b._count.apiKeys,
    createdAt: b.createdAt,
  };
}

function uniqueClash(err: unknown): string | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = String((err.meta as { target?: unknown })?.target ?? '');
    return target.includes('phone') ? 'Another account already uses this phone number' : 'Another account already uses this email';
  }
  return null;
}

router.get('/', async (_req, res) => {
  const businesses = await prisma.business.findMany({ orderBy: { createdAt: 'desc' }, include: businessInclude });
  res.json(businesses.map(view));
});

const createSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7),
  email: z.string().trim().email().optional(),
  webhookUrl: z.string().trim().url().optional(),
  cpsSharePercent: z.number().min(0).max(100).optional(),
});

/** Registers a business (approved) and texts the owner their login details. */
router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  const { businessName, ownerName, phone, email, webhookUrl, cpsSharePercent } = parsed.data;
  if (await prisma.user.findUnique({ where: { phone }, select: { id: true } })) {
    return res.status(409).json({ error: 'Another account already uses this phone number' });
  }
  const tempPassword = generateTempPassword();

  let created;
  try {
    created = await prisma.business.create({
      data: {
        name: businessName,
        contactEmail: email,
        contactPhone: phone,
        status: 'approved',
        webhookUrl,
        cpsSharePercent,
        webhookSecret: generateWebhookSecret(),
        owner: {
          create: {
            name: ownerName,
            phone,
            phoneVerified: true,
            email: email || `${phone.replace(/[^0-9]/g, '')}@phone.cps.local`,
            role: 'business',
            passwordHash: await hashPassword(tempPassword),
          },
        },
      },
      include: businessInclude,
    });
  } catch (err) {
    const clash = uniqueClash(err);
    if (clash) return res.status(409).json({ error: clash });
    throw err;
  }

  sendLoginDetails(phone, { name: ownerName, accountLabel: `${businessName} business`, password: tempPassword });
  // The only time the password is returned; it's also been texted to the owner.
  res.status(201).json({ ...view(created), tempPassword });
});

const updateSchema = z.object({
  status: z.enum(['pending', 'approved', 'suspended']).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  contactEmail: z.string().trim().email().nullable().optional(),
  contactPhone: z.string().trim().min(7).nullable().optional(),
  ownerName: z.string().trim().min(1).max(120).optional(),
  /** Changes the number the owner signs in with. */
  ownerPhone: z.string().trim().min(7).optional(),
  /** CPS's cut of each delivery fee. Applies to invoices raised from now on. */
  cpsSharePercent: z.number().min(0).max(100).optional(),
});

router.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  const { ownerName, ownerPhone, ...fields } = parsed.data;

  const business = await prisma.business.findUnique({ where: { id: req.params.id as string } });
  if (!business) return res.status(404).json({ error: 'Business not found' });

  let updated;
  try {
    // API keys check business status on every request, so suspension takes effect immediately.
    updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        ...fields,
        ...(ownerName || ownerPhone ? { owner: { update: { name: ownerName, phone: ownerPhone } } } : {}),
      },
      include: businessInclude,
    });
  } catch (err) {
    const clash = uniqueClash(err);
    if (clash) return res.status(409).json({ error: clash });
    throw err;
  }

  if (fields.status && business.status !== updated.status) {
    const message = updated.status === 'approved'
      ? 'Your business is approved. You can now create API keys in the CPS Business portal.'
      : updated.status === 'suspended'
        ? 'Your Partner API access has been suspended. Contact CPS for details.'
        : 'Your business account is under review.';
    notify(business.ownerUserId, 'business_status', `Business ${updated.status}`, message).catch(() => {});
  }

  res.json(view(updated));
});

// ── Rate card (custom pricing for this business only) ───────────────────────

function rateCardAdminView(card: BusinessRateCard) {
  const terms = termsOf(card);
  return {
    enabled: card.enabled,
    mediumKumasiPrice: terms.sizeKumasiPrices.medium,
    bigKumasiPrice: terms.sizeKumasiPrices.big,
    bigPlusKumasiPrice: terms.sizeKumasiPrices.big_plus,
    roundTo: terms.roundTo,
    outskirtsFee: terms.outskirtsFee,
    outskirtsAreas: terms.outskirtsAreas,
    expressMultiplier: terms.expressMultiplier,
    extraPickupFee: terms.extraPickupFee,
    extraPickupRadiusKm: terms.extraPickupRadiusKm,
    updatedAt: card.updatedAt,
    /** What a few common deliveries cost under these terms, to sanity-check edits. */
    examples: ['Kumasi', 'Accra'].map(to => {
      const routeFee = calculateRouteCost({ pickupRegion: 'Kumasi', dropoffRegion: to })!;
      return {
        route: `Kumasi → ${to}`,
        ...Object.fromEntries(SIZE_CATEGORIES.map(s => [s, sizedFee(terms, routeFee, s)])),
      };
    }),
  };
}

router.get('/:id/rate-card', async (req, res) => {
  const card = await prisma.businessRateCard.findUnique({ where: { businessId: req.params.id as string } });
  res.json(card ? rateCardAdminView(card) : null);
});

const price = z.number().positive().max(10_000);
const rateCardSchema = z.object({
  enabled: z.boolean().optional(),
  mediumKumasiPrice: price.optional(),
  bigKumasiPrice: price.optional(),
  bigPlusKumasiPrice: price.optional(),
  roundTo: z.number().min(0).max(100).optional(),
  outskirtsFee: z.number().min(0).max(1_000).optional(),
  outskirtsAreas: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radiusKm: z.number().positive().max(50),
  })).max(100).optional(),
  expressMultiplier: z.number().min(1).max(10).optional(),
  /** Multi-pickup: added for each extra nearby shop on the same trip. */
  extraPickupFee: z.number().min(0).max(1_000).optional(),
  /** Multi-pickup: how far (km) extra shops may be from the first pickup. */
  extraPickupRadiusKm: z.number().positive().max(50).optional(),
});

/**
 * Creates or edits the business's rate card. Deliveries already booked keep
 * the terms they were booked under.
 */
router.put('/:id/rate-card', async (req, res) => {
  const parsed = rateCardSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid input' });
  }
  const business = await prisma.business.findUnique({ where: { id: req.params.id as string }, select: { id: true } });
  if (!business) return res.status(404).json({ error: 'Business not found' });

  const card = await prisma.businessRateCard.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, ...parsed.data },
    update: parsed.data,
  });
  res.json(rateCardAdminView(card));
});

/** Generates a new temporary password for the owner and texts the login details. */
router.post('/:id/resend-details', async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id as string }, include: businessInclude });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  const phone = business.owner.phone;
  if (!phone) return res.status(400).json({ error: 'The owner has no phone number. Add one first.' });

  const tempPassword = generateTempPassword();
  await prisma.user.update({ where: { id: business.owner.id }, data: { passwordHash: await hashPassword(tempPassword) } });
  sendLoginDetails(phone, { name: business.owner.name, accountLabel: `${business.name} business`, password: tempPassword });
  res.json({ tempPassword, sentTo: phone });
});

/**
 * Permanently deletes the business, its owner login, API keys and webhook
 * history. Its past orders stay in CPS but are no longer linked to it.
 */
router.delete('/:id', async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id as string } });
  if (!business) return res.status(404).json({ error: 'Business not found' });
  await prisma.user.delete({ where: { id: business.ownerUserId } });
  res.status(204).send();
});

export default router;
