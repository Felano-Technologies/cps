import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Phone,
  Radio,
  PackagePlus,
  ArrowRight,
  CheckCheck,
  XCircle,
  Clock,
} from 'lucide-react';
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

type AlertCategory = 'all' | 'new_orders' | 'delays_issues' | 'resolved';

export default function OpsAlertsPage() {
  const { notifications, markRead, markAllRead, stopAlertRinging } = useNotifications();
  const toast = useToast();
  const [shipments, setShipments] = useState<Record<string, Shipment>>({});
  const [categoryFilter, setCategoryFilter] = useState<AlertCategory>('all');

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

  const activeAlerts = useMemo(() => {
    return notifications.filter(n => !n.readAt);
  }, [notifications]);

  const filteredAlerts = useMemo(() => {
    return notifications.filter(n => {
      if (categoryFilter === 'resolved') return !!n.readAt;
      if (n.readAt) return false; // Active only for other tabs

      if (categoryFilter === 'new_orders') {
        return n.type === 'new_order' || n.type === 'shipment_created' || n.title.toLowerCase().includes('order');
      }
      if (categoryFilter === 'delays_issues') {
        return n.type === 'shipment_delayed' || n.type === 'shipment_failed' || n.type.includes('issue') || n.type.includes('deduction');
      }
      return true;
    });
  }, [notifications, categoryFilter]);

  const newOrderCount = useMemo(() => {
    return notifications.filter(n => !n.readAt && (n.type === 'new_order' || n.type === 'shipment_created' || n.title.toLowerCase().includes('order'))).length;
  }, [notifications]);

  const delayIssueCount = useMemo(() => {
    return notifications.filter(n => !n.readAt && (n.type === 'shipment_delayed' || n.type === 'shipment_failed' || n.type.includes('issue'))).length;
  }, [notifications]);

  const handleResolve = async (id: string) => {
    stopAlertRinging();
    await markRead(id);
    toast.success('Alert marked as resolved.');
  };

  const handleResolveAll = async () => {
    stopAlertRinging();
    await markAllRead();
    toast.success('All active alerts marked as resolved.');
  };

  return (
    <div className="page-shell light-shell">
      <style>{`
        .alerts-header-bg {
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy-dark) 100%);
          border-radius: 20px;
          padding: 36px 40px;
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
          background: rgba(255, 255, 255, 0.85);
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
          70% { box-shadow: 0 0 0 14px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(7, 140, 53, 0.4); }
          70% { box-shadow: 0 0 0 14px rgba(7, 140, 53, 0); }
          100% { box-shadow: 0 0 0 0 rgba(7, 140, 53, 0); }
        }
        .icon-new-order { background: #dcfce7; color: #078c35; border: 2px solid #86efac; animation: pulse-green 2.5s infinite; }
        .icon-delay { background: var(--warning-bg); color: var(--warning); border: 2px solid #fde68a; animation: pulse-warning 2.5s infinite; }
        .icon-failed { background: #fee2e2; color: #dc2626; border: 2px solid #fca5a5; }
        .icon-resolved { background: #f1f5f9; color: #94a3b8; border: 2px solid #e2e8f0; }
        .alert-tag {
          display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px;
          font-size: 13px; font-weight: 700; letter-spacing: 0.02em;
          background: rgba(255,255,255,0.9); border: 1px solid rgba(0,0,0,0.06);
        }
        .filter-btn-tab {
          padding: 10px 18px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        @media (max-width: 768px) {
          .alert-card { flex-direction: column; gap: 16px; }
          .alerts-header-bg { padding: 24px; border-radius: 16px; }
        }
      `}</style>

      <main className="container" style={{ padding: '32px 24px', maxWidth: '1150px' }}>

        {/* Header Banner */}
        <div className="alerts-header-bg">
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Radio size={22} color="#86efac" />
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  Operations Alerts Center
                </h1>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 500, margin: 0, maxWidth: '560px', lineHeight: 1.5 }}>
                Real-time operational alerts for new pickup orders, delay reports from riders, and delivery exceptions requiring immediate action.
              </p>
            </div>

            {activeAlerts.length > 0 && (
              <button
                onClick={handleResolveAll}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCheck size={16} /> Mark All Resolved
              </button>
            )}
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="filter-btn-tab"
            onClick={() => setCategoryFilter('all')}
            style={{
              background: categoryFilter === 'all' ? '#0f172a' : '#ffffff',
              color: categoryFilter === 'all' ? '#ffffff' : '#475569',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            All Active ({activeAlerts.length})
          </button>
          <button
            className="filter-btn-tab"
            onClick={() => setCategoryFilter('new_orders')}
            style={{
              background: categoryFilter === 'new_orders' ? '#078c35' : '#ffffff',
              color: categoryFilter === 'new_orders' ? '#ffffff' : '#475569',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <PackagePlus size={16} /> New Orders ({newOrderCount})
          </button>
          <button
            className="filter-btn-tab"
            onClick={() => setCategoryFilter('delays_issues')}
            style={{
              background: categoryFilter === 'delays_issues' ? '#d97706' : '#ffffff',
              color: categoryFilter === 'delays_issues' ? '#ffffff' : '#475569',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <AlertTriangle size={16} /> Delays & Issues ({delayIssueCount})
          </button>
          <button
            className="filter-btn-tab"
            onClick={() => setCategoryFilter('resolved')}
            style={{
              background: categoryFilter === 'resolved' ? '#64748b' : '#ffffff',
              color: categoryFilter === 'resolved' ? '#ffffff' : '#475569',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <CheckCircle2 size={16} /> Resolved History
          </button>
        </div>

        {/* Alerts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map(alert => {
              const shipment = alert.shipmentId ? shipments[alert.shipmentId] : undefined;
              const isResolved = !!alert.readAt;

              const isNewOrder = alert.type === 'new_order' || alert.type === 'shipment_created' || alert.title.toLowerCase().includes('order');
              const isFailed = alert.type === 'shipment_failed';

              let iconClass = 'icon-delay';
              let IconComponent = AlertTriangle;
              let badgeColor = '#b45309';
              let badgeBg = '#fef3c7';
              let alertTypeLabel = 'DELAY ALERT';

              if (isResolved) {
                iconClass = 'icon-resolved';
                IconComponent = CheckCircle2;
                badgeColor = '#64748b';
                badgeBg = '#f1f5f9';
                alertTypeLabel = 'RESOLVED';
              } else if (isNewOrder) {
                iconClass = 'icon-new-order';
                IconComponent = PackagePlus;
                badgeColor = '#15803d';
                badgeBg = '#dcfce7';
                alertTypeLabel = 'NEW ORDER';
              } else if (isFailed) {
                iconClass = 'icon-failed';
                IconComponent = XCircle;
                badgeColor = '#b91c1c';
                badgeBg = '#fee2e2';
                alertTypeLabel = 'DELIVERY FAILED';
              }

              const trackingTarget = shipment?.trackingCode || alert.shipmentId;

              return (
                <div key={alert.id} className="alert-card">
                  <div style={{ flexShrink: 0 }}>
                    <div className={iconClass} style={{ width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconComponent size={26} />
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: badgeColor, background: badgeBg, padding: '3px 8px', borderRadius: '8px', letterSpacing: '0.04em' }}>
                        {alertTypeLabel}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                        {alert.title}
                      </h3>
                      <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> {timeAgo(alert.createdAt)}
                      </span>
                    </div>

                    <p style={{ color: '#475569', margin: '0 0 16px 0', fontSize: '15px', lineHeight: 1.5, maxWidth: '650px' }}>
                      {alert.message}
                    </p>

                    {shipment && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                        <Link to={`/ops/tracking/${shipment.trackingCode}`} className="alert-tag" style={{ color: '#078c35', fontWeight: 700, textDecoration: 'none' }}>
                          <Package size={15} /> {shipment.trackingCode}
                        </Link>
                        <div className="alert-tag" style={{ color: '#334155' }}>
                          From: {shipment.senderName} ({shipment.pickupRegion})
                        </div>
                        <div className="alert-tag" style={{ color: '#334155' }}>
                          To: {shipment.receiverName} ({shipment.dropoffLocation})
                        </div>
                        {shipment.assignedRider && (
                          <div className="alert-tag" style={{ color: '#6b21a8', background: '#f3e8ff' }}>
                            Rider: {shipment.assignedRider.user.name}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center', minWidth: '170px' }}>
                    {trackingTarget && (
                      <Link
                        to={`/ops/tracking/${trackingTarget}`}
                        onClick={() => {
                          if (!isResolved) handleResolve(alert.id);
                        }}
                        style={{
                          padding: '12px 18px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: 800,
                          background: isNewOrder ? '#078c35' : '#0f172a',
                          color: '#fff',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: isNewOrder ? '0 4px 12px rgba(7, 140, 53, 0.25)' : '0 4px 12px rgba(15, 23, 42, 0.15)',
                        }}
                      >
                        {isNewOrder ? 'Review & Price Order' : 'Inspect Order'} <ArrowRight size={15} />
                      </Link>
                    )}

                    {!isResolved && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                        }}
                      >
                        Mark as Resolved
                      </button>
                    )}

                    {shipment?.assignedRider?.user.phone && (
                      <a
                        href={`tel:${shipment.assignedRider.user.phone}`}
                        className="neutral-btn"
                        style={{
                          padding: '10px 16px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          textAlign: 'center',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Phone size={14} /> Call Rider
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={<CheckCircle2 size={38} />}
              iconColor="#078c35"
              title="All Clear!"
              message={categoryFilter === 'resolved' ? 'No resolved alerts found in history.' : 'There are no active alerts in this category right now.'}
            />
          )}
        </div>
      </main>
    </div>
  );
}

