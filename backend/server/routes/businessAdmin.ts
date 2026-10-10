/**
 * CPS staff (operations and admin) manage business (Partner API) accounts:
 * register a business on its behalf (login details are texted to the
 * owner), edit, approve/suspend, resend login details, or delete.
 */
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { notify } from '../lib/notifications';
import { generateWebhookSecret } from '../lib/apiKeys';
import { generateTempPassword, hashPassword, sendLoginDetails } from '../lib/credentials';

const router = Router();
router.use(requireAuth, requireRole('admin', 'operations'));

const businessInclude = {
  owner: { select: { id: true, name: true, phone: true, email: true, suspendedAt: true } },
  _count: { select: { shipments: true, apiKeys: { where: { revokedAt: null } } } },
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
});

/** Registers a business (approved) and texts the owner their login details. */
router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  const { businessName, ownerName, phone, email, webhookUrl } = parsed.data;
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
