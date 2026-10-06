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
};

export const FINAL_STATUSES = ['delivered', 'cancelled', 'failed'] as const;

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
        : `CPS Logistics: Your package #${shipment.trackingCode} is confirmed! Delivery Fee: GHS ${fee}${cod}. Track: https://cpslogistics.com/track/${shipment.trackingCode}`;
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
