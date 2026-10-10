import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import type { BusinessStatement } from '../../types/models';
import { BusinessPage, Panel } from './ui';
import { formatDateTime, ghs, inputStyle, primaryButton, tableStyle, tdStyle, thStyle } from './businessShared';

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

export default function BusinessStatementPage() {
  const today = new Date();
  const [from, setFrom] = useState(isoDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))));
  const [to, setTo] = useState(isoDate(today));
  const [statement, setStatement] = useState<BusinessStatement | null>(null);

  useEffect(() => {
    if (!from || !to) return;
    // `to` is inclusive in the UI; the API takes an exclusive end.
    api.get<BusinessStatement>('/business/statement', { params: { from, to: addDays(to, 1) } }).then(r => setStatement(r.data));
  }, [from, to]);

  const exportExcel = () => {
    if (!statement) return;
    const sheet = XLSX.utils.json_to_sheet(statement.rows.map(r => ({
      'Tracking code': r.trackingCode,
      'Your reference': r.externalReference ?? '',
      Receiver: r.receiverName,
      Region: r.dropoffRegion,
      'Delivered at': new Date(r.deliveredAt).toLocaleString(),
      'Fee (GHS)': r.fee,
      [`Due to CPS (${statement.cpsSharePercent}%)`]: r.cpsShare,
      Invoiced: r.invoiced ? 'Yes' : 'No',
    })));
    XLSX.utils.sheet_add_aoa(sheet, [[], ['Total', '', '', '', '', statement.totalFees, statement.cpsShare]], { origin: -1 });
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Statement');
    XLSX.writeFile(book, `cps-statement-${from}-to-${to}.xlsx`);
  };

  return (
    <BusinessPage title="Statement" subtitle="Deliveries CPS completed for you in a period, with the fee for each and CPS's share. Use it to reconcile what you owe CPS.">
      <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap', marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: '#64748b' }}>From<input type="date" style={{ ...inputStyle, display: 'block', marginTop: 4 }} value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label style={{ fontSize: 13, color: '#64748b' }}>To<input type="date" style={{ ...inputStyle, display: 'block', marginTop: 4 }} value={to} onChange={e => setTo(e.target.value)} /></label>
        <button style={{ ...primaryButton, opacity: statement?.count ? 1 : 0.5 }} disabled={!statement?.count} onClick={exportExcel}>Export Excel</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
          <div style={{ color: '#64748b', fontSize: 13 }}>Deliveries</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{statement?.count ?? '…'}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
          <div style={{ color: '#64748b', fontSize: 13 }}>Total delivery fees</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{statement ? ghs(statement.totalFees) : '…'}</div>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 18 }}>
          <div style={{ color: '#166534', fontSize: 13 }}>Due to CPS{statement ? ` (${statement.cpsSharePercent}%)` : ''}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#166534' }}>{statement ? ghs(statement.cpsShare) : '…'}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
          <div style={{ color: '#64748b', fontSize: 13 }}>You keep</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{statement ? ghs(statement.businessShare) : '…'}</div>
        </div>
      </div>

      <Panel>
        {!statement || statement.rows.length === 0 ? (
          <p style={{ color: '#64748b', margin: 0 }}>No deliveries completed in this period.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...tableStyle, minWidth: 780 }}>
              <thead><tr>{['Tracking', 'Your reference', 'Receiver', 'Region', 'Delivered', 'Fee', 'Due to CPS'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {statement.rows.map(r => (
                  <tr key={r.trackingCode}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{r.trackingCode}</td>
                    <td style={tdStyle}>{r.externalReference ?? '—'}</td>
                    <td style={tdStyle}>{r.receiverName}</td>
                    <td style={tdStyle}>{r.dropoffRegion}</td>
                    <td style={tdStyle}>{formatDateTime(r.deliveredAt)}</td>
                    <td style={tdStyle}>{ghs(r.fee)}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{ghs(r.cpsShare)}{r.invoiced && <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Invoiced</div>}</td>
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
