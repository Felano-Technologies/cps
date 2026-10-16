import { sendSms } from './sms';

/** Relations every shipment response includes (Ops, Rider and Partner views). */
export const shipmentInclude = {
  statusEvents: { orderBy: { createdAt: 'asc' as const } },
  assignedRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
  pickupRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
  dropoffRider: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
  bonuses: true,
  customer: { select: { id: true, name: true, email: true, phone: true, role: true } },
  business: { select: { id: true, name: true } },
  // Multi-pickup: the other shops to collect from, in order.
  extraPickups: { orderBy: { sequence: 'asc' as const } },
};

export const FINAL_STATUSES = ['delivered', 'cancelled', 'failed'] as const;

/** Public web app, used for links in SMS messages. */
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://www.cpsdeliverygh.com').replace(/\/+$/, '');

/** Office line customers are told to call about returned orders. */
const OFFICE_PHONE = process.env.OFFICE_PHONE || '0534583364';

type CustomerSmsShipment = {
  trackingCode: string;
  senderName: string;
  customer?: { name: string } | null;
};

function customerGreeting(shipment: CustomerSmsShipment) {
  const name = (shipment.customer?.name || shipment.senderName || '').trim();
  return name ? `Hello ${name}, ` : 'Hello, ';
}

/** SMS wording for the customer who placed the order. */
export const customerSms = {
  received: (s: CustomerSmsShipment) =>
    `${customerGreeting(s)}your pickup has been received and is being processed. Tracking ID: ${s.trackingCode}`,
  bulkReceived: (s: CustomerSmsShipment, count: number) =>
    `${customerGreeting(s)}your bulk pickup of ${count} package(s) has been received and is being processed. Tracking ID: ${s.trackingCode}`,
  riderAssigned: (s: CustomerSmsShipment) =>
    `${customerGreeting(s)}your order with tracking number ${s.trackingCode} has been assigned to a rider.`,
  inTransit: (s: CustomerSmsShipment) =>
    `${customerGreeting(s)}your order with tracking number ${s.trackingCode} is now in transit.`,
  delivered: (s: CustomerSmsShipment) =>
    `${customerGreeting(s)}your order with tracking number ${s.trackingCode} has been delivered successfully.`,
  returned: (s: CustomerSmsShipment) =>
    `${customerGreeting(s)}your order with tracking number ${s.trackingCode} has been returned to our office please contact the office line on ${OFFICE_PHONE}.`,
};

/** The customer SMS for a status change, or undefined to keep the default wording. */
export function customerStatusSms(shipment: CustomerSmsShipment, status: string): string | undefined {
  switch (status) {
    case 'in_transit': return customerSms.inTransit(shipment);
    case 'delivered': return customerSms.delivered(shipment);
    case 'failed': return customerSms.returned(shipment);
    default: return undefined;
  }
}

/** SMS the receiver about a status change. Never throws. */
export async function notifyReceiverOfStatus(
  shipment: {
    trackingCode: string;
    receiverNumber: string;
    deliveryFee: any;
    productFee?: any;
    prepaid?: boolean;
    dropoffLocation: string;
    dropoffRider?: { user?: { name: string; phone?: string | null } } | null;
  },
  status: string,
  note?: string
) {
  if (!shipment.receiverNumber) return;

  const fee = Number(shipment.deliveryFee || 0).toFixed(2);
  const cod = shipment.productFee && Number(shipment.productFee) > 0
    ? ` + COD: GHS ${Number(shipment.productFee).toFixed(2)}`
    : '';
  const total = (Number(shipment.deliveryFee || 0) + Number(shipment.productFee || 0)).toFixed(2);
  // Partner (prepaid) orders were already paid for on the partner's platform —
  // never tell the receiver they owe anything.
  const amountDue = shipment.prepaid ? '' : ` Total to pay: GHS ${total}.`;

  let message = '';
  switch (status) {
    case 'pending':
      message = shipment.prepaid
        ? `CPS Logistics: Your package #${shipment.trackingCode} has been booked for delivery.`
        : `CPS Logistics: Your package #${shipment.trackingCode} is confirmed! Delivery Fee: GHS ${fee}${cod}. Track: ${FRONTEND_URL}/tracking/${shipment.trackingCode}`;
      break;
    case 'picked_up':
      message = `CPS Logistics: Package #${shipment.trackingCode} has been picked up from sender and is heading to our hub.${amountDue}`;
      break;
    case 'in_transit':
      message = `CPS Logistics: Package #${shipment.trackingCode} is in transit towards ${shipment.dropoffLocation}.`;
      break;
    case 'out_for_delivery': {
      const riderName = shipment.dropoffRider?.user?.name || 'our rider';
      const riderPhone = shipment.dropoffRider?.user?.phone ? ` (${shipment.dropoffRider.user.phone})` : '';
      message = `CPS Logistics: Package #${shipment.trackingCode} is OUT FOR DELIVERY by ${riderName}${riderPhone}.${shipment.prepaid ? '' : ` Amount to pay: GHS ${total}.`}`;
      break;
    }
    case 'delivered':
      message = `CPS Logistics: Package #${shipment.trackingCode} was delivered successfully. Thank you for choosing CPS!`;
      break;
    case 'delayed':
      message = `CPS Logistics: Package #${shipment.trackingCode} has encountered a temporary delay${note ? `: ${note}` : ''}. Our dispatch team is working on it.`;
      break;
    default:
      return;
  }

  await sendSms(shipment.receiverNumber, message);
}
