import { createHmac, timingSafeEqual } from 'crypto';
import type { WebhookEvent } from '@prisma/client';
import { prisma } from './prisma';
import { shipmentInclude } from './shipmentService';
import { toPartnerShipment } from './partnerSerializer';

export const WEBHOOK_EVENT_TYPES = [
  'shipment.created',
  'shipment.rider_assigned',
  'shipment.status_changed',
  'shipment.delivered',
  'shipment.cancelled',
  'ping',
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

/** Seconds to wait before each retry; after the last one the event is marked failed (~22h total). */
const RETRY_SCHEDULE_SECONDS = [60, 300, 900, 3600, 3 * 3600, 6 * 3600, 12 * 3600];
const REQUEST_TIMEOUT_MS = 10_000;

/** Picks the event type for a shipment that just moved to `status`. */
export function eventTypeForStatus(status: string): WebhookEventType {
  if (status === 'delivered') return 'shipment.delivered';
  if (status === 'cancelled') return 'shipment.cancelled';
  return 'shipment.status_changed';
}

/**
 * Queues a webhook for the business that owns the shipment (if any, and if it
 * has a webhook URL). The payload is a snapshot taken now. Never throws:
 * a failure to queue must not fail the shipment update that triggered it;
 * partners can always reconcile with GET /shipments?updatedSince.
 */
export async function recordShipmentEvent(shipmentId: string, type: WebhookEventType) {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { ...shipmentInclude, business: { select: { id: true, name: true, webhookUrl: true } } },
    });
    if (!shipment?.businessId || !shipment.business?.webhookUrl) return;

    await prisma.webhookEvent.create({
      data: {
        businessId: shipment.businessId,
        shipmentId: shipment.id,
        type,
        payload: { shipment: toPartnerShipment(shipment) } as object,
      },
    });
  } catch (err) {
    console.error(`[webhooks] Failed to queue ${type} for shipment ${shipmentId}:`, err);
  }
}

/** `CPS-Signature` header value: `t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<body>")>`. */
export function signWebhook(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

/** Reference verifier (mirrors the snippet in docs/partner-api). */
export function verifyWebhookSignature(secret: string, body: string, header: string, toleranceSeconds = 300) {
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=') as [string, string]));
  const timestamp = Number(parts.t);
  if (!timestamp || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = Buffer.from(signWebhook(secret, body, timestamp).split('v1=')[1]!, 'hex');
  const actual = Buffer.from(parts.v1, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function webhookEnvelope(event: Pick<WebhookEvent, 'id' | 'type' | 'sequence' | 'createdAt' | 'payload'>) {
  return {
    id: event.id,
    type: event.type,
    createdAt: event.createdAt,
    sequence: event.sequence,
    data: event.payload,
  };
}

/** Attempts one delivery of `eventId` and records the outcome. Returns true on a 2xx. */
export async function deliverWebhookEvent(eventId: string): Promise<boolean> {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
    include: { business: { select: { webhookUrl: true, webhookSecret: true, status: true } } },
  });
  if (!event || event.deliveredAt) return !!event?.deliveredAt;

  const attempts = event.attempts + 1;
  const giveUp = (lastError: string, lastStatusCode: number | null = null) =>
    prisma.webhookEvent.update({
      where: { id: event.id },
      data: { attempts, failedAt: new Date(), lastError, lastStatusCode },
    });

  if (!event.business.webhookUrl) {
    await giveUp('No webhook URL configured');
    return false;
  }
  if (event.business.status === 'suspended') {
    await giveUp('Business is suspended');
    return false;
  }

  const body = JSON.stringify(webhookEnvelope(event));
  let statusCode: number | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(event.business.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CPS-Webhooks/1.0',
        'CPS-Event-Id': event.id,
        'CPS-Event-Type': event.type,
        'CPS-Signature': signWebhook(event.business.webhookSecret, body),
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    statusCode = res.status;
    if (res.ok) {
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { attempts, deliveredAt: new Date(), lastStatusCode: statusCode, lastError: null },
      });
      return true;
    }
    error = `HTTP ${res.status}`;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const delay = RETRY_SCHEDULE_SECONDS[attempts - 1];
  if (delay === undefined) {
    await giveUp(error ?? 'Delivery failed', statusCode);
  } else {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        attempts,
        lastError: error,
        lastStatusCode: statusCode,
        nextAttemptAt: new Date(Date.now() + delay * 1000),
      },
    });
  }
  return false;
}

/** Sends every event that is due. Returns how many were attempted. */
export async function deliverDueWebhooks(batchSize = 25): Promise<number> {
  const due = await prisma.webhookEvent.findMany({
    where: { deliveredAt: null, failedAt: null, nextAttemptAt: { lte: new Date() } },
    orderBy: { sequence: 'asc' },
    take: batchSize,
    select: { id: true },
  });
  for (const { id } of due) {
    await deliverWebhookEvent(id);
  }
  return due.length;
}

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * Polls the outbox. The first tick runs immediately, which also catches up on
 * everything queued while the service was asleep overnight.
 */
export function startWebhookWorker(intervalMs = 10_000) {
  if (timer) return;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      // Drain in batches so a backlog after a restart clears quickly.
      while ((await deliverDueWebhooks()) === 25) { /* keep going */ }
    } catch (err) {
      console.error('[webhooks] Worker tick failed:', err);
    } finally {
      running = false;
    }
  };
  void tick();
  timer = setInterval(tick, intervalMs);
}

export function stopWebhookWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}
