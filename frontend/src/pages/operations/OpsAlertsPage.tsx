import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Package, Phone, Radio } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import api from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { useToast } from '../../contexts/ToastContext';
import type { Shipment } from '../../types/models';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function OpsAlertsPage() {
  const { notifications, markRead } = useNotifications();
  const toast = useToast();
  const [shipments, setShipments] = useState<Record<string, Shipment>>({});
  const [filter, setFilter] = useState<'active' | 'resolved'>('active');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get<Shipment[]>('/shipments');
        setShipments(Object.fromEntries(data.map(s => [s.id, s])));
      } catch {
        // Non-fatal: alerts still show without order/rider enrichment.
      }
    };
    load();
  }, []);

  const alerts = useMemo(
    () => notifications.filter(n => n.type === 'shipment_delayed'),
    [notifications]
  );
  const filteredAlerts = alerts.filter(a => filter === 'active' ? !a.readAt : !!a.readAt);
  const activeCount = alerts.filter(a => !a.readAt).length;

  const handleResolve = async (id: string) => {
    await markRead(id);
    toast.success('Alert marked as resolved.');
  };

  return (
    <div className="page-shell light-shell">
      <style>{`
        .alerts-header-bg {
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy-dark) 100%);
          border-radius: 20px;
          padding: 40px;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
          margin-bottom: 32px;
        }
        .alerts-header-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 24px 24px;
          opacity: 0.5;
        }
        .alert-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          gap: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.04);
        }
        .alert-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 48px rgba(15, 23, 42, 0.08);
        }
        @keyframes pulse-warning {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          70% { box-shadow: 0 0 0 16px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        .icon-active { background: var(--warning-bg); color: var(--warning); border: 2px solid #fde68a; animation: pulse-warning 2.5s infinite; }
        .icon-resolved { background: #f1f5f9; color: #94a3b8; border: 2px solid #e2e8f0; }
        .alert-tag {
          display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px;
          font-size: 13px; font-weight: 700; letter-spacing: 0.02em;
          background: rgba(255,255,255,0.8); border: 1px solid rgba(0,0,0,0.05);
        }
        @media (max-width: 768px) {
          .alert-card { flex-direction: column; gap: 16px; }
          .alerts-header-bg { padding: 24px; border-radius: 16px; }
        }
      `}</style>

      <main className="container" style={{ padding: '32px 24px', maxWidth: '1100px' }}>

        <div className="alerts-header-bg">
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Radio size={20} color="var(--warning)" />
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>Live Alerts Center</h1>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 500, margin: 0, maxWidth: '500px', lineHeight: 1.5 }}>
                Real-time delay reports from riders in the field, requiring dispatcher follow-up.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '16px' }}>
              <button
                onClick={() => setFilter('active')}
                style={{
                  padding: '10px 20px', borderRadius: '12px', fontWeight: 700, border: 'none',
                  background: filter === 'active' ? '#fff' : 'transparent',
                  color: filter === 'active' ? '#0f172a' : '#cbd5e1',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setFilter('resolved')}
                style={{
                  padding: '10px 20px', borderRadius: '12px', fontWeight: 700, border: 'none',
                  background: filter === 'resolved' ? '#fff' : 'transparent',
                  color: filter === 'resolved' ? '#0f172a' : '#cbd5e1',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                Resolved
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map(alert => {
              const shipment = alert.shipmentId ? shipments[alert.shipmentId] : undefined;
              const isResolved = !!alert.readAt;
              return (
                <div key={alert.id} className="alert-card">
                  <div style={{ flexShrink: 0 }}>
                    <div className={isResolved ? 'icon-resolved' : 'icon-active'} style={{ width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isResolved ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>{alert.title}</h3>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{timeAgo(alert.createdAt)}</span>
                    </div>
                    <p style={{ color: '#475569', margin: '0 0 20px 0', fontSize: '16px', lineHeight: 1.5, maxWidth: '600px' }}>
                      {alert.message}
                    </p>

                    {shipment && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        <Link to={`/ops/tracking/${shipment.trackingCode}`} className="alert-tag" style={{ color: '#334155', textDecoration: 'none' }}>
                          <Package size={15} /> {shipment.trackingCode}
                        </Link>
                        {shipment.assignedRider && (
                          <div className="alert-tag" style={{ color: '#475569' }}>
                            {shipment.assignedRider.user.name}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {!isResolved && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', minWidth: '160px' }}>
                      <button
                        onClick={() => handleResolve(alert.id)}
                        style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, background: '#078c35', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(7, 140, 53, 0.2)' }}
                      >
                        Resolve Issue
                      </button>
                      {shipment?.assignedRider?.user.phone && (
                        <a href={`tel:${shipment.assignedRider.user.phone}`} className="neutral-btn" style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <Phone size={14} /> Contact Rider
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={<CheckCircle2 size={36} />}
              iconColor="#078c35"
              title="All Clear!"
              message={filter === 'active' ? 'There are no active alerts right now. Your fleet is operating smoothly.' : 'No resolved issues found in recent history.'}
            />
          )}
        </div>
      </main>
    </div>
  );
}
