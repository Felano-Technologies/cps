import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../../services/api';
import type { Shipment } from '../../types/models';
import { formatPackageSize } from '../../utils/packageSize';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 50;

interface ShipmentPage { items: Shipment[]; total: number; page: number; pageSize: number }

type ExportRecord = Pick<Shipment,
  'id' | 'trackingCode' | 'status' | 'deliveryType' | 'senderName' | 'senderNumber' | 'pickupRegion' | 'pickupLocation' |
  'receiverName' | 'receiverNumber' | 'dropoffRegion' | 'dropoffLocation' | 'stationLocation' | 'deliveryFee' | 'createdAt'>;

export default function OpsRecordsPage() {
  const [orders, setOrders] = useState<Shipment[]>([]); const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const [loading, setLoading] = useState(false); const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState(''); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [deliveryType, setDeliveryType] = useState(''); const [receiverRegion, setReceiverRegion] = useState('');
  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => { api.get<string[]>('/shipments/regions').then(r => setRegions(r.data)).catch(() => {}); }, []);
  // Debounce typing so every keystroke doesn't hit the API.
  useEffect(() => { const t = setTimeout(() => setSearch(query.trim()), 300); return () => clearTimeout(t); }, [query]);
  useEffect(() => { setPage(1); }, [search, status, deliveryType, receiverRegion]);

  const filterParams = { search: search || undefined, status: status || undefined, deliveryType: deliveryType || undefined, dropoffRegion: receiverRegion || undefined };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<ShipmentPage>('/shipments', { params: { ...filterParams, page, pageSize: PAGE_SIZE } })
      .then(r => { if (!cancelled) { setOrders(r.data.items); setTotal(r.data.total); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status, deliveryType, receiverRegion]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Export pulls the complete filtered set from the server, not just the loaded page.
  const exportPhoneRecords = async () => {
    setExporting(true);
    try {
      const { data: records } = await api.get<ExportRecord[]>('/shipments/export', { params: filterParams });
      const workbook = XLSX.utils.book_new();
      const exportedAt = new Date().toLocaleString();
      const senderSheet = XLSX.utils.json_to_sheet(records.map(o => ({
        'Sender name': o.senderName,
        'Sender phone': o.senderNumber,
        'Pickup region': o.pickupRegion,
        'Pickup location': o.pickupLocation,
        'Order ID': o.trackingCode,
        'Recorded at': exportedAt,
      })));
      const receiverSheet = XLSX.utils.json_to_sheet(records.map(o => ({
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
    } finally {
      setExporting(false);
    }
  };

  const canExport = total > 0 && !exporting;
  const pagerButton = { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' } as const;

  return <div className="page-shell light-shell" style={{ padding: '32px 24px' }}><h1 style={{ marginTop: 0 }}>Order Records</h1><p style={{ color: '#64748b' }}>Search and reference every order, including station handovers.</p>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '20px 0' }}><div style={{ position: 'relative', flex: '1 1 260px' }}><Search size={17} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search names, phone numbers, regions, or locations" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 12px 12px 38px', border: '1px solid #cbd5e1', borderRadius: 10 }} /></div><select value={receiverRegion} onChange={e => setReceiverRegion(e.target.value)}><option value="">All receiver regions</option>{regions.map(region => <option key={region}>{region}</option>)}</select><select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['awaiting_price','pending','picked_up','in_transit','out_for_delivery','delivered','delayed','failed','cancelled'].map(s => <option key={s}>{s}</option>)}</select><select value={deliveryType} onChange={e => setDeliveryType(e.target.value)}><option value="">All delivery types</option><option value="doorstep">Doorstep</option><option value="station">Station</option></select><button onClick={exportPhoneRecords} disabled={!canExport} style={{ border: 0, borderRadius: 10, padding: '11px 15px', background: '#078c35', color: '#fff', fontWeight: 800, cursor: canExport ? 'pointer' : 'not-allowed', opacity: canExport ? 1 : .5 }}>{exporting ? 'Exporting…' : `Export Excel (${total})`}</button></div>
    <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, opacity: loading ? .6 : 1 }}><table style={{ width: '100%', minWidth: 1120, borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr style={{ background: '#f8fafc' }}>{['Order', 'Sender & phone', 'Receiver & phone', 'Route', 'Package', 'Delivery', 'Riders', 'Price', 'Status', ''].map(h => <th key={h} style={{ padding: 14, color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead><tbody>{orders.length === 0 ? <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>{loading ? 'Loading…' : 'No orders match your filters.'}</td></tr> : orders.map(o => <tr key={o.id} style={{ borderTop: '1px solid #e2e8f0' }}><td style={{ padding: 14, fontWeight: 700 }}>{o.trackingCode}<div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>{new Date(o.createdAt).toLocaleDateString()}</div></td><td style={{ padding: 14 }}>{o.senderName}<div style={{ fontSize: 12, color: '#078c35' }}>{o.senderNumber}</div></td><td style={{ padding: 14 }}>{o.receiverName}<div style={{ fontSize: 12, color: '#078c35' }}>{o.receiverNumber}</div><div style={{ fontSize: 12, color: '#64748b' }}>{o.dropoffRegion}</div></td><td style={{ padding: 14 }}>{o.pickupLocation}<div style={{ color: '#64748b', fontSize: 12 }}>to {o.dropoffLocation}</div></td><td style={{ padding: 14, textTransform: 'capitalize' }}>{o.packageType} · {formatPackageSize(o)}</td><td style={{ padding: 14, textTransform: 'capitalize' }}>{o.deliveryType}{o.stationLocation && <div style={{ fontSize: 12, color: '#c2410c' }}>{o.stationLocation}</div>}</td><td style={{ padding: 14 }}>{o.pickupRider?.user.name || '—'}<div style={{ fontSize: 12, color: '#64748b' }}>{o.dropoffRider?.user.name || '—'}</div></td><td style={{ padding: 14 }}>GHS {Number(o.deliveryFee).toFixed(2)}</td><td style={{ padding: 14 }}>{o.status.replaceAll('_', ' ')}</td><td style={{ padding: 14 }}><Link to={`/ops/tracking/${o.trackingCode}`}>Details</Link></td></tr>)}</tbody></table></div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14, color: '#64748b', flexWrap: 'wrap' }}><span>{total === 0 ? 'No records' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}</span><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><button style={pagerButton} disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button style={pagerButton} disabled={page >= pageCount || loading} onClick={() => setPage(p => p + 1)}>Next</button></div></div>
    <section style={{ marginTop: 28 }}><h2 style={{ marginBottom: 6 }}>Receiver Phone Records</h2><p style={{ color: '#64748b', marginTop: 0 }}>Receiver names and phone numbers for the orders on this page. Export includes every matching order.</p><div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14 }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr style={{ background: '#f8fafc' }}>{['Receiver name', 'Phone number', 'Region', 'Location', 'Order', 'Delivery type'].map(h => <th key={h} style={{ padding: 14, color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead><tbody>{orders.length === 0 ? <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No receiver phone records match your filters.</td></tr> : orders.map(o => <tr key={`receiver-${o.id}`} style={{ borderTop: '1px solid #e2e8f0' }}><td style={{ padding: 14, fontWeight: 700 }}>{o.receiverName}</td><td style={{ padding: 14, color: '#078c35', fontWeight: 700 }}>{o.receiverNumber}</td><td style={{ padding: 14 }}>{o.dropoffRegion}</td><td style={{ padding: 14 }}>{o.stationLocation || o.dropoffLocation}</td><td style={{ padding: 14 }}><Link to={`/ops/tracking/${o.trackingCode}`}>{o.trackingCode}</Link></td><td style={{ padding: 14, textTransform: 'capitalize' }}>{o.deliveryType}</td></tr>)}</tbody></table></div></section>
  </div>;
}
