import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, KeyRound, Webhook } from 'lucide-react';
import api from '../../services/api';
import type { PartnerShipment } from '../../types/models';
import { ApprovalBanner, BusinessPage, Panel, Pill } from './ui';
import { formatDateTime, tableStyle, tdStyle, thStyle, useBusinessProfile, STATUS_LABELS } from './businessShared';


export default function BusinessDashboardPage() {
  const { profile, loading } = useBusinessProfile();
  const [recent, setRecent] = useState<PartnerShipment[]>([]);

  useEffect(() => {
    api.get<{ items: PartnerShipment[] }>('/business/shipments', { params: { pageSize: 8 } }).then(r => setRecent(r.data.items)).catch(() => {});
  }, []);

  if (loading) return <BusinessPage title="Business dashboard"><p>Loading…</p></BusinessPage>;

  const counts = profile?.shipmentCounts ?? {};
  const active = (counts.pending ?? 0) + (counts.picked_up ?? 0) + (counts.in_transit ?? 0) + (counts.out_for_delivery ?? 0) + (counts.delayed ?? 0);
  const statusColor = profile?.status === 'approved' ? 'green' : profile?.status === 'suspended' ? 'red' : 'amber';

  const steps = [
    { done: profile?.status === 'approved', label: 'Get approved by CPS', to: null },
    { done: (profile?.activeKeys ?? 0) > 0, label: 'Create an API key', to: '/business/keys' },
    { done: !!profile?.webhookUrl, label: 'Set your webhook URL', to: '/business/webhooks' },
    { done: Object.keys(counts).length > 0, label: 'Create your first delivery', to: '/developers' },
  ];

  return (
    <BusinessPage
      title={profile?.name ?? 'Business dashboard'}
      subtitle="Send deliveries to CPS from your platform with the Partner API."
      actions={<Pill color={statusColor}>{profile?.status}</Pill>}
    >
      <ApprovalBanner profile={profile} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          ['Active deliveries', active],
          ['Delivered', counts.delivered ?? 0],
          ['Cancelled / failed', (counts.cancelled ?? 0) + (counts.failed ?? 0)],
          ['Active API keys', profile?.activeKeys ?? 0],
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
            <div style={{ color: '#64748b', fontSize: 13 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      <Panel title="Getting started">
        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
          {steps.map(step => (
            <li key={step.label} style={{ color: step.done ? '#166534' : '#0f172a' }}>
              {step.done ? '✓ ' : ''}{step.to && !step.done ? <Link to={step.to}>{step.label}</Link> : step.label}
            </li>
          ))}
        </ol>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <Link to="/developers" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><BookOpen size={16} /> API documentation</Link>
          <Link to="/business/keys" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><KeyRound size={16} /> API keys</Link>
          <Link to="/business/webhooks" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Webhook size={16} /> Webhooks</Link>
        </div>
      </Panel>

      <Panel title="Recent deliveries" actions={<Link to="/business/orders">View all</Link>}>
        {recent.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>No deliveries yet. Orders you create through the API appear here.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...tableStyle, minWidth: 640 }}>
              <thead><tr>{['Tracking', 'Your reference', 'Receiver', 'Status', 'Updated'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {recent.map(s => (
                  <tr key={s.trackingCode}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{s.trackingCode}</td>
                    <td style={tdStyle}>{s.externalReference ?? '—'}</td>
                    <td style={tdStyle}>{s.dropoff.name}<div style={{ color: '#64748b', fontSize: 12 }}>{s.dropoff.region}</div></td>
                    <td style={tdStyle}>{STATUS_LABELS[s.status] ?? s.status}</td>
                    <td style={tdStyle}>{formatDateTime(s.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </BusinessPage>
  );
}

