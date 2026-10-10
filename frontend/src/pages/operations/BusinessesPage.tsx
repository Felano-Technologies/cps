import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Building2, Pencil, Ban, RotateCcw, KeyRound, Trash2, Plus, Search, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';
import CredentialsModal from '../../components/CredentialsModal';
import type { BusinessStatus, IssuedCredentials } from '../../types/models';

interface StaffBusiness {
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

const STATUS_STYLE: Record<BusinessStatus, { bg: string; fg: string; label: string }> = {
  approved: { bg: '#dcfce7', fg: '#166534', label: 'Active' },
  pending: { bg: '#fef3c7', fg: '#92400e', label: 'Awaiting approval' },
  suspended: { bg: '#fee2e2', fg: '#991b1b', label: 'Suspended' },
};

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' } as const;
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6 } as const;
const iconBtn = (color: string, disabled: boolean) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, flexShrink: 0,
  border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', color,
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
}) as const;

const apiError = (err: unknown, fallback: string) =>
  axios.isAxiosError(err) && typeof err.response?.data?.error === 'string' ? err.response.data.error : fallback;

/** Register a new business, or edit an existing one. */
function BusinessFormModal({ business, onClose, onSaved }: {
  business: StaffBusiness | null;
  onClose: () => void;
  onSaved: (b: StaffBusiness, credentials?: IssuedCredentials) => void;
}) {
  const editing = !!business;
  const [businessName, setBusinessName] = useState(business?.name ?? '');
  const [ownerName, setOwnerName] = useState(business?.owner.name ?? '');
  const [phone, setPhone] = useState(business?.owner.phone ?? '');
  const [email, setEmail] = useState(business?.contactEmail ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const { data } = await api.patch<StaffBusiness>(`/admin/businesses/${business.id}`, {
          name: businessName.trim(),
          ownerName: ownerName.trim(),
          ownerPhone: phone.trim(),
          contactPhone: phone.trim(),
          contactEmail: email.trim() || null,
        });
        onSaved(data);
      } else {
        const { data } = await api.post<StaffBusiness & IssuedCredentials>('/admin/businesses', {
          businessName: businessName.trim(),
          ownerName: ownerName.trim(),
          phone: phone.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
        });
        const { tempPassword, ...created } = data;
        onSaved(created, { tempPassword, sentTo: phone.trim() });
      }
      onClose();
    } catch (err) {
      setError(apiError(err, editing ? 'Failed to update business.' : 'Failed to register business.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={editing ? 'Edit business' : 'Register business'} maxWidth="480px">
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!editing && (
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
            The business is active straight away. Login details are texted to the owner's phone so they can create API keys.
          </p>
        )}
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontWeight: 600 }}>{error}</div>}
        <div><label style={labelStyle}>Business name</label><input style={inputStyle} required minLength={2} value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Shopyos Ltd" /></div>
        <div><label style={labelStyle}>Owner / contact person</label><input style={inputStyle} required value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Jane Doe" /></div>
        <div>
          <label style={labelStyle}>Phone (used to sign in)</label>
          <input style={inputStyle} type="tel" required minLength={7} value={phone} onChange={e => setPhone(e.target.value)} placeholder="0241234567" />
        </div>
        <div><label style={labelStyle}>Email (optional)</label><input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tech@business.com" /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <button type="button" className="neutral-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-green" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Register & send login'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function BusinessesPage() {
  const toast = useToast();
  const [businesses, setBusinesses] = useState<StaffBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<{ business: StaffBusiness | null } | null>(null);
  const [credentials, setCredentials] = useState<{ title: string; name: string; phone: string; password: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api.get<StaffBusiness[]>('/admin/businesses')
      .then(r => setBusinesses(r.data))
      .catch(() => toast.error('Failed to load businesses.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter(b =>
      [b.name, b.owner.name, b.owner.phone, b.contactEmail].some(v => (v ?? '').toLowerCase().includes(q)));
  }, [businesses, query]);

  const replace = (b: StaffBusiness) => setBusinesses(prev => prev.map(x => (x.id === b.id ? b : x)));

  const setStatus = async (b: StaffBusiness, status: BusinessStatus) => {
    if (status === 'suspended' && !window.confirm(`Suspend ${b.name}? Their API keys stop working immediately, so no new orders can come in until you reactivate them.`)) return;
    setBusyId(b.id);
    try {
      const { data } = await api.patch<StaffBusiness>(`/admin/businesses/${b.id}`, { status });
      replace(data);
      toast.success(`${b.name} ${status === 'suspended' ? 'suspended' : 'activated'}.`);
    } catch (err) {
      toast.error(apiError(err, 'Failed to update business.'));
    } finally {
      setBusyId(null);
    }
  };

  const resend = async (b: StaffBusiness) => {
    if (!window.confirm(`Send ${b.owner.name} new login details by SMS? Their current password will stop working.`)) return;
    setBusyId(b.id);
    try {
      const { data } = await api.post<IssuedCredentials>(`/admin/businesses/${b.id}/resend-details`);
      setCredentials({ title: 'New login details sent', name: b.owner.name, phone: data.sentTo ?? b.owner.phone ?? '', password: data.tempPassword });
    } catch (err) {
      toast.error(apiError(err, 'Failed to send login details.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (b: StaffBusiness) => {
    if (!window.confirm(`Permanently delete ${b.name}? Its login, API keys and webhook history are deleted and can't be recovered. Its ${b.shipmentCount} past order(s) stay in CPS but will no longer be linked to it.`)) return;
    setBusyId(b.id);
    try {
      await api.delete(`/admin/businesses/${b.id}`);
      setBusinesses(prev => prev.filter(x => x.id !== b.id));
      toast.success(`${b.name} deleted.`);
    } catch (err) {
      toast.error(apiError(err, 'Failed to delete business.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ padding: '32px 24px', maxWidth: 1200 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Businesses</h1>
            <p style={{ margin: 0, color: '#64748b' }}>Partner businesses that send orders to CPS through the API (e.g. Shopyos).</p>
          </div>
          <button className="primary-green" onClick={() => setForm({ business: null })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, fontWeight: 700 }}>
            <Plus size={16} /> Register business
          </button>
        </div>

        <div style={{ position: 'relative', maxWidth: 360, marginBottom: 16 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <input style={{ ...inputStyle, paddingLeft: 36 }} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search business, owner or phone" />
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Business', 'Owner', 'Orders', 'API keys', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '14px 16px', color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  <Building2 size={28} style={{ display: 'block', margin: '0 auto 8px', color: '#cbd5e1' }} />
                  {businesses.length === 0 ? 'No businesses yet. Register one to give them API access.' : 'No businesses match your search.'}
                </td></tr>
              ) : shown.map(b => {
                const st = STATUS_STYLE[b.status];
                const busy = busyId === b.id;
                return (
                  <tr key={b.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{b.contactEmail ?? 'No email'} · since {new Date(b.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>{b.owner.name}<div style={{ fontSize: 12, color: '#078c35' }}>{b.owner.phone ?? '—'}</div></td>
                    <td style={{ padding: '14px 16px' }}>{b.shipmentCount}</td>
                    <td style={{ padding: '14px 16px' }}>{b.activeKeyCount}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: st.bg, color: st.fg, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button title="Edit" aria-label="Edit" disabled={busy} style={iconBtn('#475569', busy)} onClick={() => setForm({ business: b })}><Pencil size={16} /></button>
                        {b.status === 'approved' ? (
                          <button title="Suspend" aria-label="Suspend" disabled={busy} style={iconBtn('#c2410c', busy)} onClick={() => setStatus(b, 'suspended')}><Ban size={16} /></button>
                        ) : (
                          <button title={b.status === 'pending' ? 'Approve' : 'Reactivate'} aria-label="Activate" disabled={busy} style={iconBtn('#078c35', busy)} onClick={() => setStatus(b, 'approved')}>
                            {b.status === 'pending' ? <ShieldCheck size={16} /> : <RotateCcw size={16} />}
                          </button>
                        )}
                        <button title="Resend login details by SMS" aria-label="Resend login details" disabled={busy} style={iconBtn('#1d4ed8', busy)} onClick={() => resend(b)}><KeyRound size={16} /></button>
                        <button title="Delete" aria-label="Delete" disabled={busy} style={iconBtn('#b91c1c', busy)} onClick={() => remove(b)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {form && (
        <BusinessFormModal
          business={form.business}
          onClose={() => setForm(null)}
          onSaved={(saved, creds) => {
            if (form.business) {
              replace(saved);
              toast.success('Business updated.');
            } else {
              setBusinesses(prev => [saved, ...prev]);
              if (creds) setCredentials({ title: 'Business registered', name: saved.owner.name, phone: creds.sentTo ?? saved.owner.phone ?? '', password: creds.tempPassword });
            }
          }}
        />
      )}
      {credentials && <CredentialsModal {...credentials} onClose={() => setCredentials(null)} />}
    </div>
  );
}
