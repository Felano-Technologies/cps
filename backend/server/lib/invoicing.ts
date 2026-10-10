/**
 * Money a business owes CPS: each delivered partner order earns CPS the
 * business's share (cpsSharePercent) of its delivery fee. Amounts are worked
 * out in pesewas per delivery so totals always equal the sum of their lines.
 */
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export interface DeliveryLine {
  shipmentId: string;
  trackingCode: string;
  externalReference: string | null;
  receiverName: string;
  dropoffRegion: string;
  deliveredAt: Date;
  fee: number;
  cpsShare: number;
  invoiceId: string | null;
}

const toPesewas = (amount: number) => Math.round(amount * 100);
const fromPesewas = (pesewas: number) => pesewas / 100;

/** CPS's share of one fee, rounded to the pesewa. */
export function cpsShareOf(fee: number, percent: number) {
  return fromPesewas(Math.round((toPesewas(fee) * percent) / 100));
}

export function invoiceNumber(seq: number) {
  return `INV-${String(seq).padStart(5, '0')}`;
}

/**
 * Deliveries CPS completed for a business, by when they were marked delivered.
 * `from`/`to` bound the delivery time ([from, to)); either may be omitted.
 */
export async function deliveredLines(
  businessId: string,
  percent: number,
  options: { from?: Date; to?: Date; uninvoicedOnly?: boolean; invoiceId?: string } = {},
): Promise<DeliveryLine[]> {
  const shipmentWhere: Prisma.ShipmentWhereInput = {
    businessId,
    status: 'delivered',
    ...(options.uninvoicedOnly ? { invoiceId: null } : {}),
    ...(options.invoiceId ? { invoiceId: options.invoiceId } : {}),
  };
  const events = await prisma.shipmentStatusEvent.findMany({
    where: {
      status: 'delivered',
      ...(options.from || options.to ? { createdAt: { ...(options.from ? { gte: options.from } : {}), ...(options.to ? { lt: options.to } : {}) } } : {}),
      shipment: shipmentWhere,
    },
    orderBy: { createdAt: 'asc' },
    include: {
      shipment: {
        select: { id: true, trackingCode: true, externalReference: true, dropoffRegion: true, receiverName: true, deliveryFee: true, invoiceId: true },
      },
    },
  });

  // A shipment has one delivered event, but guard against duplicates anyway.
  const seen = new Set<string>();
  return events
    .filter(e => !seen.has(e.shipmentId) && seen.add(e.shipmentId))
    .map(e => {
      const fee = Number(e.shipment.deliveryFee);
      return {
        shipmentId: e.shipment.id,
        trackingCode: e.shipment.trackingCode,
        externalReference: e.shipment.externalReference,
        receiverName: e.shipment.receiverName,
        dropoffRegion: e.shipment.dropoffRegion,
        deliveredAt: e.createdAt,
        fee,
        cpsShare: cpsShareOf(fee, percent),
        invoiceId: e.shipment.invoiceId,
      };
    });
}

/** Totals for a set of delivery lines. */
export function summarize(lines: DeliveryLine[]) {
  const totalFees = fromPesewas(lines.reduce((sum, l) => sum + toPesewas(l.fee), 0));
  const cpsShare = fromPesewas(lines.reduce((sum, l) => sum + toPesewas(l.cpsShare), 0));
  return { count: lines.length, totalFees, cpsShare, businessShare: fromPesewas(toPesewas(totalFees) - toPesewas(cpsShare)) };
}

/** Start and (exclusive) end of the current day. Ghana runs on UTC all year. */
export function todayRange(now = new Date()) {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

type InvoiceRow = Prisma.InvoiceGetPayload<{ include: { business: { select: { id: true; name: true } } } }>;

export function invoiceView(invoice: InvoiceRow) {
  const amountDue = Number(invoice.amountDue);
  const totalFees = Number(invoice.totalFees);
  return {
    id: invoice.id,
    number: invoiceNumber(invoice.seq),
    business: invoice.business,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    deliveryCount: invoice.deliveryCount,
    totalFees,
    cpsSharePercent: Number(invoice.cpsSharePercent),
    amountDue,
    businessShare: fromPesewas(toPesewas(totalFees) - toPesewas(amountDue)),
    status: invoice.status,
    paidAt: invoice.paidAt,
    paymentReference: invoice.paymentReference,
    notes: invoice.notes,
    createdAt: invoice.createdAt,
  };
}

export const invoiceInclude = { business: { select: { id: true, name: true } } } as const;

/** An invoice with its delivery lines, at the share it was raised with. */
export async function invoiceWithLines(invoice: InvoiceRow) {
  const lines = await deliveredLines(invoice.businessId, Number(invoice.cpsSharePercent), { invoiceId: invoice.id });
  return { ...invoiceView(invoice), lines };
}

/** What a business owes CPS today, not yet invoiced, and on unpaid invoices. */
export async function businessBalance(businessId: string, percent: number) {
  const { from, to } = todayRange();
  const [todayLines, uninvoicedLines, unpaid] = await Promise.all([
    deliveredLines(businessId, percent, { from, to }),
    deliveredLines(businessId, percent, { uninvoicedOnly: true }),
    prisma.invoice.aggregate({ where: { businessId, status: 'unpaid' }, _sum: { amountDue: true }, _count: true }),
  ]);
  return {
    cpsSharePercent: percent,
    today: { from, to, ...summarize(todayLines) },
    uninvoiced: summarize(uninvoicedLines),
    unpaidInvoices: { count: unpaid._count, amountDue: Number(unpaid._sum.amountDue ?? 0) },
  };
}
