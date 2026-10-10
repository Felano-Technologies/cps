import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Ban, CheckCircle2, Eye, FilePlus2, FileText } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/Modal';
import InvoiceDetailModal from '../../components/InvoiceDetailModal';
import type { BusinessBalance, BusinessStatus, Invoice, InvoiceStatus, MoneyTotals } from '../../types/models';

interface Outstanding extends BusinessBalance {
  business: { id: string; name: string; status: BusinessStatus };
}

interface Preview extends MoneyTotals {
  cpsSharePercent: number;
}

const ghs = (amount: number) => `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDay(d);
};
const dayLabel = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const periodLabel = (start: string, endExclusive: string) => {
  const from = dayLabel(new Date(start));
  const to = dayLabel(new Date(new Date(endExclusive).getTime() - 1));
  return from === to ? from : `${from} – ${to}`;
};
const apiError = (err: unknown, fallback: string) =>
  axios.isAxiosError(err) && typeof err.response?.data?.error === 'string' ? err.response.data.error : fallback;

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; fg: string; label: string }> = {
  unpaid: { bg: '#fef3c7', fg: '#92400e', label: 'Unpaid' },
  paid: { bg: '#dcfce7', fg: '#166534', label: 'Paid' },
  void: { bg: '#f1f5f9', fg: '#64748b', label: 'Void' },
};

const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16 } as const;
const th = { padding: '12px 14px', color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' } as const;
const td = { padding: '12px 14px', verticalAlign: 'top' } as const;
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' } as const;
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6 } as const;
const iconBtn = (color: string) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34,
  border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color, cursor: 'pointer',
}) as const;

function CreateInvoiceModal({ businesses, initialBusinessId, onClose, onCreated }: {
  businesses: Outstanding[];
  initialBusinessId: string;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
}) {
  const toast = useToast();
  const today = isoDay(new Date());
  const [businessId, setBusinessId] = useState(initialBusinessId);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [notes, setNotes] = useState('');
  // Keyed by the query it answers, so a stale preview never shows for new inputs.
  const [previewFor, setPreviewFor] = useState<{ key: string; data: Preview | null } | null>(null);
  const [saving, setSaving] = useState(false);

  const validPeriod = !!businessId && !!from && !!to && to >= from;
  const previewKey = `${businessId}|${from}|${to}`;
  const preview = validPeriod && previewFor?.key === previewKey ? previewFor.data : null;

  // The UI's end date is inclusive; the API takes an exclusive end.
  useEffect(() => {
    if (!validPeriod) return;
    let cancelled = false;
    api.get<Preview>('/admin/invoices/preview', { params: { businessId, from, to: addDays(to, 1) } })
      .then(r => { if (!cancelled) setPreviewFor({ key: previewKey, data: r.data }); })
      .catch(() => { if (!cancelled) setPreviewFor({ key: previewKey, data: null }); });
    return () => { cancelled = true; };
  }, [validPeriod, previewKey, businessId, from, to]);

  const quick = (label: string, start: string, end: string) => (
    <button type="button" className="neutral-btn" onClick={() => { setFrom(start); setTo(end); }} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12 }}>{label}</button>
  );
  const now = new Date();
  const weekStart = addDays(today, -((now.getUTCDay() + 6) % 7));
  const monthStart = isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post<Invoice>('/admin/invoices', { businessId, from, to: addDays(to, 1), notes: notes.trim() || undefined });
      toast.success(`Invoice ${data.number} raised: ${ghs(data.amountDue)} due from ${data.business.name}.`);
      onCreated(data);
      onClose();
    } catch (err) {
      toast.error(apiError(err, 'Failed to create the invoice.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Create invoice" maxWidth="520px">
      <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          Bills the business for deliveries completed in the period that aren't on an invoice yet, at its CPS share.
        </p>
        <div>
          <label style={labelStyle}>Business</label>
          <select style={inputStyle} value={businessId} onChange={e => setBusinessId(e.target.value)} required>
            <option value="" disabled>Choose a business</option>
            {businesses.map(b => <option key={b.business.id} value={b.business.id}>{b.business.name} ({b.cpsSharePercent}%)</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={labelStyle}>From</label><input type="date" style={inputStyle} value={from} max={today} onChange={e => setFrom(e.target.value)} required /></div>
          <div><label style={labelStyle}>To (inclusive)</label><input type="date" style={inputStyle} value={to} min={from} max={today} onChange={e => setTo(e.target.value)} required /></div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {quick('Today', today, today)}
          {quick('Yesterday', addDays(today, -1), addDays(today, -1))}
          {quick('This week', weekStart, today)}
          {quick('This month', monthStart, today)}
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, fontSize: 14 }}>
          {!preview ? (
            <span style={{ color: '#64748b' }}>{businessId ? 'Checking deliveries…' : 'Choose a business to see the amount.'}</span>
          ) : preview.count === 0 ? (
            <span style={{ color: '#64748b' }}>No uninvoiced deliveries in this period.</span>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Deliveries</span><strong>{preview.count}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Delivery fees</span><strong>{ghs(preview.totalFees)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>Business keeps ({Math.round((100 - preview.cpsSharePercent) * 100) / 100}%)</span><span>{ghs(preview.businessShare)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 8, fontSize: 16, color: '#166534' }}>
                <span>Due to CPS ({preview.cpsSharePercent}%)</span><strong>{ghs(preview.cpsShare)}</strong>
              </div>
            </div>
          )}
        </div>

        <div><label style={labelStyle}>Notes (optional, shown on the invoice)</label><textarea rows={2} style={inputStyle} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Pay by MoMo to 024…" /></div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="neutral-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-green" disabled={saving || !preview?.count} style={{ opacity: saving || !preview?.count ? 0.6 : 1 }}>
            {saving ? 'Creating…' : 'Create invoice'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function InvoicesPage() {
  const toast = useToast();
  const [outstanding, setOutstanding] = useState<Outstanding[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => Promise.all([
    api.get<Outstanding[]>('/admin/invoices/outstanding'),
    api.get<Invoice[]>('/admin/invoices'),
  ])
    .then(([o, i]) => { setOutstanding(o.data); setInvoices(i.data); })
    .catch(() => toast.error('Failed to load invoices.'))
    .finally(() => setLoading(false)), [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => invoices.filter(i =>
    (!statusFilter || i.status === statusFilter) && (!businessFilter || i.business.id === businessFilter)), [invoices, statusFilter, businessFilter]);

  const totals = useMemo(() => ({
    today: outstanding.reduce((s, o) => s + o.today.cpsShare, 0),
    uninvoiced: outstanding.reduce((s, o) => s + o.uninvoiced.cpsShare, 0),
    unpaid: outstanding.reduce((s, o) => s + o.unpaidInvoices.amountDue, 0),
  }), [outstanding]);

  const markPaid = async (inv: Invoice) => {
    const reference = window.prompt(`Mark ${inv.number} (${ghs(inv.amountDue)}) as paid.\nPayment reference (optional, e.g. MoMo or bank ref):`);
    if (reference === null) return;
    setBusyId(inv.id);
    try {
      await api.post(`/admin/invoices/${inv.id}/paid`, { paymentReference: reference.trim() || undefined });
      toast.success(`${inv.number} marked paid.`);
      setDetailVersion(v => v + 1);
      await load();
    } catch (err) {
      toast.error(apiError(err, 'Failed to mark the invoice paid.'));
    } finally {
      setBusyId(null);
    }
  };

  const voidInvoice = async (inv: Invoice) => {
    if (!window.confirm(`Void ${inv.number}? Its ${inv.deliveryCount} deliveries go back to "not yet invoiced" so you can bill them again.`)) return;
    setBusyId(inv.id);
    try {
      await api.post(`/admin/invoices/${inv.id}/void`);
      toast.success(`${inv.number} voided.`);
      setDetailVersion(v => v + 1);
      await load();
    } catch (err) {
      toast.error(apiError(err, 'Failed to void the invoice.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-shell light-shell">
      <main className="container" style={{ padding: '32px 24px', maxWidth: 1240 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Invoices</h1>
            <p style={{ margin: 0, color: '#64748b' }}>Bill partner businesses for completed deliveries at their CPS share, and track payment.</p>
          </div>
          <button className="primary-green" onClick={() => setCreatingFor('')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, fontWeight: 700 }}>
            <FilePlus2 size={16} /> Create invoice
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
          {[
            { label: "Earned today (CPS share)", value: totals.today, tone: '#078c35' },
            { label: 'Not yet invoiced', value: totals.uninvoiced, tone: '#1d4ed8' },
            { label: 'Unpaid invoices', value: totals.unpaid, tone: '#b45309' },
          ].map(c => (
            <div key={c.label} style={{ ...card, padding: 18 }}>
              <div style={{ color: '#64748b', fontSize: 13 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: c.tone }}>{ghs(c.value)}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 18, margin: '0 0 10px', color: '#0f172a' }}>By business</h2>
        <div style={{ ...card, overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead><tr style={{ background: '#f8fafc' }}>{['Business', 'CPS share', 'Today', 'Not yet invoiced', 'Unpaid invoices', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#64748b', padding: 28 }}>Loading…</td></tr>
              ) : outstanding.length === 0 ? (
                <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#64748b', padding: 28 }}>No businesses yet.</td></tr>
              ) : outstanding.map(o => (
                <tr key={o.business.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ ...td, fontWeight: 700 }}>{o.business.name}</td>
                  <td style={td}>{o.cpsSharePercent}%<div style={{ fontSize: 12, color: '#64748b' }}>business keeps {Math.round((100 - o.cpsSharePercent) * 100) / 100}%</div></td>
                  <td style={td}><strong>{ghs(o.today.cpsShare)}</strong><div style={{ fontSize: 12, color: '#64748b' }}>{o.today.count} deliveries · fees {ghs(o.today.totalFees)}</div></td>
                  <td style={td}><strong>{ghs(o.uninvoiced.cpsShare)}</strong><div style={{ fontSize: 12, color: '#64748b' }}>{o.uninvoiced.count} deliveries</div></td>
                  <td style={td}><strong style={{ color: o.unpaidInvoices.amountDue > 0 ? '#b45309' : undefined }}>{ghs(o.unpaidInvoices.amountDue)}</strong><div style={{ fontSize: 12, color: '#64748b' }}>{o.unpaidInvoices.count} invoices</div></td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button className="neutral-btn" disabled={o.uninvoiced.count === 0} onClick={() => setCreatingFor(o.business.id)}
                      style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, opacity: o.uninvoiced.count === 0 ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                      Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <h2 style={{ fontSize: 18, margin: 0, color: '#0f172a' }}>All invoices</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select style={{ ...inputStyle, width: 'auto' }} value={businessFilter} onChange={e => setBusinessFilter(e.target.value)}>
              <option value="">All businesses</option>
              {outstanding.map(o => <option key={o.business.id} value={o.business.id}>{o.business.name}</option>)}
            </select>
            <select style={{ ...inputStyle, width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value as InvoiceStatus | '')}>
              <option value="">All statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="void">Void</option>
            </select>
          </div>
        </div>
        <div style={{ ...card, overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead><tr style={{ background: '#f8fafc' }}>{['Invoice', 'Business', 'Period', 'Deliveries', 'Fees', 'Due to CPS', 'Status', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {!loading && shown.length === 0 ? (
                <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: '#64748b', padding: 32 }}>
                  <FileText size={26} style={{ display: 'block', margin: '0 auto 8px', color: '#cbd5e1' }} />
                  {invoices.length === 0 ? 'No invoices yet. Create one from a business above.' : 'No invoices match these filters.'}
                </td></tr>
              ) : shown.map(inv => {
                const st = STATUS_STYLE[inv.status];
                const busy = busyId === inv.id;
                return (
                  <tr key={inv.id} style={{ borderTop: '1px solid #f1f5f9', opacity: inv.status === 'void' ? 0.6 : 1 }}>
                    <td style={{ ...td, fontWeight: 700 }}>{inv.number}<div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{dayLabel(new Date(inv.createdAt))}</div></td>
                    <td style={td}>{inv.business.name}</td>
                    <td style={td}>{periodLabel(inv.periodStart, inv.periodEnd)}</td>
                    <td style={td}>{inv.deliveryCount}</td>
                    <td style={td}>{ghs(inv.totalFees)}</td>
                    <td style={td}><strong>{ghs(inv.amountDue)}</strong><div style={{ fontSize: 12, color: '#64748b' }}>{inv.cpsSharePercent}%</div></td>
                    <td style={td}>
                      <span style={{ background: st.bg, color: st.fg, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                      {inv.paidAt && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{dayLabel(new Date(inv.paidAt))}{inv.paymentReference ? ` · ${inv.paymentReference}` : ''}</div>}
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button title="View invoice" aria-label={`View ${inv.number}`} style={iconBtn('#2563eb')} onClick={() => setOpenId(inv.id)}><Eye size={16} /></button>
                        {inv.status === 'unpaid' && (
                          <>
                            <button title="Mark paid" aria-label={`Mark ${inv.number} paid`} disabled={busy} style={iconBtn('#078c35')} onClick={() => markPaid(inv)}><CheckCircle2 size={16} /></button>
                            <button title="Void invoice" aria-label={`Void ${inv.number}`} disabled={busy} style={iconBtn('#b91c1c')} onClick={() => voidInvoice(inv)}><Ban size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {creatingFor !== null && (
          <CreateInvoiceModal
            businesses={outstanding}
            initialBusinessId={creatingFor}
            onClose={() => setCreatingFor(null)}
            onCreated={() => { void load(); }}
          />
        )}
        {openId && (
          <InvoiceDetailModal
            url={`/admin/invoices/${openId}`}
            version={detailVersion}
            onClose={() => setOpenId(null)}
            actions={inv => inv.status === 'unpaid' ? (
              <button type="button" className="primary-green" onClick={() => markPaid(inv)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8 }}>
                <CheckCircle2 size={15} /> Mark paid
              </button>
            ) : null}
          />
        )}
      </main>
    </div>
  );
}
