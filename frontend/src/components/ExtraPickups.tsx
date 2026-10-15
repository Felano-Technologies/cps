import { MapPin, Phone, Store } from 'lucide-react';
import type { Shipment } from '../types/models';

/**
 * Multi-pickup deliveries: the other shops the rider collects from after the
 * first pickup, before the one drop-off. Renders nothing for a single pickup.
 */
export default function ExtraPickups({ shipment, compact = false }: {
  shipment: Pick<Shipment, 'extraPickups' | 'senderName'>;
  compact?: boolean;
}) {
  const extras = shipment.extraPickups ?? [];
  if (!extras.length) return null;

  if (compact) {
    return (
      <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>
        + {extras.length} more shop{extras.length > 1 ? 's' : ''}: {extras.map(p => p.name).join(', ')}
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #ddd6fe', background: '#f5f3ff', borderRadius: 10, padding: '10px 12px', marginTop: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#5b21b6', marginBottom: 6 }}>
        Collect from {extras.length + 1} shops — {shipment.senderName} first, then:
      </div>
      <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {extras.map(p => {
          const map = p.latitude && p.longitude ? `https://maps.google.com/?q=${p.latitude},${p.longitude}` : null;
          return (
            <li key={p.id} style={{ fontSize: 13, color: '#1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                <Store size={13} /> {p.name}
                {p.pickedUpAt && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>✓ collected</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                <MapPin size={12} /> {p.location}
                {map && <a href={map} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>map</a>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                <Phone size={12} /> <a href={`tel:${p.phone}`} style={{ color: '#2563eb' }}>{p.phone}</a>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
