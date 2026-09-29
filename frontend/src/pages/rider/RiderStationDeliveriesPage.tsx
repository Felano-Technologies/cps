import { useEffect, useState } from 'react';
import { Bus, MapPin, Phone, Package } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import type { Shipment } from '../../types/models';
import StationHandoverModal from '../../components/StationHandoverModal';

export default function RiderStationDeliveriesPage() {
  const toast = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.get<Shipment[]>('/shipments').then(({ data }) => setShipments(data.filter(s => s.deliveryType === 'station' && !['delivered', 'cancelled', 'failed'].includes(s.status)))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const submit = async (details: { stationDriverName: string; stationDriverNumber: string; stationCarNumber: string; stationReceiptUrl?: string }) => {
    if (!selected) return;
    await api.patch(`/shipments/${selected.id}/station-handover`, details);
    setSelected(null); toast.success('Station delivery sent to operations.'); load();
  };

  return <div className="page-shell light-shell" style={{ padding: '28px 20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}><Bus color="#c2410c" /><h1 style={{ margin: 0 }}>Station Deliveries</h1></div>
    <p style={{ color: '#64748b', marginTop: 0 }}>Collect the station vehicle details and send the receipt to operations.</p>
    {loading ? <p>Loading station deliveries…</p> : shipments.length === 0 ? <div style={{ padding: 28, background: '#fff', borderRadius: 14, color: '#64748b' }}>No station deliveries assigned.</div> : <div style={{ display: 'grid', gap: 14, maxWidth: 720 }}>
      {shipments.map(s => <div key={s.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><strong>{s.trackingCode}</strong><div style={{ color: '#c2410c', fontWeight: 700, marginTop: 6 }}><MapPin size={14} style={{ verticalAlign: 'middle' }} /> {s.stationLocation}</div><div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}><Package size={14} style={{ verticalAlign: 'middle' }} /> {s.packageType} · {s.packageSize}</div></div><div style={{ textAlign: 'right', fontSize: 13, color: '#64748b' }}><div>{s.receiverName}</div><div><Phone size={13} style={{ verticalAlign: 'middle' }} /> {s.receiverNumber}</div></div></div><button onClick={() => setSelected(s)} style={{ width: '100%', marginTop: 16, padding: 13, border: 0, borderRadius: 10, background: '#078c35', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Collect details &amp; Send to Ops</button></div>)}
    </div>}
    {selected && <StationHandoverModal stopAddress={selected.stationLocation || selected.dropoffLocation} onClose={() => setSelected(null)} onSubmit={submit} />}
  </div>;
}
