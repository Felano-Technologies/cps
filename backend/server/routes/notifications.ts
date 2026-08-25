import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { userId: req.auth!.userId, readAt: null } }),
  ]);
  res.json({ notifications, unreadCount });
});

router.patch('/read-all', async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.auth!.userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.status(204).send();
});

router.patch('/:id/read', async (req, res) => {
  const existing = await prisma.notification.findUnique({ where: { id: req.params.id as string } });
  if (!existing || existing.userId !== req.auth!.userId) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  const notification = await prisma.notification.update({
    where: { id: existing.id },
    data: { readAt: new Date() },
  });
  res.json(notification);
});

export default router;
