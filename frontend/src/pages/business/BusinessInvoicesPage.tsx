import { useEffect, useState } from 'react';
import api from '../../services/api';
import type { Invoice } from '../../types/models';
import InvoiceDetailModal from '../../components/InvoiceDetailModal';
import { BusinessPage, Panel, Pill } from './ui';
import { formatPeriod, ghs, secondaryButton, tableStyle, tdStyle, thStyle } from './businessShared';

export default function BusinessInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api.get<Invoice[]>('/business/invoices').then(r => setInvoices(r.data)).catch(() => setInvoices([]));
  }, []);

  const unpaid = (invoices ?? []).filter(i => i.status === 'unpaid');
  const unpaidTotal = unpaid.reduce((sum, i) => sum + i.amountDue, 0);

  return (
    <BusinessPage title="Invoices" subtitle="What CPS has billed you for completed deliveries: CPS's share of each delivery fee.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 18 }}>
          <div style={{ color: '#92400e', fontSize: 13 }}>Unpaid</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#92400e' }}>{ghs(unpaidTotal)}</div>
          <div style={{ color: '#92400e', fontSize: 12 }}>{unpaid.length} invoice{unpaid.length === 1 ? '' : 's'}</div>
        </div>
      </div>

      <Panel>
        {invoices === null ? (
          <p style={{ color: '#64748b', margin: 0 }}>Loading…</p>
        ) : invoices.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>No invoices yet. CPS raises invoices for your completed deliveries.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...tableStyle, minWidth: 720 }}>
              <thead><tr>{['Invoice', 'Period', 'Deliveries', 'Delivery fees', 'Due to CPS', 'Status', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{inv.number}</td>
                    <td style={tdStyle}>{formatPeriod(inv.periodStart, inv.periodEnd)}</td>
                    <td style={tdStyle}>{inv.deliveryCount}</td>
                    <td style={tdStyle}>{ghs(inv.totalFees)}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{ghs(inv.amountDue)}<div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{inv.cpsSharePercent}%</div></td>
                    <td style={tdStyle}><Pill color={inv.status === 'paid' ? 'green' : 'amber'}>{inv.status === 'paid' ? 'Paid' : 'Unpaid'}</Pill></td>
                    <td style={tdStyle}><button style={secondaryButton} onClick={() => setOpenId(inv.id)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {openId && <InvoiceDetailModal url={`/business/invoices/${openId}`} onClose={() => setOpenId(null)} />}
    </BusinessPage>
  );
}
