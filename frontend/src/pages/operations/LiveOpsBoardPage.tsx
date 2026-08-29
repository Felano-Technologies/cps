import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserCog, Printer, Plus, Package, Bike, Truck, Car, AlertTriangle, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../services/api';
import OrderPrintModal from '../../components/OrderPrintModal';
import CreateOrderModal from '../../components/CreateOrderModal';
import EmptyState from '../../components/EmptyState';
import CustomSelect from '../../components/Form/CustomSelect';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../contexts/ToastContext';
import type { Shipment, ShipmentStatus, RiderProfile, VehicleType, PackageType } from '../../types/models';

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  awaiting_price: 'Awaiting Price',
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
  awaiting_price: { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
  pending: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  picked_up: { bg: '#ecfccb', text: '#3f6212', dot: '#84cc16' },
  in_transit: { bg: '#e0ffe0', text: '#22863a', dot: '#22863a' },
  out_for_delivery: { bg: '#e2e8f0', text: '#0f172a', dot: '#334155' },
  delivered: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  delayed: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  failed: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  cancelled: { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8' },
};

const VEHICLE_ICONS: Record<VehicleType, LucideIcon> = {
  motorbike: Bike,
  van: Car,
  truck: Truck,
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
  'awaiting_price',
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

  const newOrderCount = useMemo(
    () => orders.filter(o => o.status === 'awaiting_price').length,
    [orders]
  );
  const activeOrderCount = useMemo(
    () => orders.filter(o => ['pending', 'picked_up', 'in_transit', 'out_for_delivery'].includes(o.status)).length,
    [orders]
  );
  const availableRiderCount = useMemo(
    () => riders.filter(r => r.currentStatus === 'available').length,
    [riders]
  );
  const delayedOrderCount = useMemo(
    () => orders.filter(o => o.status === 'delayed').length,
    [orders]
  );

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
          background: #078c35;
          color: #fff;
          border-color: #078c35;
        }

        .dashboard-main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          padding: 0 24px;
          align-items: start;
        }
        
        .kpi-link-card {
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s, box-shadow 0.2s;
          display: block;
        }
        .kpi-link-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(15, 23, 42, 0.1);
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
              <Printer size={18} /> Print Receipt
            </button>
            <button
              className="primary-green"
              style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, borderRadius: '12px' }}
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={18} /> New Order
            </button>
          </div>
        </div>

        {error && (
          <div style={{ margin: '0 24px 24px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '12px', padding: '12px 16px', fontWeight: 600, fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* KPI Row */}
        <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px', padding: '0 24px' }}>
          
          <Link to="/ops/new-orders" className="glass-card kpi-link-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Orders</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: newOrderCount > 0 ? '#ea580c' : '#0f172a', marginTop: '8px' }}>{newOrderCount}</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#fff7ed', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c2410c' }}>
              <Package size={22} />
            </div>
          </Link>

          <Link to="/ops/active-orders" className="glass-card kpi-link-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Orders</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{activeOrderCount}</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#e0ffe0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#078c35' }}>
              <Truck size={22} />
            </div>
          </Link>

          <Link to="/fleet" className="glass-card kpi-link-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Fleet</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{availableRiderCount}</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: '#e0ffe0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#078c35' }}>
              <Bike size={22} />
            </div>
          </Link>

          <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delayed Orders</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: delayedOrderCount > 0 ? 'var(--warning)' : '#0f172a', marginTop: '8px' }}>{delayedOrderCount}</div>
            </div>
            <div style={{ width: '48px', height: '48px', background: 'var(--warning-bg)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
              <AlertTriangle size={22} />
            </div>
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
