import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// requireAuth runs first so req.auth.userId is always available to key off —
// this also sidesteps needing the IP fallback for the normal case.
router.use(requireAuth);

const alertsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId ?? ipKeyGenerator(req.ip ?? ''),
});

router.use(alertsRateLimiter);

router.get('/', async (req, res) => {
  const alerts = await prisma.notification.findMany({
    where: { userId: req.auth!.userId, type: 'shipment_delayed' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(alerts);
});

export default router;
