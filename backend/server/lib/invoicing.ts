/**
 * Money a business owes CPS: each delivered partner order earns CPS its
 * share of its delivery fee — the share stamped on the delivery when it was
 * booked (shipments.cpsSharePercent), or, for deliveries without one, the
 * share passed in (the business's or the invoice's). Amounts are worked out
 * in pesewas per delivery so totals always equal the sum of their lines.
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
  /** CPS's share of this delivery's fee, in percent. */
  sharePercent: number;
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
        select: { id: true, trackingCode: true, externalReference: true, dropoffRegion: true, receiverName: true, deliveryFee: true, cpsSharePercent: true, invoiceId: true },
      },
    },
  });

  // A shipment has one delivered event, but guard against duplicates anyway.
  const seen = new Set<string>();
  return events
    .filter(e => !seen.has(e.shipmentId) && seen.add(e.shipmentId))
    .map(e => {
      const fee = Number(e.shipment.deliveryFee);
      const sharePercent = e.shipment.cpsSharePercent === null ? percent : Number(e.shipment.cpsSharePercent);
      return {
        shipmentId: e.shipment.id,
        trackingCode: e.shipment.trackingCode,
        externalReference: e.shipment.externalReference,
        receiverName: e.shipment.receiverName,
        dropoffRegion: e.shipment.dropoffRegion,
        deliveredAt: e.createdAt,
        fee,
        sharePercent,
        cpsShare: cpsShareOf(fee, sharePercent),
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

/**
 * The single share these lines were billed at, or null when they mix shares
 * (e.g. an invoice spanning a share change). `fallback` is used for no lines.
 */
export function uniformSharePercent(lines: DeliveryLine[], fallback: number): number | null {
  const shares = new Set(lines.map(l => l.sharePercent));
  if (shares.size === 0) return fallback;
  return shares.size === 1 ? [...shares][0] : null;
}

/**
 * One percentage that describes these lines: their shared percent, or — when
 * shares are mixed — the overall effective one (amount due ÷ total fees), so
 * "Due to CPS (x%)" and "Business keeps (100-x%)" still match the amounts.
 */
export function effectiveSharePercent(lines: DeliveryLine[], fallback: number): number {
  const uniform = uniformSharePercent(lines, fallback);
  if (uniform !== null) return uniform;
  const { totalFees, cpsShare } = summarize(lines);
  return totalFees > 0 ? Math.round((cpsShare / totalFees) * 10000) / 100 : fallback;
}

/** "85% of GHS 65.00" or, for mixed shares, "each delivery's agreed share of GHS 65.00". */
export function shareDescription(lines: DeliveryLine[], fallback: number, totalFees: number) {
  const uniform = uniformSharePercent(lines, fallback);
  return uniform === null
    ? `each delivery's agreed share of GHS ${totalFees.toFixed(2)}`
    : `${uniform}% of GHS ${totalFees.toFixed(2)}`;
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
