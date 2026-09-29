import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../../services/api';
import type { Shipment } from '../../types/models';
import { formatPackageSize } from '../../utils/packageSize';
import * as XLSX from 'xlsx';

export default function OpsRecordsPage() {
  const [orders, setOrders] = useState<Shipment[]>([]); const [query, setQuery] = useState(''); const [status, setStatus] = useState(''); const [deliveryType, setDeliveryType] = useState(''); const [receiverRegion, setReceiverRegion] = useState('');
  useEffect(() => { api.get<Shipment[]>('/shipments').then(r => setOrders(r.data)); }, []);
  const rows = useMemo(() => orders.filter(o => (!status || o.status === status) && (!deliveryType || o.deliveryType === deliveryType) && `${o.trackingCode} ${o.senderName} ${o.receiverName} ${o.dropoffLocation}`.toLowerCase().includes(query.toLowerCase())), [orders, query, status, deliveryType]);
  const receiverRows = useMemo(() => orders.filter(o => {
    const receiverText = `${o.receiverName} ${o.receiverNumber} ${o.dropoffRegion} ${o.dropoffLocation} ${o.stationLocation || ''}`.toLowerCase();
    return (!receiverRegion || o.dropoffRegion === receiverRegion) && receiverText.includes(query.toLowerCase());
  }), [orders, query, receiverRegion]);
  const regions = useMemo(() => Array.from(new Set(orders.map(o => o.dropoffRegion).filter(Boolean))).sort(), [orders]);
  const exportPhoneRecords = () => {
    const workbook = XLSX.utils.book_new();
    const exportedAt = new Date().toLocaleString();
    const senderSheet = XLSX.utils.json_to_sheet(rows.map(o => ({
      'Sender name': o.senderName,
      'Sender phone': o.senderNumber,
      'Pickup region': o.pickupRegion,
      'Pickup location': o.pickupLocation,
      'Order ID': o.trackingCode,
      'Recorded at': exportedAt,
    })));
    const receiverSheet = XLSX.utils.json_to_sheet(receiverRows.map(o => ({
      'Receiver name': o.receiverName,
      'Receiver phone': o.receiverNumber,
      'Receiver region': o.dropoffRegion,
      'Receiver location': o.stationLocation || o.dropoffLocation,
      'Order ID': o.trackingCode,
      'Delivery type': o.deliveryType,
      'Recorded at': exportedAt,
    })));
    XLSX.utils.book_append_sheet(workbook, senderSheet, 'Sender Phones');
    XLSX.utils.book_append_sheet(workbook, receiverSheet, 'Receiver Phones');
    XLSX.writeFile(workbook, `cps-phone-records-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  return <div className="page-shell light-shell" style={{ padding: '32px 24px' }}><h1 style={{ marginTop: 0 }}>Order Records</h1><p style={{ color: '#64748b' }}>Search and reference every order, including station handovers.</p>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '20px 0' }}><div style={{ position: 'relative', flex: '1 1 260px' }}><Search size={17} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search names, phone numbers, regions, or locations" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 12px 12px 38px', border: '1px solid #cbd5e1', borderRadius: 10 }} /></div><select value={receiverRegion} onChange={e => setReceiverRegion(e.target.value)}><option value="">All receiver regions</option>{regions.map(region => <option key={region}>{region}</option>)}</select><select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['awaiting_price','pending','picked_up','in_transit','out_for_delivery','delivered','delayed','failed','cancelled'].map(s => <option key={s}>{s}</option>)}</select><select value={deliveryType} onChange={e => setDeliveryType(e.target.value)}><option value="">All delivery types</option><option value="doorstep">Doorstep</option><option value="station">Station</option></select><button onClick={exportPhoneRecords} disabled={!rows.length && !receiverRows.length} style={{ border: 0, borderRadius: 10, padding: '11px 15px', background: '#078c35', color: '#fff', fontWeight: 800, cursor: rows.length || receiverRows.length ? 'pointer' : 'not-allowed', opacity: rows.length || receiverRows.length ? 1 : .5 }}>Export Excel</button></div>
    <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14 }}><table style={{ width: '100%', minWidth: 1120, borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr style={{ background: '#f8fafc' }}>{['Order', 'Sender & phone', 'Receiver & phone', 'Route', 'Package', 'Delivery', 'Riders', 'Price', 'Status', ''].map(h => <th key={h} style={{ padding: 14, color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead><tbody>{rows.map(o => <tr key={o.id} style={{ borderTop: '1px solid #e2e8f0' }}><td style={{ padding: 14, fontWeight: 700 }}>{o.trackingCode}<div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>{new Date(o.createdAt).toLocaleDateString()}</div></td><td style={{ padding: 14 }}>{o.senderName}<div style={{ fontSize: 12, color: '#078c35' }}>{o.senderNumber}</div></td><td style={{ padding: 14 }}>{o.receiverName}<div style={{ fontSize: 12, color: '#078c35' }}>{o.receiverNumber}</div><div style={{ fontSize: 12, color: '#64748b' }}>{o.dropoffRegion}</div></td><td style={{ padding: 14 }}>{o.pickupLocation}<div style={{ color: '#64748b', fontSize: 12 }}>to {o.dropoffLocation}</div></td><td style={{ padding: 14, textTransform: 'capitalize' }}>{o.packageType} · {formatPackageSize(o)}</td><td style={{ padding: 14, textTransform: 'capitalize' }}>{o.deliveryType}{o.stationLocation && <div style={{ fontSize: 12, color: '#c2410c' }}>{o.stationLocation}</div>}</td><td style={{ padding: 14 }}>{o.pickupRider?.user.name || '—'}<div style={{ fontSize: 12, color: '#64748b' }}>{o.dropoffRider?.user.name || '—'}</div></td><td style={{ padding: 14 }}>GHS {Number(o.deliveryFee).toFixed(2)}</td><td style={{ padding: 14 }}>{o.status.replaceAll('_', ' ')}</td><td style={{ padding: 14 }}><Link to={`/ops/tracking/${o.trackingCode}`}>Details</Link></td></tr>)}</tbody></table></div>
    <section style={{ marginTop: 28 }}><h2 style={{ marginBottom: 6 }}>Receiver Phone Records</h2><p style={{ color: '#64748b', marginTop: 0 }}>Receiver names and phone numbers matching the selected region or search text.</p><div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14 }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr style={{ background: '#f8fafc' }}>{['Receiver name', 'Phone number', 'Region', 'Location', 'Order', 'Delivery type'].map(h => <th key={h} style={{ padding: 14, color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead><tbody>{receiverRows.length === 0 ? <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No receiver phone records match your filters.</td></tr> : receiverRows.map(o => <tr key={`receiver-${o.id}`} style={{ borderTop: '1px solid #e2e8f0' }}><td style={{ padding: 14, fontWeight: 700 }}>{o.receiverName}</td><td style={{ padding: 14, color: '#078c35', fontWeight: 700 }}>{o.receiverNumber}</td><td style={{ padding: 14 }}>{o.dropoffRegion}</td><td style={{ padding: 14 }}>{o.stationLocation || o.dropoffLocation}</td><td style={{ padding: 14 }}><Link to={`/ops/tracking/${o.trackingCode}`}>{o.trackingCode}</Link></td><td style={{ padding: 14, textTransform: 'capitalize' }}>{o.deliveryType}</td></tr>)}</tbody></table></div></section>
  </div>;
}
