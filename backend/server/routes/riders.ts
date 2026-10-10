import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { generateTempPassword, hashPassword, sendLoginDetails } from '../lib/credentials';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { notify } from '../lib/notifications';

const router = Router();
router.use(requireAuth);

router.get('/me', requireRole('rider'), async (req, res) => {
  const profile = await prisma.riderProfile.findUnique({
    where: { userId: req.auth!.userId },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  if (!profile) {
    return res.status(404).json({ error: 'Rider profile not found' });
  }
  res.json(profile);
});

const selfStatusSchema = z.object({
  currentStatus: z.enum(['available', 'en_route', 'loading', 'maintenance', 'offline']),
});

router.patch('/me/status', requireRole('rider'), async (req, res) => {
  const parsed = selfStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  if (parsed.data.currentStatus !== 'offline') {
    const existing = await prisma.riderProfile.findUnique({ where: { userId: req.auth!.userId }, select: { isVerified: true } });
    if (!existing?.isVerified) {
      return res.status(403).json({ error: 'Your account is awaiting verification by operations. You cannot go online yet.' });
    }
  }

  const profile = await prisma.riderProfile.update({
    where: { userId: req.auth!.userId },
    data: { currentStatus: parsed.data.currentStatus },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });
  res.json(profile);
});

const riderInclude = { user: { select: { id: true, name: true, phone: true, email: true, suspendedAt: true } } } as const;

router.get('/', requireRole('operations', 'admin'), async (_req, res) => {
  const riders = await prisma.riderProfile.findMany({
    include: riderInclude,
    orderBy: { createdAt: 'asc' },
  });
  res.json(riders);
});

/** 409 message for a clash on a unique user field (phone/email), or null. */
function uniqueClash(err: unknown): string | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = String((err.meta as { target?: unknown })?.target ?? '');
    return target.includes('phone') ? 'Another account already uses this phone number' : 'Another account already uses this email';
  }
  return null;
}

const updateSchema = z.object({
  // Account details
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(7).optional(),
  email: z.string().trim().email().optional(),
  // Rider profile
  vehicleId: z.string().min(1).nullable().optional(),
  vehicleType: z.enum(['motorbike', 'van', 'truck']).nullable().optional(),
  currentStatus: z.enum(['available', 'en_route', 'loading', 'maintenance', 'offline']).optional(),
  currentLocation: z.string().optional(),
  isVerified: z.boolean().optional(),
});

router.patch('/:id', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }
  const { name, phone, email, ...profile } = parsed.data;

  const previous = await prisma.riderProfile.findUnique({ where: { id: req.params.id as string }, select: { isVerified: true, userId: true } });
  if (!previous) return res.status(404).json({ error: 'Rider not found' });

  try {
    const rider = await prisma.riderProfile.update({
      where: { id: req.params.id as string },
      data: {
        ...profile,
        ...(name || phone || email ? { user: { update: { name, phone, email } } } : {}),
      },
      include: riderInclude,
    });

    if (parsed.data.isVerified === true && !previous.isVerified) {
      notify(
        rider.user.id,
        'rider_verified',
        'Account Verified',
        'Your rider account has been verified by operations. You can now go online and receive deliveries.'
      ).catch(() => {});
    }

    res.json(rider);
  } catch (err) {
    const clash = uniqueClash(err);
    if (clash) return res.status(409).json({ error: clash });
    throw err;
  }
});

const suspendSchema = z.object({ suspended: z.boolean() });

/** Suspend (blocks sign-in, takes them offline, can't be assigned) or reactivate. */
router.post('/:id/suspend', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = suspendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'suspended must be true or false' });

  const existing = await prisma.riderProfile.findUnique({ where: { id: req.params.id as string } });
  if (!existing) return res.status(404).json({ error: 'Rider not found' });

  const rider = await prisma.riderProfile.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.suspended ? { currentStatus: 'offline' } : {}),
      user: { update: { suspendedAt: parsed.data.suspended ? new Date() : null } },
    },
    include: riderInclude,
  });
  if (!parsed.data.suspended) {
    notify(rider.user.id, 'account_reactivated', 'Account reactivated',
      'Operations reactivated your rider account. You can sign in again.').catch(() => {});
  }
  res.json(rider);
});

/** Generates a new temporary password and texts the login details again. */
router.post('/:id/resend-details', requireRole('operations', 'admin'), async (req, res) => {
  const existing = await prisma.riderProfile.findUnique({ where: { id: req.params.id as string }, include: riderInclude });
  if (!existing) return res.status(404).json({ error: 'Rider not found' });
  if (!existing.user.phone) return res.status(400).json({ error: 'This rider has no phone number. Add one first.' });

  const tempPassword = generateTempPassword();
  await prisma.user.update({ where: { id: existing.userId }, data: { passwordHash: await hashPassword(tempPassword) } });
  sendLoginDetails(existing.user.phone, { name: existing.user.name, accountLabel: 'CPS rider', password: tempPassword });
  res.json({ tempPassword, sentTo: existing.user.phone });
});

/**
 * Permanently deletes the rider's account. Their past orders stay but lose
 * the rider link; their bonus and deduction records are deleted with them.
 */
router.delete('/:id', requireRole('operations', 'admin'), async (req, res) => {
  const existing = await prisma.riderProfile.findUnique({ where: { id: req.params.id as string } });
  if (!existing) return res.status(404).json({ error: 'Rider not found' });
  await prisma.user.delete({ where: { id: existing.userId } });
  res.status(204).send();
});

const createRiderSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(7),
  email: z.string().trim().email().optional(),
  vehicleId: z.string().min(1).optional(),
  vehicleType: z.enum(['motorbike', 'van', 'truck']).optional(),
});

/** Ops register a rider; the login details are texted to the rider. */
router.post('/', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = createRiderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }
  const { name, email, phone, vehicleId, vehicleType } = parsed.data;
  if (await prisma.user.findUnique({ where: { phone }, select: { id: true } })) {
    return res.status(409).json({ error: 'Another account already uses this phone number' });
  }
  const tempPassword = generateTempPassword();

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name,
        email: email || `${phone.replace(/[^0-9]/g, '')}@phone.cps.local`,
        phone,
        // Ops entered the number themselves; the rider proves it by receiving the SMS.
        phoneVerified: true,
        passwordHash: await hashPassword(tempPassword),
        role: 'rider',
        riderProfile: { create: { vehicleId, vehicleType } },
      },
      include: { riderProfile: true },
    });
  } catch (err) {
    const clash = uniqueClash(err);
    if (clash) return res.status(409).json({ error: clash });
    throw err;
  }

  sendLoginDetails(phone, { name, accountLabel: 'CPS rider', password: tempPassword });

  const riderProfile = await prisma.riderProfile.findUnique({ where: { id: user.riderProfile!.id }, include: riderInclude });
  // The only time the password is returned; it's also been texted to the rider.
  res.status(201).json({ ...riderProfile, tempPassword });
});

export default router;
