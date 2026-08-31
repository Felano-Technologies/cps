import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Radio, Wallet, PackageCheck, TrendingUp, Trophy, ArrowRight } from 'lucide-react';
import CustomSelect from '../../components/Form/CustomSelect';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import api from '../../services/api';
import type { Shipment } from '../../types/models';

type TimeRange = '7days' | '30days' | 'quarter';

const RANGE_OPTIONS = [
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: 'quarter', label: 'This Quarter' },
];

const RANGE_DAYS: Record<TimeRange, number> = { '7days': 7, '30days': 30, quarter: 90 };

function isTerminal(status: Shipment['status']) {
  return status === 'delivered' || status === 'failed' || status === 'cancelled';
}

export default function OpsAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeliveriesModalOpen, setIsDeliveriesModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get<Shipment[]>('/shipments');
        setShipments(data);
      } catch {
        setError('Failed to load analytics data.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const inRange = useMemo(() => {
    const cutoff = Date.now() - RANGE_DAYS[timeRange] * 24 * 60 * 60 * 1000;
    return shipments.filter(s => new Date(s.createdAt).getTime() >= cutoff);
  }, [shipments, timeRange]);

  const delivered = useMemo(() => inRange.filter(s => s.status === 'delivered'), [inRange]);

  const totalRevenue = useMemo(() => delivered.reduce((sum, s) => sum + Number(s.deliveryFee), 0), [delivered]);
  const terminalCount = useMemo(() => inRange.filter(s => isTerminal(s.status)).length, [inRange]);
  const fulfillmentRate = terminalCount > 0 ? Math.round((delivered.length / terminalCount) * 100) : null;

  const chartData = useMemo(() => {
    const buckets = new globalThis.Map<string, number>();
    const groupBy: 'day' | 'week' | 'month' = timeRange === '7days' ? 'day' : timeRange === '30days' ? 'week' : 'month';

    for (const s of inRange) {
      const d = new Date(s.createdAt);
      let key: string;
      if (groupBy === 'day') {
        key = d.toLocaleDateString(undefined, { weekday: 'short' });
      } else if (groupBy === 'week') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = `Wk of ${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      } else {
        key = d.toLocaleDateString(undefined, { month: 'short' });
      }
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return Array.from(buckets.entries()).map(([label, count]) => ({ label, count }));
  }, [inRange, timeRange]);

  const topRiders = useMemo(() => {
    const counts = new globalThis.Map<string, { name: string; deliveries: number; revenue: number }>();
    for (const s of delivered) {
      if (!s.assignedRider) continue;
      const key = s.assignedRider.id;
      const existing = counts.get(key) ?? { name: s.assignedRider.user.name, deliveries: 0, revenue: 0 };
      existing.deliveries += 1;
      existing.revenue += Number(s.deliveryFee);
      counts.set(key, existing);
    }
    return Array.from(counts.values()).sort((a, b) => b.deliveries - a.deliveries).slice(0, 5);
  }, [delivered]);

  return (
    <div className="page-shell light-shell">
      <style>{`
        .analytics-header-bg {
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy-dark) 100%);
          border-radius: 20px;
          padding: 40px;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
          margin-bottom: 32px;
        }
        .analytics-header-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(131, 211, 20, 0.15) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .analytics-header-bg .custom-select-trigger { background: #fff; min-width: 170px; }
        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.04);
        }
        .analytics-main-grid { display: grid; grid-template-columns: 1fr 380px; gap: 24px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 32px; }
        @media (max-width: 1024px) { .analytics-main-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px) { .analytics-header-bg { padding: 24px; border-radius: 16px; } }
      `}</style>

      <main className="container" style={{ padding: '32px 24px', maxWidth: '1400px' }}>

        <div className="analytics-header-bg">
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Radio size={18} color="var(--lime)" />
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>Intelligence &amp; Reporting</h1>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 500, margin: 0, maxWidth: '500px', lineHeight: 1.5 }}>
                Track real delivery volume, revenue, and fleet performance from your live order data.
              </p>
            </div>
            <CustomSelect value={timeRange} onChange={v => setTimeRange(v as TimeRange)} options={RANGE_OPTIONS} />
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '12px', padding: '12px 16px', fontWeight: 600, marginBottom: '24px' }}>{error}</div>
        )}

        {isLoading ? (
          <p style={{ textAlign: 'center', padding: '48px', color: '#64748b', fontWeight: 600 }}>Loading analytics…</p>
        ) : (
          <>
            <div className="kpi-grid">
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</div>
                  <div style={{ width: '40px', height: '40px', background: '#f0fdf4', color: '#16a34a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={20} /></div>
                </div>
                <div style={{ fontSize: '40px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>GHS {totalRevenue.toFixed(2)}</div>
              </div>

              <button
                type="button"
                onClick={() => setIsDeliveriesModalOpen(true)}
                className="glass-panel"
                style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(255, 255, 255, 0.9)', font: 'inherit' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Successful Deliveries</div>
                  <div style={{ width: '40px', height: '40px', background: '#e2e8f0', color: 'var(--navy)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PackageCheck size={20} /></div>
                </div>
                <div style={{ fontSize: '40px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{delivered.length}</div>
                <div style={{ fontSize: '13px', color: '#078c35', fontWeight: 700, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View all <ArrowRight size={14} />
                </div>
              </button>

              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fulfillment Rate</div>
                  <div style={{ width: '40px', height: '40px', background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={20} /></div>
                </div>
                <div style={{ fontSize: '40px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{fulfillmentRate !== null ? `${fulfillmentRate}%` : '—'}</div>
              </div>
            </div>

            <div className="analytics-main-grid">
              <div className="glass-panel" style={{ height: '450px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Order Volume Trend</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" fill="#078c35" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trophy size={20} color="var(--warning)" /> Top Riders
                </h3>
                {topRiders.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: '14px' }}>No completed deliveries in this period yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {topRiders.map((rider, idx) => (
                      <div key={rider.name + idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#0f172a' }}>
                          #{idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px' }}>{rider.name}</div>
                          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>GHS {rider.revenue.toFixed(2)} earned</div>
                        </div>
                        <div style={{ fontWeight: 800, color: '#078c35', fontSize: '16px', background: '#dcfce7', padding: '6px 10px', borderRadius: '8px' }}>
                          {rider.deliveries}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {isDeliveriesModalOpen && (
          <Modal onClose={() => setIsDeliveriesModalOpen(false)} title="Successful Deliveries" maxWidth="720px">
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '-8px', marginBottom: '20px' }}>
              {delivered.length} delivered order{delivered.length === 1 ? '' : 's'} in the selected period.
            </p>
            {delivered.length === 0 ? (
              <EmptyState
                icon={<PackageCheck size={36} />}
                title="No Deliveries Yet"
                message="No orders have been delivered in this period."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                {delivered
                  .slice()
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map(shipment => (
                    <Link
                      key={shipment.id}
                      to={`/ops/tracking/${shipment.trackingCode}`}
                      onClick={() => setIsDeliveriesModalOpen(false)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
                        padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0',
                        textDecoration: 'none', color: 'inherit',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{shipment.trackingCode}</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                          Delivered to {shipment.receiverName} · {shipment.dropoffLocation}
                        </div>
                        {shipment.assignedRider && (
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                            Rider: {shipment.assignedRider.user.name}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 800, color: '#078c35', fontSize: '15px' }}>GHS {Number(shipment.deliveryFee).toFixed(2)}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                          {new Date(shipment.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </Modal>
        )}
      </main>
    </div>
  );
}
