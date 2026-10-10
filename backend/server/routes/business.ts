/**
 * Self-service portal for business (Partner API) accounts: profile, API keys,
 * webhook settings and delivery log, their shipments, a statement, what they
 * owe CPS, and their invoices.
 */
import { Router } from 'express';
import { z } from 'zod';
import type { Prisma, ShipmentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { generateApiKey, generateWebhookSecret } from '../lib/apiKeys';
import { shipmentInclude } from '../lib/shipmentService';
import { toPartnerShipment } from '../lib/partnerSerializer';
import { deliverWebhookEvent, webhookEnvelope } from '../lib/webhooks';
import { businessBalance, deliveredLines, invoiceInclude, invoiceView, invoiceWithLines, summarize } from '../lib/invoicing';

const router = Router();
router.use(requireAuth, requireRole('business'));

const MAX_ACTIVE_KEYS = 10;

async function ownBusiness(userId: string) {
  return prisma.business.findUnique({ where: { ownerUserId: userId } });
}

// Every handler below needs the caller's business; load it once.
router.use(async (req, res, next) => {
  const business = await ownBusiness(req.auth!.userId);
  if (!business) return res.status(404).json({ error: 'No business profile for this account' });
  res.locals.business = business;
  next();
});

type BusinessRow = NonNullable<Awaited<ReturnType<typeof ownBusiness>>>;
const current = (res: { locals: Record<string, unknown> }) => res.locals.business as BusinessRow;

function publicBusiness(b: BusinessRow) {
  return {
    id: b.id,
    name: b.name,
    contactEmail: b.contactEmail,
    contactPhone: b.contactPhone,
    status: b.status,
    webhookUrl: b.webhookUrl,
    cpsSharePercent: Number(b.cpsSharePercent),
    createdAt: b.createdAt,
  };
}

// ── Profile ──────────────────────────────────────────────────────────────────

router.get('/me', async (_req, res) => {
  const business = current(res);
  const [activeKeys, shipmentsByStatus] = await Promise.all([
    prisma.apiKey.count({ where: { businessId: business.id, revokedAt: null } }),
    prisma.shipment.groupBy({ by: ['status'], where: { businessId: business.id }, _count: true }),
  ]);
  res.json({
    ...publicBusiness(business),
    activeKeys,
    shipmentCounts: Object.fromEntries(shipmentsByStatus.map(g => [g.status, g._count])),
  });
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  contactEmail: z.string().email().nullable().optional(),
});

router.patch('/me', async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  const updated = await prisma.business.update({ where: { id: current(res).id }, data: parsed.data });
  res.json(publicBusiness(updated));
});

// ── API keys ─────────────────────────────────────────────────────────────────

const keySelect = { id: true, name: true, prefix: true, lastUsedAt: true, revokedAt: true, createdAt: true } as const;

router.get('/keys', async (_req, res) => {
  const keys = await prisma.apiKey.findMany({
    where: { businessId: current(res).id },
    orderBy: { createdAt: 'desc' },
    select: keySelect,
  });
  res.json(keys);
});

const createKeySchema = z.object({ name: z.string().trim().min(1).max(60) });

router.post('/keys', async (req, res) => {
  const business = current(res);
  if (business.status !== 'approved') {
    return res.status(403).json({ error: 'Your business must be approved by CPS before you can create API keys' });
  }
  const parsed = createKeySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });

  const active = await prisma.apiKey.count({ where: { businessId: business.id, revokedAt: null } });
  if (active >= MAX_ACTIVE_KEYS) {
    return res.status(409).json({ error: `You can have at most ${MAX_ACTIVE_KEYS} active keys. Revoke one first.` });
  }

  const { key, prefix, keyHash } = generateApiKey();
  const created = await prisma.apiKey.create({
    data: { businessId: business.id, name: parsed.data.name, prefix, keyHash },
    select: keySelect,
  });
  // The only time the full key is ever returned.
  res.status(201).json({ ...created, key });
});

router.delete('/keys/:id', async (req, res) => {
  const { count } = await prisma.apiKey.updateMany({
    where: { id: req.params.id as string, businessId: current(res).id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) return res.status(404).json({ error: 'Key not found or already revoked' });
  res.status(204).send();
});

// ── Webhook ──────────────────────────────────────────────────────────────────

router.get('/webhook', (_req, res) => {
  const business = current(res);
  res.json({ url: business.webhookUrl, secret: business.webhookSecret });
});

const webhookSchema = z.object({
  url: z.string().trim().url().refine(
    u => u.startsWith('https://') || process.env.NODE_ENV !== 'production',
    'Webhook URL must use https'
  ).nullable(),
});

router.put('/webhook', async (req, res) => {
  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  const updated = await prisma.business.update({
    where: { id: current(res).id },
    data: { webhookUrl: parsed.data.url },
  });
  res.json({ url: updated.webhookUrl, secret: updated.webhookSecret });
});

router.post('/webhook/rotate-secret', async (_req, res) => {
  const updated = await prisma.business.update({
    where: { id: current(res).id },
    data: { webhookSecret: generateWebhookSecret() },
  });
  res.json({ url: updated.webhookUrl, secret: updated.webhookSecret });
});

function eventView(e: Prisma.WebhookEventGetPayload<{ include: { shipment: { select: { trackingCode: true; externalReference: true } } } }>) {
  return {
    id: e.id,
    type: e.type,
    sequence: e.sequence,
    trackingCode: e.shipment?.trackingCode ?? null,
    externalReference: e.shipment?.externalReference ?? null,
    state: e.deliveredAt ? 'delivered' : e.failedAt ? 'failed' : 'pending',
    attempts: e.attempts,
    lastStatusCode: e.lastStatusCode,
    lastError: e.lastError,
    nextAttemptAt: e.deliveredAt || e.failedAt ? null : e.nextAttemptAt,
    deliveredAt: e.deliveredAt,
    createdAt: e.createdAt,
    body: webhookEnvelope(e),
  };
}

const eventInclude = { shipment: { select: { trackingCode: true, externalReference: true } } } as const;

router.post('/webhook/test', async (_req, res) => {
  const business = current(res);
  if (!business.webhookUrl) return res.status(400).json({ error: 'Set a webhook URL first' });
  const event = await prisma.webhookEvent.create({
    data: { businessId: business.id, type: 'ping', payload: { message: 'Test event from CPS' } },
  });
  await deliverWebhookEvent(event.id);
  const result = await prisma.webhookEvent.findUniqueOrThrow({ where: { id: event.id }, include: eventInclude });
  res.json(eventView(result));
});

router.get('/webhook/events', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const events = await prisma.webhookEvent.findMany({
    where: { businessId: current(res).id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: eventInclude,
  });
  res.json(events.map(eventView));
});

router.post('/webhook/events/:id/retry', async (req, res) => {
  const { count } = await prisma.webhookEvent.updateMany({
    where: { id: req.params.id as string, businessId: current(res).id, deliveredAt: null },
    data: { failedAt: null, nextAttemptAt: new Date(), attempts: 0 },
  });
  if (count === 0) return res.status(404).json({ error: 'Event not found or already delivered' });
  await deliverWebhookEvent(req.params.id as string);
  const result = await prisma.webhookEvent.findUniqueOrThrow({ where: { id: req.params.id as string }, include: eventInclude });
  res.json(eventView(result));
});

// ── Shipments & statement ────────────────────────────────────────────────────

const shipmentsQuery = z.object({
  status: z.string().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

router.get('/shipments', async (req, res) => {
  const parsed = shipmentsQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid query' });
  const { status, search, page, pageSize } = parsed.data;

  const where: Prisma.ShipmentWhereInput = {
    businessId: current(res).id,
    ...(status ? { status: status as ShipmentStatus } : {}),
    ...(search
      ? {
          OR: [
            { trackingCode: { contains: search, mode: 'insensitive' } },
            { externalReference: { contains: search, mode: 'insensitive' } },
            { receiverName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: shipmentInclude,
    }),
    prisma.shipment.count({ where }),
  ]);
  res.json({ items: rows.map(toPartnerShipment), total, page, pageSize });
});

const statementQuery = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

/** Deliveries completed in [from, to), by the time CPS marked them delivered, with CPS's share of each fee. */
router.get('/statement', async (req, res) => {
  const parsed = statementQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'from and to dates are required' });
  const { from, to } = parsed.data;
  const percent = Number(current(res).cpsSharePercent);

  const lines = await deliveredLines(current(res).id, percent, { from, to });
  const totals = summarize(lines);
  res.json({
    from,
    to,
    currency: 'GHS',
    cpsSharePercent: percent,
    count: totals.count,
    totalFees: totals.totalFees,
    cpsShare: totals.cpsShare,
    businessShare: totals.businessShare,
    rows: lines.map(({ shipmentId: _id, invoiceId, ...line }) => ({ ...line, invoiced: !!invoiceId })),
  });
});

// ── Money owed to CPS & invoices ─────────────────────────────────────────────

/** What the business owes CPS for today's deliveries, not yet invoiced, and on unpaid invoices. */
router.get('/balance', async (_req, res) => {
  const business = current(res);
  res.json({ currency: 'GHS', ...(await businessBalance(business.id, Number(business.cpsSharePercent))) });
});

router.get('/invoices', async (_req, res) => {
  const invoices = await prisma.invoice.findMany({
    where: { businessId: current(res).id, status: { not: 'void' } },
    orderBy: { createdAt: 'desc' },
    include: invoiceInclude,
  });
  res.json(invoices.map(invoiceView));
});

router.get('/invoices/:id', async (req, res) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id as string, businessId: current(res).id, status: { not: 'void' } },
    include: invoiceInclude,
  });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const { lines, ...rest } = await invoiceWithLines(invoice);
  res.json({ ...rest, lines: lines.map(({ shipmentId: _id, invoiceId: _inv, ...line }) => line) });
});

export default router;
