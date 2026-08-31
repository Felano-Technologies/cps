import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
const alertsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId ?? req.ip ?? 'anonymous',
});

router.use(alertsRateLimiter);
router.use(requireAuth);

router.get('/', async (req, res) => {
  const alerts = await prisma.notification.findMany({
    where: { userId: req.auth!.userId, type: 'shipment_delayed' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(alerts);
});

export default router;
