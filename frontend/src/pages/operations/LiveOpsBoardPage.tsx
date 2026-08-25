import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserCog } from 'lucide-react';
import api from '../../services/api';
import OrderPrintModal from '../../components/OrderPrintModal';
import CreateOrderModal from '../../components/CreateOrderModal';
import EmptyState from '../../components/EmptyState';
import CustomSelect from '../../components/Form/CustomSelect';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../contexts/ToastContext';
import type { Shipment, ShipmentStatus, RiderProfile, VehicleType, PackageType } from '../../types/models';

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delayed: 'Delayed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<ShipmentStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  picked_up: { bg: '#e0e7ff', text: '#3730a3', dot: '#6366f1' },
  in_transit: { bg: '#e0ffe0', text: '#22863a', dot: '#22863a' },
  out_for_delivery: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  delivered: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  delayed: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  failed: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  cancelled: { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' },
};

const VEHICLE_EMOJI: Record<VehicleType, string> = {
  motorbike: '🏍️',
  van: '🚐',
  truck: '🚚',
};

const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
  document: 'Document delivery',
  parcel: 'Parcel delivery',
  electronics: 'Electronics delivery',
  fragile: 'Fragile delivery',
  food: 'Food delivery',
  other: 'Package delivery',
};

const STATUS_FILTERS: Array<'All' | ShipmentStatus> = [
  'All',
  'pending',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delayed',
  'delivered',
  'failed',
  'cancelled',
];

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function LiveOpsBoardPage() {
  const toast = useToast();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'All' | ShipmentStatus>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [orders, setOrders] = useState<Shipment[]>([]);
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchOrders() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<Shipment[]>('/shipments');
        if (isMounted) {
          setOrders(response.data);
        }
      } catch {
        if (isMounted) {
          setError('Failed to load orders. Please try again later.');
          toast.error('Failed to load orders.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchRiders() {
      try {
        const response = await api.get<RiderProfile[]>('/riders');
        if (isMounted) {
          setRiders(response.data);
        }
      } catch {
        // Non-fatal: assign-rider dropdowns will just be empty.
        if (isMounted) {
          toast.error('Failed to load orders.');
        }
      }
    }

    fetchRiders();

    return () => {
      isMounted = false;
    };
  }, []);

  const riderOptions = useMemo(() => [
    { value: '', label: 'Unassigned' },
    ...riders.map(rider => ({ value: rider.id, label: rider.user.name })),
  ], [riders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return orders.filter(order => {
      const matchesFilter = activeFilter === 'All' || order.status === activeFilter;
      const matchesSearch =
        order.trackingCode.toLowerCase().includes(query) ||
        order.packageType.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [orders, activeFilter, searchQuery]);

  async function handleAssignRider(shipmentId: string, riderId: string) {
    if (!riderId) return;
    setAssigningId(shipmentId);
    setError(null);
    try {
      const response = await api.patch<Shipment>(`/shipments/${shipmentId}/assign`, { riderId });
      setOrders(prev => prev.map(order => (order.id === shipmentId ? response.data : order)));
      toast.success('Rider assigned.');
    } catch {
      setError('Failed to assign rider. Please try again.');
      toast.error('Failed to assign rider.');
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="page-shell light-shell">
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.05);
          border-radius: 16px;
        }

        .radar-map {
          background: #0f172a;
          border-radius: 16px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 0 60px rgba(0,0,0,0.5), 0 10px 30px rgba(15, 23, 42, 0.2);
        }
        .radar-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(131, 211, 20, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(131, 211, 20, 0.1) 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.5;
        }
        .radar-sweep {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 150%;
          height: 150%;
          background: conic-gradient(from 0deg, transparent 70%, rgba(131, 211, 20, 0.4) 100%);
          transform-origin: 0 0;
          animation: sweep 4s linear infinite;
          pointer-events: none;
        }
        @keyframes sweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .map-node {
          position: absolute;
          width: 12px;
          height: 12px;
          background: #83d314;
          border-radius: 50%;
          box-shadow: 0 0 10px #83d314, 0 0 20px #83d314;
          transform: translate(-50%, -50%);
        }
        .map-node.warning {
          background: #ef4444;
          box-shadow: 0 0 10px #ef4444, 0 0 20px #ef4444;
        }
        .map-node::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          border-radius: 50%;
          border: 1px solid #83d314;
          animation: ripple 2s infinite ease-out;
        }
        .map-node.warning::after {
          border-color: #ef4444;
        }
        @keyframes ripple {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .filter-pill {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #64748b;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .filter-pill:hover {
          border-color: #cbd5e1;
        }
        .filter-pill.active {
          background: #0f172a;
          color: #fff;
          border-color: #0f172a;
        }

        .dashboard-main-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          padding: 0 24px;
          align-items: start;
        }

        @media (max-width: 1024px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
          .radar-map {
            height: 400px !important;
          }
        }
        @media (max-width: 768px) {
          .kpi-row, .header-row, .dashboard-main-grid {
            padding: 0 16px !important;
          }
        }
      `}</style>

      <main className="container" style={{ padding: '32px 0', maxWidth: '1400px' }}>

        {/* Header Section */}
        <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px', padding: '0 24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.02em' }}>Operations Command Center</h1>
            <p className="muted-text" style={{ fontSize: '16px', color: '#64748b' }}>Live overview of riders, active orders, and delivery progress.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="neutral-btn"
              style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, borderRadius: '12px' }}
              onClick={() => setIsPrintModalOpen(true)}
            >
              🖨️ Print Receipt
            </button>
            <button
              className="primary-green"
              style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, borderRadius: '12px' }}
              onClick={() => setIsCreateModalOpen(true)}
            >
              ➕ New Order
            </button>
          </div>
        </div>

        {error && (
          <div style={{ margin: '0 24px 24px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '12px', padding: '12px 16px', fontWeight: 600, fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* KPI Row */}
        <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px', padding: '0 24px' }}>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Orders</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>342</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#e0ffe0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📦</div>
          </div>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Fleet</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>84</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#dbeafe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏍️</div>
          </div>
          <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', color: '#fff' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>On-Time SLA</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#fff', marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                96.8%
                <span style={{ fontSize: '16px', color: '#4ade80', fontWeight: 600 }}>↑ 1.2%</span>
              </div>
            </div>
            <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⏱️</div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="dashboard-main-grid">

          {/* Live Radar Map */}
          <div className="radar-map" style={{ height: '600px', width: '100%' }}>
            <div className="radar-grid" />
            <div className="radar-sweep" />

            {/* Map Header Overlay */}
            <div style={{ position: 'absolute', top: '24px', left: '24px', right: '24px', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '12px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ width: '8px', height: '8px', background: '#83d314', borderRadius: '50%', boxShadow: '0 0 10px #83d314' }} />
                <span style={{ fontWeight: 600, fontSize: '15px' }}>Live Fleet Tracking</span>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '12px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '14px', color: '#94a3b8', marginRight: '8px' }}>Zone:</span>
                <strong style={{ fontSize: '15px' }}>Greater Accra</strong>
              </div>
            </div>

            {/* Glowing Map Nodes */}
            <div className="map-node" style={{ top: '35%', left: '42%' }}></div>
            <div className="map-node" style={{ top: '55%', left: '60%' }}></div>
            <div className="map-node warning" style={{ top: '25%', left: '68%' }}></div>
            <div className="map-node" style={{ top: '70%', left: '30%' }}></div>
            <div className="map-node" style={{ top: '45%', left: '75%' }}></div>
            <div className="map-node warning" style={{ top: '65%', left: '50%' }}></div>

            <div style={{ position: 'absolute', bottom: '24px', left: '24px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', background: '#83d314', borderRadius: '50%' }} />
                <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>Active Rider</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
                <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>Delayed / Issue</span>
              </div>
            </div>
          </div>

          {/* Interactive Sidebar */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '600px', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Dispatch Queue</h3>

              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Search by Tracking Code or Type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                {STATUS_FILTERS.map(filter => (
                  <button
                    key={filter}
                    className={`filter-pill ${activeFilter === filter ? 'active' : ''}`}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {filter === 'All' ? 'All' : STATUS_LABELS[filter]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f8fafc' }}>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
                      <Skeleton height="1em" width="40%" />
                      <Skeleton height="1.4em" width="70px" radius="6px" />
                    </div>
                    <Skeleton height="0.85em" width="55%" style={{ marginBottom: '8px' }} />
                    <Skeleton height="0.8em" width="80%" style={{ marginBottom: '12px' }} />
                    <Skeleton height="2.2em" width="100%" radius="10px" />
                  </div>
                ))
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map(order => {
                  const colors = STATUS_COLORS[order.status];
                  const isUrgent = order.priority === 'high';
                  const currentRiderId = order.assignedRiderId ?? '';
                  return (
                    <div
                      key={order.id}
                      style={{
                        background: isUrgent ? '#fffbeb' : '#ffffff',
                        border: isUrgent ? '1px solid #fde68a' : '1px solid #e2e8f0',
                        borderLeft: isUrgent ? '4px solid #eab308' : '1px solid #e2e8f0',
                        borderRadius: '12px', padding: '16px', marginBottom: '12px', transition: 'box-shadow 0.2s'
                      }}
                      className="hover-shadow"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '18px' }}>{VEHICLE_EMOJI[order.vehicleType]}</span>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{order.trackingCode}</span>
                          {isUrgent && (
                            <span style={{ background: '#fef9c3', color: '#854d0e', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.03em' }}>
                              ⚡ URGENT
                            </span>
                          )}
                        </div>
                        <span style={{
                          background: colors.bg, color: colors.text,
                          padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.dot }}></span>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#475569', fontWeight: 500, marginBottom: '4px' }}>
                        {PACKAGE_TYPE_LABELS[order.packageType]}
                      </div>
                      <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span>Created: {formatCreatedAt(order.createdAt)}</span>
                        <Link to={`/ops/tracking/${order.trackingCode}`} style={{ color: '#078c35', fontWeight: 600, textDecoration: 'none' }}>
                          Track →
                        </Link>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>Rider:</label>
                        <div style={{ flex: 1 }}>
                          {assigningId === order.id ? (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '8px', width: '100%', minHeight: '44px',
                              border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f1f5f9',
                              padding: '0.65rem 0.9rem', color: '#94a3b8', fontSize: '0.95rem', cursor: 'not-allowed'
                            }}>
                              <UserCog size={16} />
                              Assigning…
                            </div>
                          ) : (
                            <CustomSelect
                              value={currentRiderId}
                              onChange={(v) => handleAssignRider(order.id, v)}
                              options={riderOptions}
                              icon={<UserCog size={16} />}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon="📋"
                  title="No Orders Found"
                  message="There are no orders matching your current dispatch filter. Try clearing your search or switching tabs."
                  actionLabel="Clear Filters"
                  onAction={() => { setSearchQuery(''); setActiveFilter('All'); }}
                  style={{ margin: '16px' }}
                />
              )}
            </div>
            <style>{`
              .hover-shadow:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            `}</style>
          </div>

        </div>

        {isPrintModalOpen && <OrderPrintModal onClose={() => setIsPrintModalOpen(false)} />}
        {isCreateModalOpen && (
          <CreateOrderModal
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={(shipment) => {
              setOrders(prev => [shipment, ...prev]);
              setIsCreateModalOpen(false);
              toast.success('Order created.');
            }}
          />
        )}
      </main>
    </div>
  );
}
