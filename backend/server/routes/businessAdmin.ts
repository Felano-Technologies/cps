/** CPS admin: review and approve or suspend business (Partner API) accounts. */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { notify } from '../lib/notifications';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', async (_req, res) => {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { id: true, name: true, phone: true, email: true } },
      _count: { select: { shipments: true, apiKeys: { where: { revokedAt: null } } } },
    },
  });
  res.json(businesses.map(b => ({
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
  })));
});

const statusSchema = z.object({ status: z.enum(['pending', 'approved', 'suspended']) });

router.patch('/:id', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });

  const business = await prisma.business.findUnique({ where: { id: req.params.id as string } });
  if (!business) return res.status(404).json({ error: 'Business not found' });

  // Keys check business status on every request, so suspension takes effect immediately.
  const updated = await prisma.business.update({
    where: { id: business.id },
    data: { status: parsed.data.status },
  });

  if (business.status !== updated.status) {
    const message = updated.status === 'approved'
      ? 'Your business is approved. You can now create API keys in the CPS Business portal.'
      : updated.status === 'suspended'
        ? 'Your Partner API access has been suspended. Contact CPS for details.'
        : 'Your business account is under review.';
    notify(business.ownerUserId, 'business_status', `Business ${updated.status}`, message).catch(() => {});
  }

  res.json({ id: updated.id, status: updated.status });
});

export default router;
