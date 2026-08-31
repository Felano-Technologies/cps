import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { notify } from '../lib/notifications';

const router = Router();
router.use(requireAuth);

const DEDUCTION_CATEGORIES = [
  'late_delivery',
  'damaged_goods',
  'fuel_advance',
  'equipment',
  'disciplinary',
  'loan_repayment',
  'other',
] as const;

const createDeductionSchema = z.object({
  riderId: z.string().min(1, 'Rider is required'),
  amount: z.union([z.string(), z.number()]).transform((val) => Number(val)).refine(val => val > 0, 'Amount must be greater than zero'),
  category: z.enum(DEDUCTION_CATEGORIES),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
  shipmentId: z.string().optional(),
  notifyRider: z.boolean().optional().default(true),
});

// GET /api/deductions/me - the logged-in rider's own deductions
router.get('/me', requireRole('rider'), async (req, res) => {
  try {
    const riderProfile = await prisma.riderProfile.findUnique({ where: { userId: req.auth!.userId }, select: { id: true } });
    if (!riderProfile) {
      return res.json([]);
    }

    const deductions = await prisma.riderDeduction.findMany({
      where: { riderId: riderProfile.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(deductions);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch deductions' });
  }
});

// GET /api/deductions - list deductions
router.get('/', requireRole('rider', 'operations', 'admin'), async (req, res) => {
  const { riderId, category, search } = req.query as { riderId?: string; category?: string; search?: string };

  const where: Record<string, unknown> = {};

  if (req.auth!.role === 'rider') {
    const profile = await prisma.riderProfile.findUnique({ where: { userId: req.auth!.userId }, select: { id: true } });
    where.riderId = profile?.id ?? '__none__';
  } else if (riderId) {
    where.riderId = riderId;
  }

  if (category && (DEDUCTION_CATEGORIES as readonly string[]).includes(category)) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { reason: { contains: search, mode: 'insensitive' } },
      { shipmentId: { contains: search, mode: 'insensitive' } },
      { rider: { user: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  try {
    const deductions = await prisma.riderDeduction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        rider: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    res.json(deductions);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch deductions' });
  }
});

// GET /api/deductions/summary - KPI summary
router.get('/summary', requireRole('operations', 'admin'), async (_req, res) => {
  try {
    const deductions = await prisma.riderDeduction.findMany({
      include: {
        rider: { select: { id: true } },
      },
    });

    const totalAmount = deductions.reduce((acc, d) => acc + Number(d.amount), 0);
    const totalCount = deductions.length;
    const uniqueRiders = new Set(deductions.map(d => d.riderId)).size;

    const categoryBreakdown: Record<string, number> = {};
    deductions.forEach(d => {
      categoryBreakdown[d.category] = (categoryBreakdown[d.category] || 0) + Number(d.amount);
    });

    res.json({
      totalAmount,
      totalCount,
      uniqueRiders,
      categoryBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load deductions summary' });
  }
});

// POST /api/deductions - create a deduction
router.post('/', requireRole('operations', 'admin'), async (req, res) => {
  const parsed = createDeductionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid deduction data' });
  }

  const { riderId, amount, category, reason, shipmentId, notifyRider } = parsed.data;

  try {
    const rider = await prisma.riderProfile.findUnique({
      where: { id: riderId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    const deduction = await prisma.riderDeduction.create({
      data: {
        riderId,
        amount,
        category,
        reason,
        shipmentId: shipmentId || null,
        createdById: req.auth!.userId,
      },
      include: {
        rider: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    if (notifyRider && rider.user.id) {
      const categoryLabel = category.replace('_', ' ');
      notify(
        rider.user.id,
        'rider_deduction',
        'Earnings Deduction Applied',
        `A deduction of GHS ${amount.toFixed(2)} (${categoryLabel}) has been recorded on your account. Reason: ${reason}`,
        shipmentId
      ).catch(() => {});
    }

    res.status(201).json(deduction);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to record deduction' });
  }
});

// DELETE /api/deductions/:id - reverse deduction
router.delete('/:id', requireRole('operations', 'admin'), async (req, res) => {
  const id = req.params.id as string;

  try {
    const existing = await prisma.riderDeduction.findUnique({
      where: { id },
      include: {
        rider: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Deduction not found' });
    }

    await prisma.riderDeduction.delete({ where: { id } });

    if (existing.rider?.user?.id) {
      notify(
        existing.rider.user.id,
        'rider_deduction_reversed',
        'Deduction Reversed',
        `The previous deduction of GHS ${Number(existing.amount).toFixed(2)} (${existing.category.replace('_', ' ')}) has been cancelled and reversed by operations.`
      ).catch(() => {});
    }

    res.json({ success: true, message: 'Deduction reversed successfully' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete deduction' });
  }
});

export default router;
