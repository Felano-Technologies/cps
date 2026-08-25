import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

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
});

router.patch('/:id', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  try {
    const rider = await prisma.riderProfile.update({
      where: { id: req.params.id as string },
      data: parsed.data,
      include: { user: { select: { id: true, name: true, phone: true } } },
    });
    res.json(rider);
  } catch {
    res.status(404).json({ error: 'Rider not found' });
  }
});

export default router;
