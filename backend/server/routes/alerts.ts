import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
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
