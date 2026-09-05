import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/bonuses
 * Operations & Admin endpoint to inspect rider bonuses across the fleet
 * Supports timeline filters (startDate, endDate, riderId, type)
 */
router.get('/', requireRole('operations', 'admin'), async (req, res) => {
  const { riderId, startDate, endDate, type } = req.query as {
    riderId?: string;
    startDate?: string;
    endDate?: string;
    type?: 'pickup' | 'dropoff';
  };

  const where: Record<string, unknown> = {};

  if (riderId) {
    where.riderId = riderId;
  }

  if (type && (type === 'pickup' || type === 'dropoff')) {
    where.type = type;
  }

  if (startDate || endDate) {
    const createdAtFilter: Record<string, Date> = {};
    if (startDate) {
      createdAtFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      createdAtFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    where.createdAt = createdAtFilter;
  }

  try {
    const [bonuses, allRiders] = await Promise.all([
      prisma.riderBonus.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          rider: {
            include: {
              user: {
                select: { id: true, name: true, phone: true, email: true },
              },
            },
          },
          shipment: {
            select: {
              id: true,
              trackingCode: true,
              pickupLocation: true,
              dropoffLocation: true,
              status: true,
              deliveryFee: true,
              productFee: true,
            },
          },
        },
      }),
      prisma.riderProfile.findMany({
        include: {
          user: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
      }),
    ]);

    // Aggregate summary
    const pickupBonuses = bonuses.filter((b) => b.type === 'pickup');
    const dropoffBonuses = bonuses.filter((b) => b.type === 'dropoff');

    const totalAmount = bonuses.reduce((acc, b) => acc + Number(b.amount || 1.00), 0);
    const pickupAmount = pickupBonuses.reduce((acc, b) => acc + Number(b.amount || 1.00), 0);
    const dropoffAmount = dropoffBonuses.reduce((acc, b) => acc + Number(b.amount || 1.00), 0);

    // Aggregate by rider
    const riderMap = new Map<
      string,
      {
        riderId: string;
        riderName: string;
        phone: string | null;
        vehicleId: string | null;
        vehicleType: string | null;
        pickupCount: number;
        dropoffCount: number;
        totalBonusCount: number;
        totalBonusAmount: number;
      }
    >();

    allRiders.forEach((r) => {
      riderMap.set(r.id, {
        riderId: r.id,
        riderName: r.user.name,
        phone: r.user.phone || null,
        vehicleId: r.vehicleId,
        vehicleType: r.vehicleType,
        pickupCount: 0,
        dropoffCount: 0,
        totalBonusCount: 0,
        totalBonusAmount: 0,
      });
    });

    bonuses.forEach((b) => {
      const entry = riderMap.get(b.riderId);
      if (entry) {
        if (b.type === 'pickup') entry.pickupCount += 1;
        if (b.type === 'dropoff') entry.dropoffCount += 1;
        entry.totalBonusCount += 1;
        entry.totalBonusAmount += Number(b.amount || 1.00);
      }
    });

    const byRider = Array.from(riderMap.values()).sort((a, b) => b.totalBonusAmount - a.totalBonusAmount);

    res.json({
      bonuses,
      summary: {
        totalCount: bonuses.length,
        totalAmount,
        pickupCount: pickupBonuses.length,
        pickupAmount,
        dropoffCount: dropoffBonuses.length,
        dropoffAmount,
      },
      byRider,
    });
  } catch (err) {
    console.error('[bonuses] Failed to fetch bonuses:', err);
    res.status(500).json({ error: 'Failed to fetch bonus records' });
  }
});

/**
 * GET /api/bonuses/my-bonuses
 * Rider endpoint to inspect their personal bonus history and totals
 */
router.get('/my-bonuses', requireRole('rider'), async (req, res) => {
  const profile = await prisma.riderProfile.findUnique({
    where: { userId: req.auth!.userId },
    select: { id: true },
  });

  if (!profile) {
    return res.status(404).json({ error: 'Rider profile not found' });
  }

  const { startDate, endDate, type } = req.query as {
    startDate?: string;
    endDate?: string;
    type?: 'pickup' | 'dropoff';
  };

  const where: Record<string, unknown> = {
    riderId: profile.id,
  };

  if (type && (type === 'pickup' || type === 'dropoff')) {
    where.type = type;
  }

  if (startDate || endDate) {
    const createdAtFilter: Record<string, Date> = {};
    if (startDate) {
      createdAtFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      createdAtFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    where.createdAt = createdAtFilter;
  }

  try {
    const bonuses = await prisma.riderBonus.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        shipment: {
          select: {
            id: true,
            trackingCode: true,
            pickupLocation: true,
            dropoffLocation: true,
            status: true,
            deliveryFee: true,
          },
        },
      },
    });

    const pickupBonuses = bonuses.filter((b) => b.type === 'pickup');
    const dropoffBonuses = bonuses.filter((b) => b.type === 'dropoff');
    const totalAmount = bonuses.reduce((acc, b) => acc + Number(b.amount || 1.00), 0);

    res.json({
      bonuses,
      summary: {
        totalCount: bonuses.length,
        totalAmount,
        pickupCount: pickupBonuses.length,
        pickupAmount: pickupBonuses.length * 1.00,
        dropoffCount: dropoffBonuses.length,
        dropoffAmount: dropoffBonuses.length * 1.00,
      },
    });
  } catch (err) {
    console.error('[bonuses] Failed to fetch personal bonuses:', err);
    res.status(500).json({ error: 'Failed to fetch personal bonuses' });
  }
});

export default router;
