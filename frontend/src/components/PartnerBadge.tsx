import type { Shipment } from '../types/models';

/** Marks orders that came in through the Partner API (e.g. "Shopyos · prepaid"). */
export default function PartnerBadge({ shipment }: { shipment: Pick<Shipment, 'business' | 'prepaid'> }) {
  if (!shipment.business) return null;
  return (
    <span
      title="Created through the CPS Partner API. The delivery fee was paid on the partner's platform — never collect it from the receiver."
      style={{
        display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
        background: '#ede9fe', color: '#5b21b6', whiteSpace: 'nowrap',
      }}
    >
      {shipment.business.name}{shipment.prepaid ? ' · prepaid' : ''}
    </span>
  );
}
