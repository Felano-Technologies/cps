import { useEffect, useState, type ReactNode } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileText, Printer } from 'lucide-react';
import api from '../services/api';
import Modal from './Modal';
import type { InvoiceDetail, InvoiceStatus } from '../types/models';

const ghs = (amount: number) => `GHS ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function period(invoice: InvoiceDetail) {
  const from = day(new Date(invoice.periodStart));
  const to = day(new Date(new Date(invoice.periodEnd).getTime() - 1));
  return from === to ? from : `${from} – ${to}`;
}

const STATUS: Record<InvoiceStatus, { bg: string; fg: string; label: string }> = {
  unpaid: { bg: '#fef3c7', fg: '#92400e', label: 'Unpaid' },
  paid: { bg: '#dcfce7', fg: '#166534', label: 'Paid' },
  void: { bg: '#f1f5f9', fg: '#64748b', label: 'Void' },
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Opens a clean printable invoice in a new window. */
function printInvoice(invoice: InvoiceDetail) {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return;
  const rows = invoice.lines.map(l => `<tr><td>${escapeHtml(l.trackingCode)}</td><td>${escapeHtml(l.externalReference ?? '')}</td><td>${escapeHtml(l.dropoffRegion)}</td><td>${day(new Date(l.deliveredAt))}</td><td class="n">${ghs(l.fee)}</td><td class="n">${ghs(l.cpsShare)}</td></tr>`).join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${invoice.number}</title><style>
    body{font-family:Arial,sans-serif;color:#0f172a;margin:40px}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:24px;font-size:13px}
    th,td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#f8fafc;font-size:11px;text-transform:uppercase;color:#64748b}.n{text-align:right}
    .totals{margin-top:20px;margin-left:auto;width:320px;font-size:14px}.totals div{display:flex;justify-content:space-between;padding:4px 0}.due{font-weight:800;font-size:18px;border-top:2px solid #0f172a;margin-top:6px;padding-top:8px!important}
  </style></head><body>
    <div style="display:flex;justify-content:space-between"><div><h1>CPS Delivery</h1><div>Invoice ${escapeHtml(invoice.number)}</div></div>
    <div style="text-align:right"><strong>Billed to</strong><div>${escapeHtml(invoice.business.name)}</div><div>Period: ${period(invoice)}</div><div>Issued: ${day(new Date(invoice.createdAt))}</div><div>Status: ${STATUS[invoice.status].label}</div></div></div>
    <table><thead><tr><th>Tracking</th><th>Your reference</th><th>Region</th><th>Delivered</th><th class="n">Delivery fee</th><th class="n">Due to CPS</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals"><div><span>Deliveries</span><span>${invoice.deliveryCount}</span></div><div><span>Delivery fees</span><span>${ghs(invoice.totalFees)}</span></div>
    <div><span>Business keeps (${100 - invoice.cpsSharePercent}%)</span><span>${ghs(invoice.businessShare)}</span></div>
    <div class="due"><span>Amount due to CPS (${invoice.cpsSharePercent}%)</span><span>${ghs(invoice.amountDue)}</span></div></div>
    ${invoice.notes ? `<p style="margin-top:24px"><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</p>` : ''}
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

function exportInvoice(invoice: InvoiceDetail) {
  const sheet = XLSX.utils.json_to_sheet(invoice.lines.map(l => ({
    'Tracking code': l.trackingCode,
    'Your reference': l.externalReference ?? '',
    Receiver: l.receiverName,
    Region: l.dropoffRegion,
    'Delivered at': new Date(l.deliveredAt).toLocaleString(),
    'Fee (GHS)': l.fee,
    [`Due to CPS (${invoice.cpsSharePercent}%)`]: l.cpsShare,
  })));
  XLSX.utils.sheet_add_aoa(sheet, [[], ['Total', '', '', '', '', invoice.totalFees, invoice.amountDue]], { origin: -1 });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, invoice.number);
  XLSX.writeFile(book, `${invoice.number}-${invoice.business.name.replace(/[^a-z0-9]+/gi, '-')}.xlsx`);
}

interface InvoiceDetailModalProps {
  /** API path that returns the invoice with its lines. */
  url: string;
  onClose: () => void;
  /** Extra buttons (e.g. staff "Mark paid"), given the loaded invoice. */
  actions?: (invoice: InvoiceDetail) => ReactNode;
  /** Bump to reload after an action changed the invoice. */
  version?: number;
}

export default function InvoiceDetailModal({ url, onClose, actions, version = 0 }: InvoiceDetailModalProps) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.get<InvoiceDetail>(url).then(r => setInvoice(r.data)).catch(() => setFailed(true));
  }, [url, version]);

  const st = invoice ? STATUS[invoice.status] : null;

  return (
    <Modal onClose={onClose} maxWidth="820px">
      {!invoice ? (
        <p style={{ color: '#64748b' }}>{failed ? 'Could not load this invoice.' : 'Loading invoice…'}</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={20} color="#078c35" /> {invoice.number}
                {st && <span style={{ background: st.bg, color: st.fg, borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{st.label}</span>}
              </h3>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {invoice.business.name} · {period(invoice)} · issued {day(new Date(invoice.createdAt))}
                {invoice.paidAt && <> · paid {day(new Date(invoice.paidAt))}{invoice.paymentReference ? ` (${invoice.paymentReference})` : ''}</>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="neutral-btn" onClick={() => exportInvoice(invoice)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8 }}><Download size={15} /> Excel</button>
              <button type="button" className="neutral-btn" onClick={() => printInvoice(invoice)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8 }}><Printer size={15} /> Print</button>
              {actions?.(invoice)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              ['Deliveries', String(invoice.deliveryCount)],
              ['Delivery fees', ghs(invoice.totalFees)],
              [`Business keeps (${Math.round((100 - invoice.cpsSharePercent) * 100) / 100}%)`, ghs(invoice.businessShare)],
              [`Due to CPS (${invoice.cpsSharePercent}%)`, ghs(invoice.amountDue)],
            ].map(([label, value], i) => (
              <div key={label} style={{ background: i === 3 ? '#f0fdf4' : '#f8fafc', border: `1px solid ${i === 3 ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, color: i === 3 ? '#166534' : '#64748b' }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: i === 3 ? '#166534' : '#0f172a' }}>{value}</div>
              </div>
            ))}
          </div>

          {invoice.notes && <p style={{ margin: '0 0 12px', fontSize: 13, color: '#475569' }}><strong>Notes:</strong> {invoice.notes}</p>}

          <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>
                <tr>{['Tracking', 'Reference', 'Region', 'Delivered', 'Fee', 'Due to CPS'].map(h => <th key={h} style={{ padding: '8px 10px', fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {invoice.lines.map(l => (
                  <tr key={l.trackingCode} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{l.trackingCode}</td>
                    <td style={{ padding: '8px 10px' }}>{l.externalReference ?? '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{l.dropoffRegion}</td>
                    <td style={{ padding: '8px 10px' }}>{new Date(l.deliveredAt).toLocaleString()}</td>
                    <td style={{ padding: '8px 10px' }}>{ghs(l.fee)}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>{ghs(l.cpsShare)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
