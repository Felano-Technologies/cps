import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bus, ExternalLink, Search } from 'lucide-react';
import api from '../../services/api';
import type { Shipment } from '../../types/models';

export default function StationDeliveryPage() {
  const [orders, setOrders] = useState<Shipment[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get<Shipment[]>('/shipments').then(r => setOrders(r.data)).finally(() => setLoading(false)); }, []);
  const rows = useMemo(() => orders.filter(o => o.deliveryType === 'station' && !['awaiting_price', 'cancelled', 'failed'].includes(o.status)).filter(o => `${o.trackingCode} ${o.senderName} ${o.receiverName} ${o.stationLocation}`.toLowerCase().includes(search.toLowerCase())), [orders, search]);
  return <div className="page-shell light-shell" style={{ padding: '32px 24px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap', marginBottom: 24 }}>
      <div><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Bus color="#c2410c" /><h1 style={{ margin: 0 }}>Station Deliveries</h1></div><p style={{ color: '#64748b' }}>Station handovers, driver details, vehicle numbers, and receipts.</p></div>
      <Link to="/ops/records" className="secondary-btn" style={{ textDecoration: 'none', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a' }}>All order records</Link>
    </div>
    <div style={{ position: 'relative', maxWidth: 440, marginBottom: 18 }}><Search size={17} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search station delivery records" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 12px 12px 38px', borderRadius: 10, border: '1px solid #cbd5e1' }} /></div>
    <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14 }}><table style={{ width: '100%', minWidth: 1050, borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr style={{ background: '#f8fafc' }}>{['Order', 'Sender details', 'Receiver details', 'Dropoff / station', 'Driver name & number', 'Car number', 'Receipt'].map(h => <th key={h} style={{ padding: 14, color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead><tbody>
      {loading ? <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center' }}>Loading station deliveries…</td></tr> : rows.length === 0 ? <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>No station deliveries found.</td></tr> : rows.map(o => <tr key={o.id} style={{ borderTop: '1px solid #e2e8f0' }}>
        <td style={{ padding: 14, fontWeight: 700 }}>{o.trackingCode}<div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>{o.status.replaceAll('_', ' ')}</div></td><td style={{ padding: 14 }}>{o.senderName}<div style={{ fontSize: 12, color: '#64748b' }}>{o.senderNumber}</div></td><td style={{ padding: 14 }}>{o.receiverName}<div style={{ fontSize: 12, color: '#64748b' }}>{o.receiverNumber}</div></td><td style={{ padding: 14 }}>{o.dropoffLocation}<div style={{ fontSize: 12, color: '#c2410c', fontWeight: 700 }}>{o.stationLocation || 'Station pending'}</div></td><td style={{ padding: 14 }}>{o.stationDriverName || '—'}<div style={{ fontSize: 12, color: '#64748b' }}>{o.stationDriverNumber || ''}</div></td><td style={{ padding: 14 }}>{o.stationCarNumber || '—'}</td><td style={{ padding: 14 }}>{o.stationReceiptUrl ? <a href={o.stationReceiptUrl} target="_blank" rel="noreferrer" style={{ color: '#078c35', fontWeight: 700 }}><ExternalLink size={14} style={{ verticalAlign: 'middle' }} /> View receipt</a> : 'Pending'}</td>
      </tr>)}</tbody></table></div>
  </div>;
}
