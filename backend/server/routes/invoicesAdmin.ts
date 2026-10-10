/**
 * CPS staff bill businesses for completed partner deliveries: see what each
 * business owes, raise an invoice for a period at the business's CPS share,
 * then mark it paid or void it (which frees its deliveries to be re-billed).
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { notify } from '../lib/notifications';
import {
  businessBalance, deliveredLines, invoiceInclude, invoiceNumber, invoiceView, invoiceWithLines, summarize,
} from '../lib/invoicing';

const router = Router();
router.use(requireAuth, requireRole('admin', 'operations'));

const listQuery = z.object({
  businessId: z.string().optional(),
  status: z.enum(['unpaid', 'paid', 'void']).optional(),
});

router.get('/', async (req, res) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid filter' });
  const invoices = await prisma.invoice.findMany({
    where: { businessId: parsed.data.businessId, status: parsed.data.status },
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: invoiceInclude,
  });
  res.json(invoices.map(invoiceView));
});

/** Per business: today's CPS share, deliveries not yet invoiced, and unpaid invoices. */
router.get('/outstanding', async (_req, res) => {
  const businesses = await prisma.business.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, status: true, cpsSharePercent: true } });
  const rows = await Promise.all(businesses.map(async b => ({
    business: { id: b.id, name: b.name, status: b.status },
    ...(await businessBalance(b.id, Number(b.cpsSharePercent))),
  })));
  res.json(rows);
});

const periodSchema = z.object({
  businessId: z.string().min(1),
  /** Inclusive first day and exclusive end, as ISO dates or timestamps. */
  from: z.coerce.date(),
  to: z.coerce.date(),
});

async function loadPeriod(input: unknown) {
  const parsed = periodSchema.safeParse(input);
  if (!parsed.success) return { error: { status: 400, message: 'businessId, from and to are required' } } as const;
  const { businessId, from, to } = parsed.data;
  if (to <= from) return { error: { status: 400, message: 'The end date must be after the start date' } } as const;
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return { error: { status: 404, message: 'Business not found' } } as const;
  const percent = Number(business.cpsSharePercent);
  const lines = await deliveredLines(business.id, percent, { from, to, uninvoicedOnly: true });
  return { business, from, to, percent, lines } as const;
}

/** The deliveries an invoice for this period would bill (only ones not already invoiced). */
router.get('/preview', async (req, res) => {
  const period = await loadPeriod(req.query);
  if ('error' in period && period.error) return res.status(period.error.status).json({ error: period.error.message });
  const { business, from, to, percent, lines } = period;
  res.json({ business: { id: business.id, name: business.name }, from, to, cpsSharePercent: percent, ...summarize(lines), lines });
});

router.post('/', async (req, res) => {
  const period = await loadPeriod(req.body);
  if ('error' in period && period.error) return res.status(period.error.status).json({ error: period.error.message });
  const { business, from, to, percent, lines } = period;
  if (lines.length === 0) return res.status(409).json({ error: 'No uninvoiced deliveries in this period' });
  const notes = typeof req.body?.notes === 'string' && req.body.notes.trim() ? req.body.notes.trim() : null;

  const totals = summarize(lines);
  const ids = lines.map(l => l.shipmentId);
  const invoice = await prisma.$transaction(async tx => {
    const created = await tx.invoice.create({
      data: {
        businessId: business.id,
        periodStart: from,
        periodEnd: to,
        deliveryCount: totals.count,
        totalFees: totals.totalFees,
        cpsSharePercent: percent,
        amountDue: totals.cpsShare,
        notes,
        createdById: req.auth!.userId,
      },
      include: invoiceInclude,
    });
    // Claim only deliveries that are still unbilled, so two staff can't bill the same order twice.
    const { count } = await tx.shipment.updateMany({ where: { id: { in: ids }, invoiceId: null }, data: { invoiceId: created.id } });
    if (count !== ids.length) throw new InvoiceRaceError();
    return created;
  }).catch(err => {
    if (err instanceof InvoiceRaceError) return null;
    throw err;
  });
  if (!invoice) return res.status(409).json({ error: 'Some of these deliveries were just invoiced by someone else. Refresh and try again.' });

  notify(
    business.ownerUserId,
    'business_invoice',
    `New CPS invoice ${invoiceNumber(invoice.seq)}`,
    `CPS invoiced ${totals.count} deliver${totals.count === 1 ? 'y' : 'ies'}: GHS ${totals.cpsShare.toFixed(2)} due (${percent}% of GHS ${totals.totalFees.toFixed(2)} in delivery fees).`,
  ).catch(() => {});

  res.status(201).json(await invoiceWithLines(invoice));
});

class InvoiceRaceError extends Error {}

router.get('/:id', async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id as string }, include: invoiceInclude });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(await invoiceWithLines(invoice));
});

const paidSchema = z.object({ paymentReference: z.string().trim().max(200).optional() });

router.post('/:id/paid', async (req, res) => {
  const parsed = paidSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payment reference' });
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id as string } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status !== 'unpaid') return res.status(409).json({ error: `Invoice is already ${invoice.status}` });
  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: 'paid', paidAt: new Date(), paymentReference: parsed.data.paymentReference || null },
    include: invoiceInclude,
  });
  res.json(invoiceView(updated));
});

/** Cancels an unpaid invoice; its deliveries can be billed again. */
router.post('/:id/void', async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id as string } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status !== 'unpaid') return res.status(409).json({ error: `Only unpaid invoices can be voided; this one is ${invoice.status}` });
  const updated = await prisma.$transaction(async tx => {
    await tx.shipment.updateMany({ where: { invoiceId: invoice.id }, data: { invoiceId: null } });
    return tx.invoice.update({ where: { id: invoice.id }, data: { status: 'void' }, include: invoiceInclude });
  });
  res.json(invoiceView(updated));
});

export default router;
