import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
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

router.get('/', requireRole('operations', 'admin'), async (_req, res) => {
  const riders = await prisma.riderProfile.findMany({
    include: { user: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(riders);
});

const updateSchema = z.object({
  vehicleId: z.string().min(1).optional(),
  vehicleType: z.enum(['motorbike', 'van', 'truck']).optional(),
  currentStatus: z.enum(['available', 'en_route', 'loading', 'maintenance', 'offline']).optional(),
  currentLocation: z.string().optional(),
  isVerified: z.boolean().optional(),
});

router.patch('/:id', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  try {
    const previous = await prisma.riderProfile.findUnique({ where: { id: req.params.id as string }, select: { isVerified: true, userId: true } });

    const rider = await prisma.riderProfile.update({
      where: { id: req.params.id as string },
      data: parsed.data,
      include: { user: { select: { id: true, name: true, phone: true } } },
    });

    if (parsed.data.isVerified === true && previous && !previous.isVerified) {
      notify(
        rider.user.id,
        'rider_verified',
        'Account Verified',
        'Your rider account has been verified by operations. You can now go online and receive deliveries.'
      ).catch(() => {});
    }

    res.json(rider);
  } catch {
    res.status(404).json({ error: 'Rider not found' });
  }
});

const createRiderSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  password: z.string().min(8),
  vehicleId: z.string().min(1).optional(),
  vehicleType: z.enum(['motorbike', 'van', 'truck']).optional(),
});

router.post('/', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = createRiderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }
  const { name, email, phone, password, vehicleId, vehicleType } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      role: 'rider',
      riderProfile: { create: { vehicleId, vehicleType } },
    },
    include: { riderProfile: true },
  });

  const riderProfile = await prisma.riderProfile.findUnique({
    where: { id: user.riderProfile!.id },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });

  res.status(201).json(riderProfile);
});

export default router;
