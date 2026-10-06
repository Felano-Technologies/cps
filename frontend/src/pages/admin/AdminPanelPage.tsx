import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import type { BusinessStatus } from '../../types/models';

interface AdminBusiness {
  id: string;
  name: string;
  status: BusinessStatus;
  contactEmail: string | null;
  contactPhone: string | null;
  webhookUrl: string | null;
  owner: { id: string; name: string; phone: string | null; email: string };
  shipmentCount: number;
  activeKeyCount: number;
  createdAt: string;
}

const STATUS_TAG: Record<BusinessStatus, string> = { approved: 'success', pending: 'warning', suspended: 'danger' };

function BusinessAccountsPanel({ businesses, onChange }: { businesses: AdminBusiness[]; onChange: () => void }) {
  const toast = useToast();

  const setStatus = async (b: AdminBusiness, status: BusinessStatus) => {
    if (status === 'suspended' && !window.confirm(`Suspend ${b.name}? Their API keys stop working immediately.`)) return;
    try {
      await api.patch(`/admin/businesses/${b.id}`, { status });
      toast.success(`${b.name} ${status}`);
      onChange();
    } catch {
      toast.error('Could not update business');
    }
  };

  return (
    <div className="table-panel" style={{ marginTop: '24px' }}>
      <div className="table-header-row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <h3>Business accounts (Partner API)</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>Owner</th>
              <th>Orders</th>
              <th>Keys</th>
              <th>Webhook</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {businesses.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>No business accounts yet.</td></tr>
            )}
            {businesses.map(b => (
              <tr key={b.id}>
                <td><strong>{b.name}</strong><div style={{ fontSize: 12, color: '#64748b' }}>{b.contactEmail ?? '—'} · since {new Date(b.createdAt).toLocaleDateString()}</div></td>
                <td>{b.owner.name}<div style={{ fontSize: 12, color: '#64748b' }}>{b.owner.phone ?? b.owner.email}</div></td>
                <td>{b.shipmentCount}</td>
                <td>{b.activeKeyCount}</td>
                <td style={{ maxWidth: 220, wordBreak: 'break-all', fontSize: 12 }}>{b.webhookUrl ?? '—'}</td>
                <td><span className={`tag ${STATUS_TAG[b.status]}`}>{b.status}</span></td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {b.status !== 'approved' && (
                    <button className="primary-green small" onClick={() => setStatus(b, 'approved')}>Approve</button>
                  )}
                  {b.status === 'approved' && (
                    <button className="neutral-btn small" onClick={() => setStatus(b, 'suspended')}>Suspend</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPanelPage() {
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const loadBusinesses = () => api.get<AdminBusiness[]>('/admin/businesses').then(r => setBusinesses(r.data)).catch(() => {});
  useEffect(() => { void loadBusinesses(); }, []);

  const approved = businesses.filter(b => b.status === 'approved').length;
  const pending = businesses.filter(b => b.status === 'pending').length;

  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ paddingTop: '34px' }}>
        <div className="section-head-row">
          <div>
            <h2>Admin Panel</h2>
            <p>System configuration and user management.</p>
          </div>
        </div>

        <div className="summary-row-cards">
          <div className="stat-card">
            <div className="stat-head">Total Users</div>
            <div className="stat-big">1,492</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">Active Integrations</div>
            <div className="stat-big">{approved}</div>
            {pending > 0 && <div style={{ fontSize: 13, color: '#b45309', marginTop: 4 }}>{pending} awaiting approval</div>}
          </div>
          <div className="stat-card dark-card">
            <div className="stat-head">System Status</div>
            <div className="stat-big">All Systems Normal</div>
          </div>
        </div>

        <BusinessAccountsPanel businesses={businesses} onChange={() => void loadBusinesses()} />

        <div className="table-panel" style={{ marginTop: '24px' }}>
          <div className="table-header-row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3>Recent System Activity</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>10:42 AM</td>
                <td>admin@cps.com</td>
                <td>Updated zone boundaries</td>
                <td><span className="tag success">Success</span></td>
              </tr>
              <tr>
                <td>09:15 AM</td>
                <td>system</td>
                <td>Daily backup completed</td>
                <td><span className="tag success">Success</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
