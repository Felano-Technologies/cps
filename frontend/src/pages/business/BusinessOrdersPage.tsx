import { Fragment, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import api from '../../services/api';
import type { PartnerShipment } from '../../types/models';
import { BusinessPage, Panel } from './ui';
import { formatDateTime, inputStyle, secondaryButton, tableStyle, tdStyle, thStyle, STATUS_LABELS } from './businessShared';

const PAGE_SIZE = 25;

export default function BusinessOrdersPage() {
  const [items, setItems] = useState<PartnerShipment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  // Debounced; changing a filter always returns to the first page.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    api.get<{ items: PartnerShipment[]; total: number }>('/business/shipments', {
      params: { page, pageSize: PAGE_SIZE, search: search || undefined, status: status || undefined },
    }).then(r => { setItems(r.data.items); setTotal(r.data.total); });
  }, [page, search, status]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <BusinessPage title="Orders" subtitle="Every delivery your platform has sent to CPS.">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={17} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
          <input style={{ ...inputStyle, paddingLeft: 38 }} value={query} onChange={e => setQuery(e.target.value)} placeholder="Tracking code, your reference or receiver" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <Panel>
        {items.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>No orders match.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...tableStyle, minWidth: 820 }}>
              <thead><tr>{['Tracking', 'Your reference', 'Pickup', 'Receiver', 'Fee', 'Status', 'Rider', 'Created'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {items.map(s => (
                  <Fragment key={s.trackingCode}>
                    <tr onClick={() => setExpanded(x => (x === s.trackingCode ? null : s.trackingCode))} style={{ cursor: 'pointer' }}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{s.trackingCode}</td>
                      <td style={tdStyle}>{s.externalReference ?? '—'}</td>
                      <td style={tdStyle}>{s.pickup.name}<div style={{ color: '#64748b', fontSize: 12 }}>{s.pickup.location}</div></td>
                      <td style={tdStyle}>{s.dropoff.name}<div style={{ color: '#64748b', fontSize: 12 }}>{s.dropoff.region} · {s.dropoff.location}</div></td>
                      <td style={tdStyle}>GHS {s.fee.amount.toFixed(2)}</td>
                      <td style={tdStyle}>{STATUS_LABELS[s.status] ?? s.status}</td>
                      <td style={tdStyle}>{s.rider ? <>{s.rider.name}<div style={{ color: '#64748b', fontSize: 12 }}>{s.rider.phone}</div></> : '—'}</td>
                      <td style={tdStyle}>{formatDateTime(s.createdAt)}</td>
                    </tr>
                    {expanded === s.trackingCode && (
                      <tr>
                        <td colSpan={8} style={{ ...tdStyle, background: '#f8fafc' }}>
                          <strong>History</strong>
                          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                            {s.events.map((e, i) => (
                              <li key={i}>{formatDateTime(e.at)} — {STATUS_LABELS[e.status] ?? e.status}{e.note ? ` (${e.note})` : ''}</li>
                            ))}
                          </ul>
                          {s.proofOfDelivery && (
                            <p style={{ margin: '8px 0 0' }}>
                              Delivered to {s.proofOfDelivery.recipientName ?? 'recipient'} via {s.proofOfDelivery.method}
                              {s.proofOfDelivery.deliveryCodeVerified ? ' · delivery code verified' : ''}
                              {s.proofOfDelivery.photoUrl && <> · <a href={s.proofOfDelivery.photoUrl} target="_blank" rel="noreferrer">photo</a></>}
                            </p>
                          )}
                          {s.cancellationReason && <p style={{ margin: '8px 0 0' }}>Cancelled: {s.cancellationReason}</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, color: '#64748b', flexWrap: 'wrap', gap: 8 }}>
          <span>{total} order{total === 1 ? '' : 's'}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={secondaryButton} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span>Page {page} of {pages}</span>
            <button style={secondaryButton} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </Panel>
    </BusinessPage>
  );
}
